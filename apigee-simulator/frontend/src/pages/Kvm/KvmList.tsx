import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Chip, Table, TableBody, TableRow, TableCell } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import { kvmApi, environmentsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

export default function KvmList() {
  const [kvms, setKvms] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", scope: "environment", environmentId: "", encrypted: false });
  const [entryOpenFor, setEntryOpenFor] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({ key: "", value: "" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    kvmApi.list().then(setKvms);
  }
  useEffect(() => {
    load();
    environmentsApi.list().then(setEnvs);
  }, []);

  async function handleCreate() {
    await kvmApi.create(form);
    setOpen(false);
    setForm({ name: "", scope: "environment", environmentId: "", encrypted: false });
    showSnackbar("KVM created");
    load();
  }

  async function handleAddEntry() {
    if (!entryOpenFor) return;
    await kvmApi.addEntry(entryOpenFor, entryForm);
    setEntryForm({ key: "", value: "" });
    setEntryOpenFor(null);
    showSnackbar("Entry saved");
    load();
  }

  async function handleDeleteEntry(entryId: string) {
    await kvmApi.removeEntry(entryId);
    showSnackbar("Entry deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="Key Value Maps"
        subtitle="Store configuration or secrets scoped to the organization or a specific environment."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create KVM
          </Button>
        }
      />
      <Grid container spacing={2}>
        {kvms.map((kvm) => (
          <Grid item xs={12} md={6} key={kvm.id}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {kvm.name}
                </Typography>
                <Chip size="small" label={kvm.scope === "environment" ? `env: ${kvm.environment?.name}` : "organization"} />
              </Box>
              <Table size="small">
                <TableBody>
                  {kvm.entries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{entry.key}</TableCell>
                      <TableCell>{kvm.encrypted ? "••••••••" : entry.value}</TableCell>
                      <TableCell align="right" width={40}>
                        <IconButton size="small" onClick={() => handleDeleteEntry(entry.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setEntryOpenFor(kvm.id)}>
                + Add Entry
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create KVM</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField select label="Scope" size="small" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            <MenuItem value="environment">Environment</MenuItem>
            <MenuItem value="organization">Organization</MenuItem>
          </TextField>
          {form.scope === "environment" && (
            <TextField select label="Environment" size="small" value={form.environmentId} onChange={(e) => setForm({ ...form, environmentId: e.target.value })}>
              {envs.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.name}
                </MenuItem>
              ))}
            </TextField>
          )}
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

      <Dialog open={Boolean(entryOpenFor)} onClose={() => setEntryOpenFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Entry</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Key" size="small" value={entryForm.key} onChange={(e) => setEntryForm({ ...entryForm, key: e.target.value })} />
          <TextField label="Value" size="small" value={entryForm.value} onChange={(e) => setEntryForm({ ...entryForm, value: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEntryOpenFor(null)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddEntry}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
