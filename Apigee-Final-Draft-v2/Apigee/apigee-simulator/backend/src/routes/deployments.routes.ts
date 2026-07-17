import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const deployments = await prisma.deployment.findMany({
      orderBy: { deployedAt: "desc" },
      include: { proxy: true, environment: true, revision: true },
    });
    res.json(deployments);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { proxyId, revision, environmentId } = req.body;
    const rev = await prisma.proxyRevision.findFirst({ where: { proxyId, revision: Number(revision) } });
    if (!rev) return res.status(404).json({ error: "Revision not found" });

    // Undeploy any existing deployment of this proxy in this environment first (single active revision per env)
    await prisma.deployment.updateMany({
      where: { proxyId, environmentId, status: "deployed" },
      data: { status: "undeployed", undeployedAt: new Date() },
    });

    const deployment = await prisma.deployment.create({
      data: { proxyId, revisionId: rev.id, environmentId, status: "deployed" },
      include: { proxy: true, environment: true, revision: true },
    });
    res.status(201).json(deployment);
  })
);

router.post(
  "/:id/undeploy",
  asyncHandler(async (req, res) => {
    const deployment = await prisma.deployment.update({
      where: { id: req.params.id },
      data: { status: "undeployed", undeployedAt: new Date() },
      include: { proxy: true, environment: true, revision: true },
    });
    res.json(deployment);
  })
);

export default router;
