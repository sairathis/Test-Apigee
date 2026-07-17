import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const envs = await prisma.environment.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { deployments: true, targetServers: true, kvms: true } } } });
    res.json(envs);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, displayName, type } = req.body;
    const env = await prisma.environment.create({ data: { name, displayName: displayName || name, type: type || "BASE" } });
    res.status(201).json(env);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const env = await prisma.environment.findUnique({ where: { id: req.params.id }, include: { virtualHosts: true, kvms: true, targetServers: true, flowHooks: { include: { sharedFlow: true, proxy: true } } } });
    if (!env) return res.status(404).json({ error: "Environment not found" });
    res.json(env);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { displayName, type } = req.body;
    const env = await prisma.environment.update({ where: { id: req.params.id }, data: { displayName, type } });
    res.json(env);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.environment.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// --- Virtual Hosts (bonus feature) ---
router.post(
  "/:id/virtual-hosts",
  asyncHandler(async (req, res) => {
    const { name, port, hostAliases, sslEnabled } = req.body;
    const vhost = await prisma.virtualHost.create({ data: { name, port: Number(port) || 443, hostAliases, sslEnabled: Boolean(sslEnabled), environmentId: req.params.id } });
    res.status(201).json(vhost);
  })
);

router.delete(
  "/virtual-hosts/:vhostId",
  asyncHandler(async (req, res) => {
    await prisma.virtualHost.delete({ where: { id: req.params.vhostId } });
    res.status(204).end();
  })
);

export default router;
