import { Router } from "express";
import prisma from "../utils/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { defaultProxyEndpoint, defaultTargetEndpoint, ProxyEndpointDef, TargetEndpointDef } from "../utils/flowTypes";
import { getPolicyDef } from "../utils/policyCatalog";

const router = Router();

function serializeRevision(rev: any) {
  return {
    ...rev,
    proxyEndpoint: JSON.parse(rev.proxyEndpoint),
    targetEndpoints: JSON.parse(rev.targetEndpoints),
    resources: JSON.parse(rev.resources || "[]"),
    policies: (rev.policies || []).map((p: any) => ({ ...p, config: JSON.parse(p.config) })),
  };
}

// ---------------------------------------------------------------- PROXIES
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const proxies = await prisma.proxy.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        revisions: { orderBy: { revision: "desc" }, take: 1 },
        deployments: { include: { environment: true }, where: { status: "deployed" } },
      },
    });
    res.json(
      proxies.map((p) => ({
        id: p.id,
        name: p.name,
        basePath: p.basePath,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        latestRevision: p.revisions[0]?.revision || 1,
        deployments: p.deployments.map((d) => ({ environment: d.environment.name, revision: d.revisionId })),
      }))
    );
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, basePath, description, targetUrl } = req.body;
    if (!name || !basePath) return res.status(400).json({ error: "name and basePath are required" });
    const proxy = await prisma.proxy.create({ data: { name, basePath, description: description || "" } });
    const revision = await prisma.proxyRevision.create({
      data: {
        proxyId: proxy.id,
        revision: 1,
        proxyEndpoint: JSON.stringify(defaultProxyEndpoint(basePath)),
        targetEndpoints: JSON.stringify([defaultTargetEndpoint(targetUrl || "https://jsonplaceholder.typicode.com/users")]),
      },
    });
    res.status(201).json({ proxy, revision: serializeRevision(revision) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const proxy = await prisma.proxy.findUnique({
      where: { id: req.params.id },
      include: { revisions: { orderBy: { revision: "desc" } }, deployments: { include: { environment: true } } },
    });
    if (!proxy) return res.status(404).json({ error: "Proxy not found" });
    res.json({ ...proxy, revisions: proxy.revisions.map((r) => ({ id: r.id, revision: r.revision, createdAt: r.createdAt })) });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { description, basePath } = req.body;
    const proxy = await prisma.proxy.update({ where: { id: req.params.id }, data: { description, basePath } });
    res.json(proxy);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.proxy.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

// ------------------------------------------------------------- REVISIONS
router.get(
  "/:id/revisions/:revision",
  asyncHandler(async (req, res) => {
    const rev = await prisma.proxyRevision.findFirst({
      where: { proxyId: req.params.id, revision: Number(req.params.revision) },
      include: { policies: true },
    });
    if (!rev) return res.status(404).json({ error: "Revision not found" });
    res.json(serializeRevision(rev));
  })
);

// Create a new revision by cloning the latest one (Revision Management - bonus)
router.post(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    const latest = await prisma.proxyRevision.findFirst({ where: { proxyId: req.params.id }, orderBy: { revision: "desc" }, include: { policies: true } });
    if (!latest) return res.status(404).json({ error: "No existing revision to clone" });
    const newRevision = await prisma.proxyRevision.create({
      data: {
        proxyId: req.params.id,
        revision: latest.revision + 1,
        proxyEndpoint: latest.proxyEndpoint,
        targetEndpoints: latest.targetEndpoints,
        resources: latest.resources,
      },
    });
    for (const p of latest.policies) {
      await prisma.proxyPolicy.create({ data: { revisionId: newRevision.id, name: p.name, type: p.type, category: p.category, config: p.config, xml: p.xml, enabled: p.enabled } });
    }
    const full = await prisma.proxyRevision.findUnique({ where: { id: newRevision.id }, include: { policies: true } });
    res.status(201).json(serializeRevision(full));
  })
);

