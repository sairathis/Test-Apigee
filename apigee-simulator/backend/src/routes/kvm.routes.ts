import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const kvms = await prisma.kvm.findMany({ include: { environment: true, entries: true }, orderBy: { name: "asc" } });
    res.json(kvms);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, scope, environmentId, encrypted } = req.body;
    const kvm = await prisma.kvm.create({ data: { name, scope, environmentId: scope === "environment" ? environmentId : null, encrypted: Boolean(encrypted) } });
    res.status(201).json(kvm);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.kvm.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

router.post(
  "/:id/entries",
  asyncHandler(async (req, res) => {
    const { key, value } = req.body;
    const entry = await prisma.kvmEntry.upsert({
      where: { kvmId_key: { kvmId: req.params.id, key } },
      update: { value },
      create: { kvmId: req.params.id, key, value },
    });
    res.status(201).json(entry);
  })
);

router.put(
  "/entries/:entryId",
  asyncHandler(async (req, res) => {
    const { value } = req.body;
    const entry = await prisma.kvmEntry.update({ where: { id: req.params.entryId }, data: { value } });
    res.json(entry);
  })
);

router.delete(
  "/entries/:entryId",
  asyncHandler(async (req, res) => {
    await prisma.kvmEntry.delete({ where: { id: req.params.entryId } });
    res.status(204).end();
  })
);

export default router;
