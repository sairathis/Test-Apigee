import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [totalProxies, totalProducts, totalDevelopers, totalApps, since24h] = await Promise.all([
      prisma.proxy.count(),
      prisma.apiProduct.count(),
      prisma.developer.count(),
      prisma.developerApp.count(),
      prisma.analyticsEvent.findMany({ where: { timestamp: { gte: new Date(Date.now() - 86400000) } } }),
    ]);
    const total = since24h.length;
    const errors = since24h.filter((e) => e.errorFlag || e.statusCode >= 400).length;
    const avgLatency = total ? Math.round(since24h.reduce((s, e) => s + e.latencyMs, 0) / total) : 0;

    res.json({
      totalProxies,
      totalProducts,
      totalDevelopers,
      totalApps,
      totalRequests24h: total,
      successRate: total ? Math.round(((total - errors) / total) * 10000) / 100 : 100,
      errorRate: total ? Math.round((errors / total) * 10000) / 100 : 0,
      avgResponseTimeMs: avgLatency,
    });
  })
);

export default router;