router.put(
  "/:id/revisions/:revision/flows",
  asyncHandler(async (req, res) => {
    const { proxyEndpoint, targetEndpoints }: { proxyEndpoint: ProxyEndpointDef; targetEndpoints: TargetEndpointDef[] } = req.body;
    const rev = await prisma.proxyRevision.findFirst({ where: { proxyId: req.params.id, revision: Number(req.params.revision) } });
    if (!rev) return res.status(404).json({ error: "Revision not found" });
    const updated = await prisma.proxyRevision.update({
      where: { id: rev.id },
      data: {
        proxyEndpoint: proxyEndpoint ? JSON.stringify(proxyEndpoint) : rev.proxyEndpoint,
        targetEndpoints: targetEndpoints ? JSON.stringify(targetEndpoints) : rev.targetEndpoints,
      },
      include: { policies: true },
    });
    res.json(serializeRevision(updated));
  })
);

// OpenAPI import (bonus) - accepts a parsed OpenAPI JSON doc and generates a
// basic proxy skeleton (base path + one conditional flow per path/verb).
router.post(
  "/:id/revisions/:revision/import-openapi",
  asyncHandler(async (req, res) => {
    const { spec } = req.body;
    const rev = await prisma.proxyRevision.findFirst({ where: { proxyId: req.params.id, revision: Number(req.params.revision) } });
    if (!rev) return res.status(404).json({ error: "Revision not found" });
    const proxyEndpoint: ProxyEndpointDef = JSON.parse(rev.proxyEndpoint);
    const paths = spec?.paths || {};
    proxyEndpoint.conditionalFlows = Object.keys(paths).flatMap((p) =>
      Object.keys(paths[p]).map((verb) => ({
        name: `${verb.toUpperCase()}-${p.replace(/[{}\/]/g, "-")}`,
        condition: { basePathSuffix: p, verb: verb.toUpperCase() },
        request: [],
        response: [],
      }))
    );
    const updated = await prisma.proxyRevision.update({
      where: { id: rev.id },
      data: { proxyEndpoint: JSON.stringify(proxyEndpoint), openApiSpec: JSON.stringify(spec) },
      include: { policies: true },
    });
    res.json(serializeRevision(updated));
  })
);

// ---------------------------------------------------------------- POLICIES
router.post(
  "/:id/revisions/:revision/policies",
  asyncHandler(async (req, res) => {
    const { name, type, config, xml } = req.body;
    const def = getPolicyDef(type);
    if (!def) return res.status(400).json({ error: `Unknown policy type: ${type}` });
    const rev = await prisma.proxyRevision.findFirst({ where: { proxyId: req.params.id, revision: Number(req.params.revision) } });
    if (!rev) return res.status(404).json({ error: "Revision not found" });
    const mergedConfig = { ...def.defaultConfig, ...(config || {}) };
    const errors = def.validate(mergedConfig);
    if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });
    const finalXml = xml || def.buildXml(name, mergedConfig);
    const policy = await prisma.proxyPolicy.create({
      data: { revisionId: rev.id, name, type, category: def.category, config: JSON.stringify(mergedConfig), xml: finalXml },
    });
    res.status(201).json({ ...policy, config: JSON.parse(policy.config) });
  })
);

router.put(
  "/policies/:policyId",
  asyncHandler(async (req, res) => {
    const { config, xml, enabled, name } = req.body;
    const existing = await prisma.proxyPolicy.findUnique({ where: { id: req.params.policyId } });
    if (!existing) return res.status(404).json({ error: "Policy not found" });
    const def = getPolicyDef(existing.type);
    let finalXml = xml;
    let finalConfig = config ? JSON.stringify(config) : existing.config;
    if (config && def) {
      const errors = def.validate(config);
      if (errors.length) return res.status(400).json({ error: "Validation failed", details: errors });
      finalXml = xml || def.buildXml(name || existing.name, config);
    }
    const updated = await prisma.proxyPolicy.update({
      where: { id: req.params.policyId },
      data: { config: finalConfig, xml: finalXml, enabled, name: name || existing.name },
    });
    res.json({ ...updated, config: JSON.parse(updated.config) });
  })
);

router.delete(
  "/policies/:policyId",
  asyncHandler(async (req, res) => {
    await prisma.proxyPolicy.delete({ where: { id: req.params.policyId } });
    res.status(204).end();
  })
);

export default router;
