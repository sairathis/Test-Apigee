import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Link,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import RocketIcon from "@mui/icons-material/RocketLaunchOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import ProxyFlowDiagram from "../../components/proxy/ProxyFlowDiagram";
import PolicyPickerDialog from "../../components/policy/PolicyPickerDialog";
import PolicyConfigDialog from "../../components/policy/PolicyConfigDialog";
import { proxiesApi, targetServersApi, environmentsApi, deploymentsApi } from "../../api/services";
import { getPolicyDef, PolicyTypeDef } from "../../data/policyCatalog";
import { defaultTargetEndpoint } from "../../data/flowTypes";
import { useUiStore } from "../../store/uiStore";

const HTTP_VERBS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"];

export default function ProxyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  const [proxy, setProxy] = useState<any>(null);
  const [revision, setRevision] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [targetServers, setTargetServers] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newPolicyTarget, setNewPolicyTarget] = useState("pre:request");
  const [configDef, setConfigDef] = useState<PolicyTypeDef | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const [openApiText, setOpenApiText] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/items": { "get": {}, "post": {} },\n    "/items/{id}": { "get": {}, "delete": {} }\n  }\n}');
  const [openApiError, setOpenApiError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const p = await proxiesApi.get(id);
    setProxy(p);
    const latest = p.revisions[0]?.revision || 1;
    const rev = await proxiesApi.getRevision(id, latest);
    setRevision(rev);
  }, [id]);

  useEffect(() => {
    load();
    targetServersApi.list().then(setTargetServers);
    environmentsApi.list().then(setEnvironments);
  }, [load]);

  useEffect(() => {
    if (proxy) {
      deploymentsApi.list().then((all) => setDeployments(all.filter((d: any) => d.proxyId === proxy.id)));
    }
  }, [proxy]);

  if (!proxy || !revision) {
    return (
      <Box>
        <Typography color="text.secondary">Loading proxy...</Typography>
      </Box>
    );
  }

  const policies = revision.policies || [];
  const proxyEndpoint = revision.proxyEndpoint;
  const targetEndpoints: any[] = revision.targetEndpoints || [];
  const routeRules: any[] = proxyEndpoint.routeRules || [];
  const conditionalFlows: any[] = proxyEndpoint.conditionalFlows || [];
  const preFlowPolicies = (proxyEndpoint.preFlow.request || []).map((name: string) => policies.find((p: any) => p.name === name)).filter(Boolean);
  const postFlowPolicies = (proxyEndpoint.postFlow.response || []).map((name: string) => policies.find((p: any) => p.name === name)).filter(Boolean);

  // Default/fallback target - the last route rule is the conventional fallback (matches
  // real Apigee: list conditional route rules first, unconditional default rule last).
  const defaultTargetName = routeRules[routeRules.length - 1]?.targetEndpoint || targetEndpoints[0]?.name;
  const defaultTarget = targetEndpoints.find((t) => t.name === defaultTargetName) || targetEndpoints[0];

  function policyLocationLabel(p: any): string {
    if (proxyEndpoint.preFlow.request.includes(p.name)) return "ProxyEndpoint PreFlow";
    if (proxyEndpoint.postFlow.response.includes(p.name)) return "ProxyEndpoint PostFlow";
    for (const f of conditionalFlows) {
      if ((f.request || []).includes(p.name)) return `Conditional Flow "${f.name}" (request)`;
      if ((f.response || []).includes(p.name)) return `Conditional Flow "${f.name}" (response)`;
    }
    return "Unattached";
  }

  async function handleSaveDescription(description: string) {
    await proxiesApi.update(proxy.id, { description });
    showSnackbar("Proxy updated");
  }

  async function saveProxyEndpoint(pe: any, message = "Saved") {
    await proxiesApi.updateFlows(proxy.id, revision.revision, { proxyEndpoint: pe });
    showSnackbar(message);
    load();
  }

  async function saveTargetEndpoints(list: any[], message = "Target endpoints updated") {
    await proxiesApi.updateFlows(proxy.id, revision.revision, { targetEndpoints: list });
    showSnackbar(message);
    load();
  }

  async function handleAddPolicyToTarget(targetKey: string, name: string, type: string, config: Record<string, any>, xml?: string) {
    const created = await proxiesApi.addPolicy(proxy.id, revision.revision, { name, type, config, xml });
    const pe = { ...proxyEndpoint };
    if (targetKey === "pre:request") {
      pe.preFlow = { ...pe.preFlow, request: [...pe.preFlow.request, created.name] };
    } else if (targetKey === "post:response") {
      pe.postFlow = { ...pe.postFlow, response: [...pe.postFlow.response, created.name] };
    } else if (targetKey.startsWith("cond:")) {
      const [, flowName, side] = targetKey.split(":");
      pe.conditionalFlows = pe.conditionalFlows.map((f: any) => (f.name === flowName ? { ...f, [side]: [...(f[side] || []), created.name] } : f));
    }
    await proxiesApi.updateFlows(proxy.id, revision.revision, { proxyEndpoint: pe });
    showSnackbar("Policy added");
    load();
  }

  async function handleUpdatePolicy(policyId: string, name: string, config: Record<string, any>, xml?: string) {
    await proxiesApi.updatePolicy(policyId, { name, config, xml });
    showSnackbar("Policy saved");
    load();
  }

  async function handleRemovePolicy(name: string) {
    const policy = policies.find((p: any) => p.name === name);
    if (!policy) return;
    await proxiesApi.removePolicy(policy.id);
    const pe = { ...proxyEndpoint };
    pe.preFlow = { ...pe.preFlow, request: pe.preFlow.request.filter((n: string) => n !== name) };
    pe.postFlow = { ...pe.postFlow, response: pe.postFlow.response.filter((n: string) => n !== name) };
    pe.conditionalFlows = pe.conditionalFlows.map((f: any) => ({
      ...f,
      request: (f.request || []).filter((n: string) => n !== name),
      response: (f.response || []).filter((n: string) => n !== name),
    }));
    await proxiesApi.updateFlows(proxy.id, revision.revision, { proxyEndpoint: pe });
    showSnackbar("Policy removed");
    load();
  }

  // ------------------------------------------------------------- TARGET ENDPOINTS
  function handleTargetFieldChange(idx: number, field: string, value: string) {
    const list = targetEndpoints.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    saveTargetEndpoints(list);
  }

  function handleAddTargetEndpoint() {
    const name = window.prompt("Name for the new target endpoint (e.g. write-target):", `target-${targetEndpoints.length + 1}`);
    if (!name) return;
    if (targetEndpoints.some((t) => t.name === name)) {
      showSnackbar("A target endpoint with that name already exists");
      return;
    }
    const list = [...targetEndpoints, defaultTargetEndpoint("", name)];
    saveTargetEndpoints(list, `Target endpoint "${name}" added - reference it from a Route Rule to route traffic to it`);
  }

  function handleRemoveTargetEndpoint(idx: number) {
    if (targetEndpoints.length <= 1) {
      showSnackbar("At least one target endpoint is required");
      return;
    }
    const removed = targetEndpoints[idx];
    if (routeRules.some((r) => r.targetEndpoint === removed.name)) {
      showSnackbar(`Cannot remove "${removed.name}" - still referenced by a Route Rule. Update or remove that rule first.`);
      return;
    }
    saveTargetEndpoints(targetEndpoints.filter((_, i) => i !== idx));
  }

  // ------------------------------------------------------------- ROUTE RULES
  function handleAddRouteRule() {
    const rule = { name: `rule-${routeRules.length + 1}`, targetEndpoint: targetEndpoints[0]?.name || "default", condition: { verb: "", basePathSuffix: "" } };
    saveProxyEndpoint({ ...proxyEndpoint, routeRules: [...routeRules, rule] });
  }

  function handleUpdateRouteRule(idx: number, field: string, value: string) {
    const rules = routeRules.map((r, i) => {
      if (i !== idx) return r;
      if (field === "targetEndpoint") return { ...r, targetEndpoint: value };
      if (field === "name") return { ...r, name: value };
      const condition = { ...(r.condition || {}) };
      if (field === "verb") condition.verb = value || undefined;
      if (field === "basePathSuffix") condition.basePathSuffix = value || undefined;
      return { ...r, condition };
    });
    saveProxyEndpoint({ ...proxyEndpoint, routeRules: rules });
  }

  function handleRemoveRouteRule(idx: number) {
    if (routeRules.length <= 1) {
      showSnackbar("At least one route rule is required");
      return;
    }
    saveProxyEndpoint({ ...proxyEndpoint, routeRules: routeRules.filter((_, i) => i !== idx) });
  }

  function handleMoveRouteRule(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= routeRules.length) return;
    const rules = [...routeRules];
    [rules[idx], rules[j]] = [rules[j], rules[idx]];
    saveProxyEndpoint({ ...proxyEndpoint, routeRules: rules }, "Route rule order updated");
  }

  // ------------------------------------------------------------- CONDITIONAL FLOWS
  function handleAddConditionalFlow() {
    const flow = { name: `flow-${conditionalFlows.length + 1}`, condition: { verb: "", basePathSuffix: "" }, request: [], response: [] };
    saveProxyEndpoint({ ...proxyEndpoint, conditionalFlows: [...conditionalFlows, flow] }, "Conditional flow added");
  }

  function handleUpdateConditionalFlowField(idx: number, field: string, value: string) {
    const flows = conditionalFlows.map((f, i) => {
      if (i !== idx) return f;
      if (field === "name") return { ...f, name: value };
      const condition = { ...(f.condition || {}) };
      if (field === "verb") condition.verb = value || undefined;
      if (field === "basePathSuffix") condition.basePathSuffix = value || undefined;
      return { ...f, condition };
    });
    saveProxyEndpoint({ ...proxyEndpoint, conditionalFlows: flows });
  }

  function handleRemoveConditionalFlow(idx: number) {
    saveProxyEndpoint({ ...proxyEndpoint, conditionalFlows: conditionalFlows.filter((_, i) => i !== idx) }, "Conditional flow removed");
  }

  async function handleDeploy(envName: string) {
    const env = environments.find((e) => e.name === envName);
    if (!env) return;
    await deploymentsApi.deploy({ proxyId: proxy.id, revision: revision.revision, environmentId: env.id });
    showSnackbar(`Deployed revision ${revision.revision} to ${envName}`);
    const all = await deploymentsApi.list();
    setDeployments(all.filter((d: any) => d.proxyId === proxy.id));
  }

  async function handleImportOpenApi() {
    setOpenApiError("");
    let spec: any;
    try {
      spec = JSON.parse(openApiText);
    } catch {
      setOpenApiError("Invalid JSON. Paste a valid OpenAPI 3.0 document (JSON format).");
      return;
    }
    await proxiesApi.importOpenApi(proxy.id, revision.revision, spec);
    setOpenApiOpen(false);
    showSnackbar("OpenAPI spec imported - conditional flows generated per path/verb");
    load();
  }

  async function handleUndeploy(deploymentId: string) {
    await deploymentsApi.undeploy(deploymentId);
    showSnackbar("Undeployed");
    const all = await deploymentsApi.list();
    setDeployments(all.filter((d: any) => d.proxyId === proxy.id));
  }

  const policyTargetOptions: Array<{ value: string; label: string }> = [
    { value: "pre:request", label: "ProxyEndpoint PreFlow (request)" },
    { value: "post:response", label: "ProxyEndpoint PostFlow (response)" },
    ...conditionalFlows.flatMap((f) => [
      { value: `cond:${f.name}:request`, label: `Conditional Flow "${f.name}" (request)` },
      { value: `cond:${f.name}:response`, label: `Conditional Flow "${f.name}" (response)` },
    ]),
  ];

  return (
    <Box>
      <PageHeader
        title={proxy.name}
        breadcrumbs={["API Proxies"]}
        subtitle={`Base path: ${proxy.basePath} · Revision ${revision.revision}`}
        actions={
          <>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setOpenApiOpen(true)}>
              Import OpenAPI
            </Button>
            <Button variant="outlined" onClick={() => navigate("/proxies")}>
              Back to list
            </Button>
          </>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Overview" />
        <Tab label="Develop" />
        <Tab label="Deploy" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Proxy details
              </Typography>
              <TextField label="Proxy Name" value={proxy.name} size="small" fullWidth sx={{ mb: 2 }} disabled />
              <TextField label="Base Path" value={proxy.basePath} size="small" fullWidth sx={{ mb: 2 }} disabled />
              <TextField
                label="Description"
                value={proxy.description}
                size="small"
                fullWidth
                multiline
                rows={3}
                onChange={(e) => setProxy({ ...proxy, description: e.target.value })}
                onBlur={(e) => handleSaveDescription(e.target.value)}
              />
              {deployments.filter((d) => d.status === "deployed").length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Live endpoint by deployed environment (click to hit it directly) - showing the default target ("{defaultTarget?.name}")
                    {routeRules.length > 1 && " · other HTTP methods may route elsewhere, see the Develop tab's Route Rules table"}
                  </Typography>
                  <Stack spacing={0.5}>
                    {deployments
                      .filter((d) => d.status === "deployed")
                      .map((d) => {
                        const ts = targetServers.find((t) => t.name === defaultTarget?.targetServerName && t.environmentId === d.environmentId);
                        const url = `${(ts?.host || "").replace(/\/$/, "")}${proxy.basePath}`;
                        return (
                          <Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip label={d.environment?.displayName || d.environmentId} size="small" variant="outlined" />
                            {ts ? (
                              <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 13, wordBreak: "break-all", display: "flex", alignItems: "center", gap: 0.5 }}>
                                {url}
                                <OpenInNewIcon sx={{ fontSize: 14 }} />
                              </Link>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No target server configured for this environment.
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Revisions
              </Typography>
              <Table size="small">
                <TableBody>
                  {proxy.revisions.map((r: any) => (
                    <TableRow key={r.revision}>
                      <TableCell>Revision {r.revision}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button size="small" sx={{ mt: 1 }} onClick={async () => { await proxiesApi.createRevision(proxy.id); showSnackbar("New revision created"); load(); }}>
                + Create new revision
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Flow visualization (default route)
            </Typography>
            <ProxyFlowDiagram
              preFlowPolicies={preFlowPolicies}
              postFlowPolicies={postFlowPolicies}
              targetName={defaultTarget ? defaultTarget.targetServerName || defaultTarget.url || defaultTarget.name : "unconfigured"}
              onNodeClick={(name) => setEditingPolicy(policies.find((p: any) => p.name === name))}
            />

            {/* ---------------------------------------------------- TARGET ENDPOINTS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Target Endpoints
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddTargetEndpoint}>
                  Add Target Endpoint
                </Button>
              </Box>
              <Stack spacing={2}>
                {targetEndpoints.map((t, idx) => (
                  <Paper key={t.name} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Chip label={t.name} size="small" color={t.name === defaultTargetName ? "primary" : "default"} />
                      <IconButton size="small" onClick={() => handleRemoveTargetEndpoint(idx)} disabled={targetEndpoints.length <= 1}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Target Server"
                          size="small"
                          fullWidth
                          value={t.targetServerName || ""}
                          onChange={(e) => handleTargetFieldChange(idx, "targetServerName", e.target.value)}
                        >
                          {Array.from(new Set(targetServers.map((ts) => ts.name))).map((name) => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          label="Failover Target Server (optional)"
                          size="small"
                          fullWidth
                          value={t.failoverTargetServerName || ""}
                          onChange={(e) => handleTargetFieldChange(idx, "failoverTargetServerName", e.target.value)}
                        >
                          <MenuItem value="">None</MenuItem>
                          {Array.from(new Set(targetServers.map((ts) => ts.name))).map((name) => (
                            <MenuItem key={name} value={name}>
                              {name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                    {t.targetServerName && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          Resolved host by environment
                        </Typography>
                        <Stack spacing={0.5}>
                          {targetServers
                            .filter((ts) => ts.name === t.targetServerName)
                            .map((ts) => (
                              <Box key={ts.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Chip label={ts.environment?.name || "org-wide"} size="small" variant="outlined" />
                                <Link href={ts.host} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 13, wordBreak: "break-all", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  {ts.host}
                                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                                </Link>
                              </Box>
                            ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Paper>

            {/* ---------------------------------------------------- ROUTE RULES */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Route Rules
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddRouteRule}>
                  Add Route Rule
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Evaluated top to bottom. Leave verb/path blank on the last rule to use it as the default/fallback route - this lets
                different HTTP methods (GET, POST, PUT, PATCH, DELETE) or different sub-paths reach different Target Endpoints.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={40}></TableCell>
                    <TableCell>Rule Name</TableCell>
                    <TableCell>Verb</TableCell>
                    <TableCell>Base Path Suffix</TableCell>
                    <TableCell>Target Endpoint</TableCell>
                    <TableCell width={40}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routeRules.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Stack direction="row">
                          <IconButton size="small" onClick={() => handleMoveRouteRule(idx, -1)} disabled={idx === 0}>
                            <ArrowUpwardIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleMoveRouteRule(idx, 1)} disabled={idx === routeRules.length - 1}>
                            <ArrowDownwardIcon fontSize="inherit" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          value={r.name}
                          onChange={(e) => handleUpdateRouteRule(idx, "name", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField select size="small" variant="standard" value={r.condition?.verb || ""} onChange={(e) => handleUpdateRouteRule(idx, "verb", e.target.value)} sx={{ minWidth: 90 }}>
                          {HTTP_VERBS.map((v) => (
                            <MenuItem key={v} value={v}>
                              {v || "Any"}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          variant="standard"
                          placeholder="e.g. /items/{id}"
                          value={r.condition?.basePathSuffix || ""}
                          onChange={(e) => handleUpdateRouteRule(idx, "basePathSuffix", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField select size="small" variant="standard" value={r.targetEndpoint} onChange={(e) => handleUpdateRouteRule(idx, "targetEndpoint", e.target.value)} sx={{ minWidth: 120 }}>
                          {targetEndpoints.map((t) => (
                            <MenuItem key={t.name} value={t.name}>
                              {t.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleRemoveRouteRule(idx)} disabled={routeRules.length <= 1}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {/* ---------------------------------------------------- CONDITIONAL FLOWS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Conditional Flows
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddConditionalFlow}>
                  Add Conditional Flow
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Runs instead of (in addition to) the ProxyEndpoint PreFlow/PostFlow when its verb/path condition matches. Attach
                policies to a conditional flow's request/response using the "Attach to" dropdown in the Policies panel below.
              </Typography>
              {conditionalFlows.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No conditional flows yet.
                </Typography>
              )}
              <Stack spacing={2}>
                {conditionalFlows.map((f, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <TextField
                        size="small"
                        variant="standard"
                        value={f.name}
                        onChange={(e) => handleUpdateConditionalFlowField(idx, "name", e.target.value)}
                        sx={{ fontWeight: 600 }}
                      />
                      <IconButton size="small" onClick={() => handleRemoveConditionalFlow(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 1 }}>
                      <Grid item xs={6}>
                        <TextField select size="small" fullWidth label="Verb" value={f.condition?.verb || ""} onChange={(e) => handleUpdateConditionalFlowField(idx, "verb", e.target.value)}>
                          {HTTP_VERBS.map((v) => (
                            <MenuItem key={v} value={v}>
                              {v || "Any"}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Base Path Suffix"
                          placeholder="e.g. /items/{id}"
                          value={f.condition?.basePathSuffix || ""}
                          onChange={(e) => handleUpdateConditionalFlowField(idx, "basePathSuffix", e.target.value)}
                        />
                      </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Request: {(f.request || []).length ? f.request.join(", ") : "none"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Response: {(f.response || []).length ? f.response.join(", ") : "none"}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Policies
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
                  Add
                </Button>
              </Box>
              <TextField
                select
                size="small"
                fullWidth
                label="Attach new policy to"
                value={newPolicyTarget}
                onChange={(e) => setNewPolicyTarget(e.target.value)}
                sx={{ mb: 1.5 }}
              >
                {policyTargetOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              {policies.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No policies attached yet.
                </Typography>
              )}
              <Stack spacing={1}>
                {policies.map((p: any) => (
                  <Paper
                    key={p.id}
                    variant="outlined"
                    sx={{ p: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 1.5, cursor: "pointer" }}
                    onClick={() => setEditingPolicy(p)}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.type} · {policyLocationLabel(p)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePolicy(p.name);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Deploy revision {revision.revision}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            {environments.map((env) => {
              const activeDeployment = deployments.find((d) => d.environmentId === env.id && d.status === "deployed");
              return (
                <Paper key={env.id} variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 180 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    {env.displayName}
                  </Typography>
                  {activeDeployment ? (
                    <>
                      <StatusChip status="deployed" />
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
                        Rev {activeDeployment.revision.revision}
                      </Typography>
                      <Button size="small" color="error" sx={{ mt: 1 }} onClick={() => handleUndeploy(activeDeployment.id)}>
                        Undeploy
                      </Button>
                    </>
                  ) : (
                    <Button size="small" variant="contained" startIcon={<RocketIcon fontSize="small" />} onClick={() => handleDeploy(env.name)}>
                      Deploy
                    </Button>
                  )}
                </Paper>
              );
            })}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Deployment history
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Environment</TableCell>
                <TableCell>Revision</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Deployed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.environment.displayName}</TableCell>
                  <TableCell>{d.revision.revision}</TableCell>
                  <TableCell>
                    <StatusChip status={d.status} />
                  </TableCell>
                  <TableCell>{new Date(d.deployedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <PolicyPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(def) => {
          setPickerOpen(false);
          setConfigDef(def);
        }}
      />

      {configDef && (
        <PolicyConfigDialog
          open={Boolean(configDef)}
          onClose={() => setConfigDef(null)}
          policyType={configDef.type}
          onSave={(name, config, xml) => handleAddPolicyToTarget(newPolicyTarget, name, configDef.type, config, xml)}
        />
      )}

      {editingPolicy && (
        <PolicyConfigDialog
          open={Boolean(editingPolicy)}
          onClose={() => setEditingPolicy(null)}
          policyType={editingPolicy.type}
          initialName={editingPolicy.name}
          initialConfig={editingPolicy.config}
          initialXml={editingPolicy.xml}
          onSave={(name, config, xml) => handleUpdatePolicy(editingPolicy.id, name, config, xml)}
        />
      )}

      <Dialog open={openApiOpen} onClose={() => setOpenApiOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import OpenAPI Specification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste an OpenAPI 3.0 document (JSON). A conditional flow will be generated for each path + HTTP verb combination.
          </Typography>
          {openApiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {openApiError}
            </Alert>
          )}
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <Editor height="320px" defaultLanguage="json" value={openApiText} onChange={(v) => setOpenApiText(v || "")} theme="vs-light" options={{ minimap: { enabled: false }, fontSize: 13 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenApiOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleImportOpenApi}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
