import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import { environmentsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

export default function EnvironmentList() {
  const [envs, setEnvs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", displayName: "", type: "BASE" });
  const [vhostOpenFor, setVhostOpenFor] = useState<string | null>(null);
  const [vhostForm, setVhostForm] = useState({ name: "default", port: 443, hostAliases: "", sslEnabled: true });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    environmentsApi.list().then(setEnvs);
  }
  useEffect(load, []);

  async function handleCreate() {
    await environmentsApi.create(form);
    setOpen(false);
    setForm({ name: "", displayName: "", type: "BASE" });
    showSnackbar("Environment created");
    load();
  }

  async function handleAddVhost() {
    if (!vhostOpenFor) return;
    await environmentsApi.addVirtualHost(vhostOpenFor, vhostForm);
    setVhostOpenFor(null);
    showSnackbar("Virtual host added");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="Environments"
        subtitle="Environments (dev, test, prod) isolate deployments, target servers, and KVMs."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create Environment
          </Button>
        }
      />
      <Grid container spacing={2}>
        {envs.map((env) => (
          <Grid item xs={12} md={4} key={env.id}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {env.displayName}
                </Typography>
                <Chip size="small" label={env.type} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {env._count?.deployments ?? 0} deployments · {env._count?.targetServers ?? 0} target servers · {env._count?.kvms ?? 0} KVMs
              </Typography>
              <Button size="small" onClick={() => setVhostOpenFor(env.id)}>
                + Virtual Host
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Environment</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name (e.g. staging)" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Display Name" size="small" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(vhostOpenFor)} onClose={() => setVhostOpenFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Virtual Host</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" size="small" value={vhostForm.name} onChange={(e) => setVhostForm({ ...vhostForm, name: e.target.value })} />
          <TextField label="Port" type="number" size="small" value={vhostForm.port} onChange={(e) => setVhostForm({ ...vhostForm, port: Number(e.target.value) })} />
          <TextField label="Host Aliases (comma-separated)" size="small" value={vhostForm.hostAliases} onChange={(e) => setVhostForm({ ...vhostForm, hostAliases: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVhostOpenFor(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddVhost}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
