import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

function parseRange(rangeParam?: string): Date {
  const now = Date.now();
  const map: Record<string, number> = { "1h": 3600000, "24h": 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000 };
  return new Date(now - (map[rangeParam || "24h"] || map["24h"]));
}

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { range, environmentName, proxyName } = req.query;
    const since = parseRange(range as string);
    const environment = environmentName ? await prisma.environment.findUnique({ where: { name: String(environmentName) } }) : null;
    const where: any = { timestamp: { gte: since } };
    if (environment) where.environmentId = environment.id;
    if (proxyName) where.proxyName = String(proxyName);

    const events = await prisma.analyticsEvent.findMany({ where });
    const total = events.length;
    const errors = events.filter((e) => e.errorFlag || e.statusCode >= 400).length;
    const avgLatency = total ? Math.round(events.reduce((sum, e) => sum + e.latencyMs, 0) / total) : 0;

    const byCode: Record<string, number> = {};
    for (const e of events) {
      const bucket = `${Math.floor(e.statusCode / 100)}xx`;
      byCode[bucket] = (byCode[bucket] || 0) + 1;
    }

    const byProxy: Record<string, number> = {};
    for (const e of events) byProxy[e.proxyName] = (byProxy[e.proxyName] || 0) + 1;
    const topApis = Object.entries(byProxy)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Bucket traffic trend into hourly buckets across the selected range
    const bucketMs = 3600000;
    const trend: Record<string, { count: number; errors: number; latencySum: number }> = {};
    for (const e of events) {
      const bucketStart = Math.floor(e.timestamp.getTime() / bucketMs) * bucketMs;
      const key = new Date(bucketStart).toISOString();
      if (!trend[key]) trend[key] = { count: 0, errors: 0, latencySum: 0 };
      trend[key].count += 1;
      trend[key].latencySum += e.latencyMs;
      if (e.errorFlag || e.statusCode >= 400) trend[key].errors += 1;
    }
    const trafficTrend = Object.entries(trend)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([time, v]) => ({ time, requests: v.count, errors: v.errors, avgLatency: v.count ? Math.round(v.latencySum / v.count) : 0 }));

    res.json({
      totalRequests: total,
      errorCount: errors,
      successRate: total ? Math.round(((total - errors) / total) * 10000) / 100 : 100,
      errorRate: total ? Math.round((errors / total) * 10000) / 100 : 0,
      avgLatencyMs: avgLatency,
      responseCodeBreakdown: byCode,
      topApis,
      trafficTrend,
    });
  })
);

export default router;
