import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { getPolicyDef } from "../utils/policyCatalog";

const router = Router();

function serializeRevision(rev: any) {
  return { ...rev, steps: JSON.parse(rev.steps || "[]"), policies: (rev.policies || []).map((p: any) => ({ ...p, config: JSON.parse(p.config) })) };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const flows = await prisma.sharedFlow.findMany({ orderBy: { name: "asc" }, include: { revisions: { orderBy: { revision: "desc" }, take: 1 } } });
    res.json(flows.map((f) => ({ ...f, latestRevision: f.revisions[0]?.revision || 1 })));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const flow = await prisma.sharedFlow.create({ data: { name, description: description || "" } });
    const revision = await prisma.sharedFlowRevision.create({ data: { sharedFlowId: flow.id, revision: 1, steps: "[]" } });
    res.status(201).json({ flow, revision: serializeRevision(revision) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const flow = await prisma.sharedFlow.findUnique({ where: { id: req.params.id }, include: { revisions: { orderBy: { revision: "desc" }, include: { policies: { orderBy: { order: "asc" } } } } } });
    if (!flow) return res.status(404).json({ error: "Shared flow not found" });
    res.json({ ...flow, revisions: flow.revisions.map(serializeRevision) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.sharedFlow.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// Clone latest revision into a new one (versioning)
router.post(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    const latest = await prisma.sharedFlowRevision.findFirst({ where: { sharedFlowId: req.params.id }, orderBy: { revision: "desc" }, include: { policies: true } });
    if (!latest) return res.status(404).json({ error: "No existing revision" });
    const next = await prisma.sharedFlowRevision.create({ data: { sharedFlowId: req.params.id, revision: latest.revision + 1, steps: latest.steps } });
    for (const p of latest.policies) {
      await prisma.sharedFlowPolicy.create({ data: { revisionId: next.id, name: p.name, type: p.type, category: p.category, config: p.config, xml: p.xml, order: p.order } });
    }
    const full = await prisma.sharedFlowRevision.findUnique({ where: { id: next.id }, include: { policies: { orderBy: { order: "asc" } } } });
    res.status(201).json(serializeRevision(full));
  })
);

router.post(
  "/:id/revisions/:revision/policies",
  asyncHandler(async (req, res) => {
    const { name, type, config, order, xml } = req.body;
    const def = getPolicyDef(type);
    if (!def) return res.status(400).json({ error: `Unknown policy type: ${type}` });
    const rev = await prisma.sharedFlowRevision.findFirst({ where: { sharedFlowId: req.params.id, revision: Number(req.params.revision) } });
    if (!rev) return res.status(404).json({ error: "Revision not found" });
    const mergedConfig = { ...def.defaultConfig, ...(config || {}) };
    const errors = def.validate(mergedConfig);
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });
    const finalXml = xml || def.buildXml(name, mergedConfig);
    const policy = await prisma.sharedFlowPolicy.create({ data: { revisionId: rev.id, name, type, category: def.category, config: JSON.stringify(mergedConfig), xml: finalXml, order: order || 0 } });
    res.status(201).json({ ...policy, config: JSON.parse(policy.config) });
  })
);

router.delete(
  "/policies/:policyId",
  asyncHandler(async (req, res) => {
    await prisma.sharedFlowPolicy.delete({ where: { id: req.params.policyId } });
    res.status(204).end();
  })
);

export default router;
