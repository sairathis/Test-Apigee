import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { generateConsumerKey, generateConsumerSecret } from "../utils/apiKey";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const apps = await prisma.developerApp.findMany({ orderBy: { name: "asc" }, include: { developer: true, products: { include: { product: true } } } });
    res.json(apps);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, developerId, callbackUrl, productIds } = req.body;
    if (!name || !developerId) return res.status(400).json({ error: "name and developerId are required" });
    const app = await prisma.developerApp.create({
      data: {
        name,
        developerId,
        callbackUrl: callbackUrl || "",
        consumerKey: generateConsumerKey(),
        consumerSecret: generateConsumerSecret(),
        products: { create: (productIds || []).map((productId: string) => ({ productId })) },
      },
      include: { developer: true, products: { include: { product: true } } },
    });
    res.status(201).json(app);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const app = await prisma.developerApp.findUnique({ where: { id: req.params.id }, include: { developer: true, products: { include: { product: true } } } });
    if (!app) return res.status(404).json({ error: "App not found" });
    res.json(app);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, callbackUrl, status, productIds } = req.body;
    if (productIds) {
      await prisma.appProduct.deleteMany({ where: { appId: req.params.id } });
      await prisma.appProduct.createMany({ data: productIds.map((productId: string) => ({ appId: req.params.id, productId })) });
    }
    const app = await prisma.developerApp.update({
      where: { id: req.params.id },
      data: { name, callbackUrl, status },
      include: { developer: true, products: { include: { product: true } } },
    });
    res.json(app);
  })
);

router.post(
  "/:id/regenerate-keys",
  asyncHandler(async (req, res) => {
    const app = await prisma.developerApp.update({
      where: { id: req.params.id },
      data: { consumerKey: generateConsumerKey(), consumerSecret: generateConsumerSecret() },
      include: { developer: true, products: { include: { product: true } } },
    });
    res.json(app);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.developerApp.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
