import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await prisma.reference.findMany({ orderBy: { name: "asc" } }));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, refers, resourceType, jwksJson } = req.body;
    const ref = await prisma.reference.create({ data: { name, refers, resourceType: resourceType || "KeyStore", jwksJson: jwksJson ? JSON.stringify(jwksJson) : null } });
    res.status(201).json(ref);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { refers, resourceType, jwksJson } = req.body;
    const ref = await prisma.reference.update({ where: { id: req.params.id }, data: { refers, resourceType, jwksJson: jwksJson ? JSON.stringify(jwksJson) : undefined } });
    res.json(ref);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.reference.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
