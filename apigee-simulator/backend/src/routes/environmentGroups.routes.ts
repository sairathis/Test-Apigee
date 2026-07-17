import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

// Bonus feature: Environment Groups (host-based routing across environments)
const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await prisma.environmentGroup.findMany({ orderBy: { name: "asc" } }));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, hostnames, envNames } = req.body;
    const group = await prisma.environmentGroup.create({ data: { name, hostnames, envNames } });
    res.status(201).json(group);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { hostnames, envNames } = req.body;
    res.json(await prisma.environmentGroup.update({ where: { id: req.params.id }, data: { hostnames, envNames } }));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.environmentGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
