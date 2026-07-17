import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const developers = await prisma.developer.findMany({ orderBy: { email: "asc" }, include: { _count: { select: { apps: true } } } });
    res.json(developers);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { email, firstName, lastName, userName, company, status } = req.body;
    const dev = await prisma.developer.create({ data: { email, firstName, lastName, userName: userName || email.split("@")[0], company: company || "", status: status || "active" } });
    res.status(201).json(dev);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const dev = await prisma.developer.findUnique({ where: { id: req.params.id }, include: { apps: { include: { products: { include: { product: true } } } } } });
    if (!dev) return res.status(404).json({ error: "Developer not found" });
    res.json(dev);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { firstName, lastName, company, status } = req.body;
    const dev = await prisma.developer.update({ where: { id: req.params.id }, data: { firstName, lastName, company, status } });
    res.json(dev);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.developer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
