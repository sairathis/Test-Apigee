import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, MenuItem, TextField, IconButton, Chip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import { flowHooksApi, environmentsApi, sharedFlowsApi, proxiesApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const HOOK_POINTS = ["PreProxyFlowHook", "PostProxyFlowHook", "PreTargetFlowHook", "PostTargetFlowHook"];

export default function FlowHookList() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [proxies, setProxies] = useState<any[]>([]);
  const [form, setForm] = useState({ hookPoint: "PreProxyFlowHook", environmentId: "", sharedFlowId: "", proxyId: "" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    flowHooksApi.list().then(setHooks);
  }
  useEffect(() => {
    load();
    environmentsApi.list().then(setEnvs);
    sharedFlowsApi.list().then(setFlows);
    proxiesApi.list().then(setProxies);
  }, []);

  async function handleAttach() {
    await flowHooksApi.upsert({ ...form, proxyId: form.proxyId || null });
    showSnackbar("Flow hook attached");
    load();
  }

  async function handleRemove(id: string) {
    await flowHooksApi.remove(id);
    showSnackbar("Flow hook removed");
    load();
  }

  return (
    <Box>
      <PageHeader title="Flow Hooks" subtitle="Attach a Shared Flow globally to an environment at PreProxy, PostProxy, PreTarget, or PostTarget execution points." />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField select label="Hook Point" size="small" sx={{ minWidth: 180 }} value={form.hookPoint} onChange={(e) => setForm({ ...form, hookPoint: e.target.value })}>
            {HOOK_POINTS.map((h) => (
              <MenuItem key={h} value={h}>
                {h}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Environment" size="small" sx={{ minWidth: 150 }} value={form.environmentId} onChange={(e) => setForm({ ...form, environmentId: e.target.value })}>
            {envs.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Shared Flow" size="small" sx={{ minWidth: 200 }} value={form.sharedFlowId} onChange={(e) => setForm({ ...form, sharedFlowId: e.target.value })}>
            {flows.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Proxy (optional, blank = global)" size="small" sx={{ minWidth: 220 }} value={form.proxyId} onChange={(e) => setForm({ ...form, proxyId: e.target.value })}>
            <MenuItem value="">All proxies (global)</MenuItem>
            {proxies.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={handleAttach} disabled={!form.environmentId || !form.sharedFlowId}>
            Attach
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Hook Point</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Shared Flow</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hooks.map((h) => (
              <TableRow key={h.id}>
                <TableCell sx={{ fontWeight: 600 }}>{h.hookPoint}</TableCell>
                <TableCell>{h.environment?.name}</TableCell>
                <TableCell>{h.sharedFlow?.name}</TableCell>
                <TableCell>{h.proxy ? <Chip size="small" label={h.proxy.name} /> : <Chip size="small" color="info" label="Global" />}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleRemove(h.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
