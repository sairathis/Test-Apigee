import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  List,
  ListItemButton,
  ListItemText,
  Link,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PageHeader from "../../components/common/PageHeader";
import { proxiesApi, traceApi, environmentsApi, targetServersApi } from "../../api/services";
import { selectRouteTargetName } from "../../data/flowTypes";
import { useUiStore } from "../../store/uiStore";

const STEP_ICON: Record<string, JSX.Element> = {
  success: <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />,
  error: <CancelIcon fontSize="small" sx={{ color: "error.main" }} />,
  skipped: <RemoveCircleIcon fontSize="small" sx={{ color: "text.disabled" }} />,
};

export default function TracePage() {
  const [proxies, setProxies] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [targetServers, setTargetServers] = useState<any[]>([]);
  const [proxyName, setProxyName] = useState("");
  const [environmentName, setEnvironmentName] = useState("test");
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/");
  const [basePath, setBasePath] = useState("");
  const [revision, setRevision] = useState<any>(null);
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([{ key: "Authorization", value: "" }]);
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
  const [bodyType, setBodyType] = useState<"none" | "json" | "form-urlencoded" | "form-data">("json");
  const [body, setBody] = useState("{}");
  const [formFields, setFormFields] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
  const [simulateFault, setSimulateFault] = useState("");
  const [policyNames, setPolicyNames] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  useEffect(() => {
    proxiesApi.list().then(setProxies);
    traceApi.history().then(setHistory);
    environmentsApi.list().then(setEnvironments);
    targetServersApi.list().then(setTargetServers);
  }, []);

  useEffect(() => {
    const p = proxies.find((pr) => pr.name === proxyName);
    if (!p) {
      setPolicyNames([]);
      setRevision(null);
      setBasePath("");
      return;
    }
    setPath(p.basePath);
    setBasePath(p.basePath);
    proxiesApi.get(p.id).then((full) => {
      const latest = full.revisions[0]?.revision || 1;
      proxiesApi.getRevision(p.id, latest).then((rev) => {
        setPolicyNames((rev.policies || []).map((pol: any) => pol.name));
        setRevision(rev);
      });
    });
  }, [proxyName, proxies]);

  // Route Rules are evaluated per-request (method + path), so the target endpoint that
  // will actually handle this trace can differ by HTTP method - re-resolve on every change.
  const targetEndpoints: any[] = revision?.targetEndpoints || [];
  const routeRules: any[] = revision?.proxyEndpoint?.routeRules || [];
  const resolvedTargetName = routeRules.length ? selectRouteTargetName(routeRules, method, path) : targetEndpoints[0]?.name;
  const resolvedTarget = targetEndpoints.find((t) => t.name === resolvedTargetName) || targetEndpoints[0];
  const targetServerName = resolvedTarget?.targetServerName || "";
  const matchedRule = routeRules.find((r) => r.targetEndpoint === resolvedTargetName);
  const resolvedTargetServer = targetServers.find((t) => t.name === targetServerName && (t.environment?.name === environmentName || !t.environment));
  const resolvedUrl = resolvedTargetServer ? `${(resolvedTargetServer.host || "").replace(/\/$/, "")}${path}` : "";

  async function runTrace() {
    setRunning(true);
    setError("");
    try {
      const headerMap: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key) headerMap[h.key] = h.value;
      });

      // Query params: merge whatever's typed straight into Path (e.g. "/secure?access_token=abc")
      // with the dedicated Query Params table below (Postman-style Params tab) - table rows win
      // on key collisions since they're the more deliberate/explicit input.
      const [pathname, queryString] = path.split("?");
      const query: Record<string, string> = {};
      if (queryString) {
        new URLSearchParams(queryString).forEach((v, k) => {
          query[k] = v;
        });
      }
      queryParams.forEach((q) => {
        if (q.key) query[q.key] = q.value;
      });

      // Body: JSON uses the raw editor as before; the two form types build a plain key/value
      // object from their own table (mirroring how Express/Postman parse form bodies) and also
      // auto-set a Content-Type header (unless the user already set one) so policies that check
      // it see something realistic.
      let parsedBody: any = null;
      if (bodyType === "json") {
        try {
          parsedBody = body ? JSON.parse(body) : null;
        } catch {
          parsedBody = body;
        }
      } else if (bodyType === "form-urlencoded" || bodyType === "form-data") {
        const fields: Record<string, string> = {};
        formFields.forEach((f) => {
          if (f.key) fields[f.key] = f.value;
        });
        parsedBody = fields;
        const hasContentType = Object.keys(headerMap).some((k) => k.toLowerCase() === "content-type");
        if (!hasContentType) {
          headerMap["Content-Type"] = bodyType === "form-urlencoded" ? "application/x-www-form-urlencoded" : "multipart/form-data";
        }
      } else {
        parsedBody = null;
      }

      const res = await traceApi.run({
        proxyName,
        environmentName,
        method,
        path: pathname,
        query,
        headers: headerMap,
        body: parsedBody,
        simulateFault: simulateFault || undefined,
      });
      setResult(res);
      traceApi.history().then(setHistory);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Trace failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Box>
      <PageHeader title="Trace" subtitle="Send a simulated request through a deployed proxy and inspect every policy execution step-by-step." />

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Request
            </Typography>
            <TextField select label="Proxy" size="small" fullWidth sx={{ mb: 2 }} value={proxyName} onChange={(e) => setProxyName(e.target.value)}>
              {proxies.map((p) => (
                <MenuItem key={p.id} value={p.name}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Environment" size="small" fullWidth sx={{ mb: 2 }} value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)}>
              {environments.map((e) => (
                <MenuItem key={e.id} value={e.name}>
                  {e.displayName || e.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField select label="Method" size="small" value={method} onChange={(e) => setMethod(e.target.value)} sx={{ width: 110 }}>
                {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Path" size="small" fullWidth value={path} onChange={(e) => setPath(e.target.value)} />
            </Stack>

            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Query Params
            </Typography>
            <Stack spacing={1} sx={{ mb: 1 }}>
              {queryParams.map((q, idx) => (
                <Stack direction="row" spacing={1} key={idx}>
                  <TextField
                    size="small"
                    placeholder="Param"
                    value={q.key}
                    onChange={(e) => setQueryParams(queryParams.map((qq, i) => (i === idx ? { ...qq, key: e.target.value } : qq)))}
                  />
                  <TextField
                    size="small"
                    placeholder="Value"
                    fullWidth
                    value={q.value}
                    onChange={(e) => setQueryParams(queryParams.map((qq, i) => (i === idx ? { ...qq, value: e.target.value } : qq)))}
                  />
                  <IconButton size="small" onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setQueryParams([...queryParams, { key: "", value: "" }])} sx={{ mb: 2 }}>
              Add Query Param
            </Button>

            {proxyName && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Base path: <code>{basePath}</code> · Target endpoint: <code>{resolvedTargetName || "none"}</code> · Target server: <code>{targetServerName || "none configured"}</code>
                </Typography>
                {routeRules.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    Matched route rule: <code>{matchedRule?.name || "(fallback)"}</code> for <strong>{method} {path}</strong> - other methods/paths on this proxy may route to a different target endpoint (see the proxy's Develop tab).
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Resolved endpoint for the <strong>{environmentName}</strong> environment:
                </Typography>
                {resolvedTargetServer ? (
                  <Link
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ fontSize: 13, wordBreak: "break-all", display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
                  >
                    {resolvedUrl}
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                ) : (
                  <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                    No target server named "{targetServerName || "?"}" is configured for {environmentName} - the target call in this trace will likely fail.
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Headers
            </Typography>
            <Stack spacing={1} sx={{ mb: 1 }}>
              {headers.map((h, idx) => (
                <Stack direction="row" spacing={1} key={idx}>
                  <TextField
                    size="small"
                    placeholder="Header"
                    value={h.key}
                    onChange={(e) => setHeaders(headers.map((hh, i) => (i === idx ? { ...hh, key: e.target.value } : hh)))}
                  />
                  <TextField
                    size="small"
                    placeholder="Value"
                    fullWidth
                    value={h.value}
                    onChange={(e) => setHeaders(headers.map((hh, i) => (i === idx ? { ...hh, value: e.target.value } : hh)))}
                  />
                  <IconButton size="small" onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setHeaders([...headers, { key: "", value: "" }])}>
              Add Header
            </Button>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                Body
              </Typography>
              <TextField
                select
                size="small"
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value as any)}
                sx={{ width: 190 }}
              >
                <MenuItem value="none">none</MenuItem>
                <MenuItem value="json">raw (JSON)</MenuItem>
                <MenuItem value="form-urlencoded">x-www-form-urlencoded</MenuItem>
                <MenuItem value="form-data">form-data</MenuItem>
              </TextField>
            </Stack>

            {bodyType === "json" && (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                <Editor height="120px" defaultLanguage="json" value={body} onChange={(v) => setBody(v || "")} theme="vs-light" options={{ minimap: { enabled: false }, fontSize: 12 }} />
              </Box>
            )}

            {(bodyType === "form-urlencoded" || bodyType === "form-data") && (
              <Stack spacing={1}>
                {formFields.map((f, idx) => (
                  <Stack direction="row" spacing={1} key={idx}>
                    <TextField
                      size="small"
                      placeholder="Key"
                      value={f.key}
                      onChange={(e) => setFormFields(formFields.map((ff, i) => (i === idx ? { ...ff, key: e.target.value } : ff)))}
                    />
                    <TextField
                      size="small"
                      placeholder="Value"
                      fullWidth
                      value={f.value}
                      onChange={(e) => setFormFields(formFields.map((ff, i) => (i === idx ? { ...ff, value: e.target.value } : ff)))}
                    />
                    <IconButton size="small" onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => setFormFields([...formFields, { key: "", value: "" }])} sx={{ alignSelf: "flex-start" }}>
                  Add Field
                </Button>
              </Stack>
            )}

            {bodyType === "none" && (
              <Typography variant="caption" color="text.secondary">
                No request body will be sent.
              </Typography>
            )}

            <TextField
              select
              label="Simulate Fault (optional)"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              value={simulateFault}
              onChange={(e) => setSimulateFault(e.target.value)}
              helperText="Force a specific policy to fail, to practice fault handling"
            >
              <MenuItem value="">None</MenuItem>
              {policyNames.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" fullWidth startIcon={<PlayArrowIcon />} sx={{ mt: 2 }} onClick={runTrace} disabled={!proxyName || running}>
              {running ? "Running..." : "Run Trace"}
            </Button>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Recent Trace Sessions
            </Typography>
            <List dense disablePadding>
              {history.slice(0, 10).map((h) => (
                <ListItemButton key={h.id} onClick={() => setResult(h)} sx={{ borderRadius: 1 }}>
                  <ListItemText
                    primary={`${h.proxyName} (${h.environmentName})`}
                    secondary={`${new Date(h.createdAt).toLocaleTimeString()} · ${h.durationMs}ms`}
                  />
                  {h.success ? <CheckCircleIcon fontSize="small" color="success" /> : <CancelIcon fontSize="small" color="error" />}
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {!result ? (
            <Paper variant="outlined" sx={{ p: 6, borderRadius: 2, textAlign: "center", color: "text.secondary" }}>
              Run a trace to see the flow execution timeline here.
            </Paper>
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Flow Execution Timeline
                  </Typography>
                  <Chip label={result.success ? "Success" : "Fault"} color={result.success ? "success" : "error"} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Total duration: {result.durationMs}ms
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  {result.timeline.map((step: any, idx: number) => (
                    <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 0.75, px: 1, borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}>
                      {STEP_ICON[step.status]}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {step.name} <Typography component="span" variant="caption" color="text.secondary">({step.type})</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {step.phase}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {step.message}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {step.durationMs}ms
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Request
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.request.method} {result.request.path}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" fontWeight={600} display="block">
                      Headers
                    </Typography>
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.request.headers, null, 2)}</pre>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>
                      Payload
                    </Typography>
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.request.body, null, 2)}</pre>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Response ({result.response.status} {result.response.reasonPhrase})
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" fontWeight={600} display="block">
                      Headers
                    </Typography>
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result.response.headers, null, 2)}</pre>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>
                      Body
                    </Typography>
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>{JSON.stringify(result.response.body, null, 2)}</pre>
                  </Paper>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Variables Created
                </Typography>
                <Table size="small">
                  <TableBody>
                    {Object.entries(result.variables)
                      .filter(([k]) => !k.startsWith("__"))
                      .map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell sx={{ fontWeight: 600, width: "35%" }}>{k}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Paper>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
