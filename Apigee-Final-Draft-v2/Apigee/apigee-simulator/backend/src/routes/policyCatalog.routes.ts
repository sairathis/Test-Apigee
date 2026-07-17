import { Router } from "express";
import { POLICY_CATALOG } from "../utils/policyCatalog";

const router = Router();

router.get("/", (req, res) => {
  res.json(POLICY_CATALOG.map((p) => ({ type: p.type, category: p.category, description: p.description, fields: p.fields, defaultConfig: p.defaultConfig })));
});

export default router;
