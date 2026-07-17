import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const hooks = await prisma.flowHook.findMany({ include: { environment: true, sharedFlow: true, proxy: true }, orderBy: { hookPoint: "asc" } });
    res.json(hooks);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { hookPoint, environmentId, sharedFlowId, proxyId, continueOnError } = req.body;
    const hook = await prisma.flowHook.upsert({
      where: { hookPoint_environmentId_proxyId: { hookPoint, environmentId, proxyId: proxyId || null } },
      update: { sharedFlowId, continueOnError: continueOnError !== false },
      create: { hookPoint, environmentId, sharedFlowId, proxyId: proxyId || null, continueOnError: continueOnError !== false },
      include: { environment: true, sharedFlow: true, proxy: true },
    });
    res.status(201).json(hook);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.flowHook.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
