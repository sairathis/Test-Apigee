import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - 3600000);
    const events = await prisma.analyticsEvent.findMany({ where: { timestamp: { gte: since } } });
    const total = events.length;
    const errors = events.filter((e) => e.errorFlag || e.statusCode >= 400).length;
    const avgLatency = total ? Math.round(events.reduce((s, e) => s + e.latencyMs, 0) / total) : 0;
    const availability = total ? Math.round(((total - errors) / total) * 10000) / 100 : 100;

    const byProxy: Record<string, { count: number; errors: number; latencySum: number }> = {};
    for (const e of events) {
      if (!byProxy[e.proxyName]) byProxy[e.proxyName] = { count: 0, errors: 0, latencySum: 0 };
      byProxy[e.proxyName].count += 1;
      byProxy[e.proxyName].latencySum += e.latencyMs;
      if (e.errorFlag || e.statusCode >= 400) byProxy[e.proxyName].errors += 1;
    }
    const perProxy = Object.entries(byProxy).map(([name, v]) => ({
      proxyName: name,
      traffic: v.count,
      errorRate: v.count ? Math.round((v.errors / v.count) * 10000) / 100 : 0,
      avgLatencyMs: v.count ? Math.round(v.latencySum / v.count) : 0,
      availability: v.count ? Math.round(((v.count - v.errors) / v.count) * 10000) / 100 : 100,
    }));

    const alerts = await prisma.monitoringAlert.findMany({ orderBy: { createdAt: "desc" }, take: 25 });

    res.json({
      availability,
      avgLatencyMs: avgLatency,
      errorRate: total ? Math.round((errors / total) * 10000) / 100 : 0,
      trafficVolume: total,
      perProxy,
      alerts,
    });
  })
);

// Alert simulation: user-triggered "what-if" to practice reacting to incidents
router.post(
  "/alerts/simulate",
  asyncHandler(async (req, res) => {
    const { proxyName, metric, value, threshold, severity } = req.body;
    const alert = await prisma.monitoringAlert.create({
      data: {
        proxyName: proxyName || "OrderService-v1",
        severity: severity || "critical",
        metric: metric || "error_rate",
        value: Number(value) || 25,
        threshold: Number(threshold) || 5,
        message: `${metric || "error_rate"} for ${proxyName || "OrderService-v1"} is ${value || 25} which exceeds threshold ${threshold || 5}`,
      },
    });
    res.status(201).json(alert);
  })
);

router.post(
  "/alerts/:id/resolve",
  asyncHandler(async (req, res) => {
    const alert = await prisma.monitoringAlert.update({ where: { id: req.params.id }, data: { resolved: true } });
    res.json(alert);
  })
);

export default router;
