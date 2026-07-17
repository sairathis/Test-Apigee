import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { environmentId } = req.query;
    const targetServers = await prisma.targetServer.findMany({
      where: environmentId ? { environmentId: String(environmentId) } : undefined,
      include: { environment: true },
      orderBy: { name: "asc" },
    });
    res.json(targetServers);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, host, port, useSSL, enabled, environmentId, isFallback, loadBalancing } = req.body;
    const ts = await prisma.targetServer.create({
      data: {
        name,
        host,
        port: Number(port) || 443,
        useSSL: Boolean(useSSL),
        enabled: enabled !== false,
        environmentId: environmentId || null,
        isFallback: Boolean(isFallback),
        loadBalancing: loadBalancing ? JSON.stringify(loadBalancing) : null,
      },
    });
    res.status(201).json(ts);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, host, port, useSSL, enabled, isFallback, loadBalancing } = req.body;
    const ts = await prisma.targetServer.update({
      where: { id: req.params.id },
      data: { name, host, port: Number(port) || 443, useSSL: Boolean(useSSL), enabled, isFallback: Boolean(isFallback), loadBalancing: loadBalancing ? JSON.stringify(loadBalancing) : null },
    });
    res.json(ts);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.targetServer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
