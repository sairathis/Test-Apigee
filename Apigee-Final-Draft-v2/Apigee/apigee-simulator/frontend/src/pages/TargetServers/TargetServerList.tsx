import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, IconButton, Switch, FormControlLabel } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import DnsIcon from "@mui/icons-material/DnsOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { targetServersApi, environmentsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const emptyForm = { name: "", host: "", environmentId: "", enabled: true, useSSL: true };

export default function TargetServerList() {
  const [servers, setServers] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<any>(null);
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    targetServersApi.list().then(setServers);
  }
  useEffect(() => {
    load();
    environmentsApi.list().then(setEnvs);
  }, []);

  async function handleCreate() {
    await targetServersApi.create(form);
    setOpen(false);
    setForm(emptyForm);
    showSnackbar("Target server created");
    load();
  }

  async function handleDelete() {
    await targetServersApi.remove(toDelete.id);
    setToDelete(null);
    showSnackbar("Target server deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="Target Servers"
        subtitle="Named backend endpoints that proxies route traffic to. Seeded with real public sample APIs."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Target Server
          </Button>
        }
      />
      {servers.length === 0 ? (
        <EmptyState icon={<DnsIcon />} title="No target servers" description="Add a backend endpoint that your proxies can route to." actionLabel="Add Target Server" onAction={() => setOpen(true)} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {servers.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <code>{s.host}</code>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={s.environment?.name || "org-wide"} />
                  </TableCell>
                  <TableCell>{s.enabled ? <Chip size="small" color="success" label="Enabled" /> : <Chip size="small" variant="outlined" label="Disabled" />}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setToDelete(s)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Target Server</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Host URL" size="small" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="https://api.example.com" />
          <TextField select label="Environment" size="small" value={form.environmentId} onChange={(e) => setForm({ ...form, environmentId: e.target.value })}>
            {envs.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel control={<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />} label="Enabled" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.host}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(toDelete)} title="Delete Target Server" message={`Delete "${toDelete?.name}"?`} onCancel={() => setToDelete(null)} onConfirm={handleDelete} />
    </Box>
  );
}
