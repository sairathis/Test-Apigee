import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

function serialize(p: any) {
  return {
    ...p,
    scopes: JSON.parse(p.scopes || "[]"),
    environments: JSON.parse(p.environments || "[]"),
    proxies: JSON.parse(p.proxies || "[]"),
    operations: JSON.parse(p.operations || "[]"),
    ratePlan: p.ratePlan ? JSON.parse(p.ratePlan) : null,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await prisma.apiProduct.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { apps: true } } } });
    res.json(products.map(serialize));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const product = await prisma.apiProduct.create({
      data: {
        name: b.name,
        displayName: b.displayName || b.name,
        description: b.description || "",
        approvalType: b.approvalType || "auto",
        quotaLimit: Number(b.quotaLimit) || 1000,
        quotaInterval: Number(b.quotaInterval) || 1,
        quotaTimeUnit: b.quotaTimeUnit || "hour",
        scopes: JSON.stringify(b.scopes || []),
        environments: JSON.stringify(b.environments || []),
        proxies: JSON.stringify(b.proxies || []),
        operations: JSON.stringify(b.operations || []),
        monetizationEnabled: Boolean(b.monetizationEnabled),
        ratePlan: b.ratePlan ? JSON.stringify(b.ratePlan) : null,
      },
    });
    res.status(201).json(serialize(product));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.apiProduct.findUnique({ where: { id: req.params.id }, include: { apps: { include: { app: { include: { developer: true } } } } } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(serialize(product));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const product = await prisma.apiProduct.update({
      where: { id: req.params.id },
      data: {
        displayName: b.displayName,
        description: b.description,
        approvalType: b.approvalType,
        quotaLimit: b.quotaLimit !== undefined ? Number(b.quotaLimit) : undefined,
        quotaInterval: b.quotaInterval !== undefined ? Number(b.quotaInterval) : undefined,
        quotaTimeUnit: b.quotaTimeUnit,
        scopes: b.scopes ? JSON.stringify(b.scopes) : undefined,
        environments: b.environments ? JSON.stringify(b.environments) : undefined,
        proxies: b.proxies ? JSON.stringify(b.proxies) : undefined,
        operations: b.operations ? JSON.stringify(b.operations) : undefined,
        monetizationEnabled: b.monetizationEnabled,
        ratePlan: b.ratePlan !== undefined ? JSON.stringify(b.ratePlan) : undefined,
      },
    });
    res.json(serialize(product));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.apiProduct.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
