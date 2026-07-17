import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, MenuItem, TextField } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import { deploymentsApi, proxiesApi, environmentsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

export default function DeploymentList() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [proxies, setProxies] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [form, setForm] = useState({ proxyId: "", environmentId: "" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    deploymentsApi.list().then(setDeployments);
  }
  useEffect(() => {
    load();
    proxiesApi.list().then(setProxies);
    environmentsApi.list().then(setEnvs);
  }, []);

  async function handleDeploy() {
    const proxy = proxies.find((p) => p.id === form.proxyId);
    if (!proxy) return;
    await deploymentsApi.deploy({ proxyId: proxy.id, revision: proxy.latestRevision, environmentId: form.environmentId });
    showSnackbar(`Deployed ${proxy.name} rev ${proxy.latestRevision}`);
    load();
  }

  async function handleUndeploy(id: string) {
    await deploymentsApi.undeploy(id);
    showSnackbar("Undeployed");
    load();
  }

  return (
    <Box>
      <PageHeader title="Deployments" subtitle="Simulated deployment status across Dev, Test, and Prod environments." />

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField select label="Proxy" size="small" sx={{ minWidth: 200 }} value={form.proxyId} onChange={(e) => setForm({ ...form, proxyId: e.target.value })}>
            {proxies.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} (rev {p.latestRevision})
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
          <Button variant="contained" onClick={handleDeploy} disabled={!form.proxyId || !form.environmentId}>
            Deploy
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Proxy</TableCell>
              <TableCell>Revision</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Deployed At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deployments.map((d) => (
              <TableRow key={d.id}>
                <TableCell sx={{ fontWeight: 600 }}>{d.proxy.name}</TableCell>
                <TableCell>{d.revision.revision}</TableCell>
                <TableCell>{d.environment.displayName}</TableCell>
                <TableCell>
                  <StatusChip status={d.status} />
                </TableCell>
                <TableCell>{new Date(d.deployedAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  {d.status === "deployed" && (
                    <Button size="small" color="error" onClick={() => handleUndeploy(d.id)}>
                      Undeploy
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
