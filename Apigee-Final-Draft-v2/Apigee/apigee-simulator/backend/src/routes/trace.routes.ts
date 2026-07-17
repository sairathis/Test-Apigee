import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { runTrace } from "../utils/traceEngine";

const router = Router();

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const { proxyName, environmentName, method, path, headers, query, body, clientIp, simulateFault } = req.body;
    if (!proxyName || !environmentName) return res.status(400).json({ error: "proxyName and environmentName are required" });
    try {
      const result = await runTrace({
        proxyName,
        environmentName,
        method: method || "GET",
        path: path || "/",
        headers: headers || {},
        query: query || {},
        body: body ?? null,
        clientIp,
        simulateFault,
      });

      // Record a matching analytics event so the Analytics/Monitoring modules
      // reflect live trace activity, not just the seeded historical data.
      const environment = await prisma.environment.findUnique({ where: { name: environmentName } });
      if (environment) {
        await prisma.analyticsEvent.create({
          data: {
            proxyName,
            environmentId: environment.id,
            timestamp: new Date(),
            statusCode: result.response.status || 200,
            latencyMs: result.durationMs,
            verb: method || "GET",
            clientIp: clientIp || "203.0.113.1",
            errorFlag: !result.success,
          },
        });
      }

      res.json(result);
    } catch (err: any) {
      res.status(err.status || 500).json({ error: err.message });
    }
  })
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const { proxyName, limit } = req.query;
    const sessions = await prisma.traceSession.findMany({
      where: proxyName ? { proxyName: String(proxyName) } : undefined,
      orderBy: { createdAt: "desc" },
      take: Number(limit) || 25,
    });
    res.json(
      sessions.map((s) => ({
        ...s,
        request: JSON.parse(s.request),
        response: JSON.parse(s.response),
        timeline: JSON.parse(s.timeline),
        variables: JSON.parse(s.variables),
      }))
    );
  })
);

router.get(
  "/history/:id",
  asyncHandler(async (req, res) => {
    const s = await prisma.traceSession.findUnique({ where: { id: req.params.id } });
    if (!s) return res.status(404).json({ error: "Trace session not found" });
    res.json({ ...s, request: JSON.parse(s.request), response: JSON.parse(s.response), timeline: JSON.parse(s.timeline), variables: JSON.parse(s.variables) });
  })
);

export default router;
