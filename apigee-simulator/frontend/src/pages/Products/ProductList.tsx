import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { productsApi, proxiesApi, environmentsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const emptyForm = {
  name: "",
  displayName: "",
  description: "",
  approvalType: "auto",
  quotaLimit: 1000,
  quotaInterval: 1,
  quotaTimeUnit: "hour",
  environments: [] as string[],
  proxies: [] as string[],
  scopes: "",
  monetizationEnabled: false,
};

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [proxies, setProxies] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<any>(null);
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    setLoading(true);
    productsApi.list().then(setProducts).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    proxiesApi.list().then(setProxies);
    environmentsApi.list().then(setEnvs);
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      displayName: p.displayName,
      description: p.description || "",
      approvalType: p.approvalType,
      quotaLimit: p.quotaLimit,
      quotaInterval: p.quotaInterval,
      quotaTimeUnit: p.quotaTimeUnit,
      environments: p.environments || [],
      proxies: p.proxies || [],
      scopes: (p.scopes || []).join(", "),
      monetizationEnabled: Boolean(p.monetizationEnabled),
    });
    setOpen(true);
  }

  async function handleSave() {
    const payload = { ...form, scopes: form.scopes.split(",").map((s) => s.trim()).filter(Boolean) };
    if (editingId) {
      await productsApi.update(editingId, payload);
      showSnackbar("API Product updated");
    } else {
      await productsApi.create(payload);
      showSnackbar("API Product created");
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  }

  async function handleDelete() {
    await productsApi.remove(toDelete.id);
    setToDelete(null);
    showSnackbar("API Product deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="API Products"
        subtitle="Bundle proxies with quota, scopes and environment restrictions for developer consumption."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create Product
          </Button>
        }
      />
      {!loading && products.length === 0 ? (
        <EmptyState icon={<CategoryIcon />} title="No API products yet" description="Bundle one or more proxies into a product that developers can subscribe to." actionLabel="Create Product" onAction={openCreate} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Quota</TableCell>
                <TableCell>Environments</TableCell>
                <TableCell>Proxies</TableCell>
                <TableCell>Monetized</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{p.displayName}</TableCell>
                  <TableCell>
                    {p.quotaLimit} / {p.quotaInterval} {p.quotaTimeUnit}
                  </TableCell>
                  <TableCell>
                    {p.environments.map((e: string) => (
                      <Chip key={e} size="small" label={e} sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>
                    {p.proxies.length === 0 ? (
                      <span style={{ color: "rgba(0,0,0,0.5)" }}>None</span>
                    ) : (
                      p.proxies.map((name: string) => <Chip key={name} size="small" variant="outlined" label={name} sx={{ mr: 0.5, mb: 0.5 }} />)
                    )}
                  </TableCell>
                  <TableCell>{p.monetizationEnabled ? <Chip size="small" color="success" label="Yes" /> : <Chip size="small" variant="outlined" label="No" />}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setToDelete(p)}>
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
        <DialogTitle>{editingId ? "Edit API Product" : "Create API Product"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Product Name (internal)" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={Boolean(editingId)} helperText={editingId ? "Internal name can't be changed after creation" : undefined} />
          <TextField label="Display Name" size="small" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <TextField label="Description" size="small" multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField label="Quota Count" type="number" size="small" fullWidth value={form.quotaLimit} onChange={(e) => setForm({ ...form, quotaLimit: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Interval" type="number" size="small" fullWidth value={form.quotaInterval} onChange={(e) => setForm({ ...form, quotaInterval: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={4}>
              <TextField select label="Time Unit" size="small" fullWidth value={form.quotaTimeUnit} onChange={(e) => setForm({ ...form, quotaTimeUnit: e.target.value })}>
                {["minute", "hour", "day", "month"].map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <TextField
            select
            SelectProps={{ multiple: true }}
            label="Environments"
            size="small"
            value={form.environments}
            onChange={(e) => setForm({ ...form, environments: e.target.value as any })}
          >
            {envs.map((e) => (
              <MenuItem key={e.name} value={e.name}>
                {e.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select SelectProps={{ multiple: true }} label="Proxies (add or remove any time)" size="small" value={form.proxies} onChange={(e) => setForm({ ...form, proxies: e.target.value as any })}>
            {proxies.map((p) => (
              <MenuItem key={p.name} value={p.name}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Scopes (comma-separated)" size="small" value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} />
          <FormControlLabel control={<Switch checked={form.monetizationEnabled} onChange={(e) => setForm({ ...form, monetizationEnabled: e.target.checked })} />} label="Enable Monetization" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.displayName}>
            {editingId ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(toDelete)} title="Delete API Product" message={`Delete "${toDelete?.displayName}"? This cannot be undone.`} onCancel={() => setToDelete(null)} onConfirm={handleDelete} />
    </Box>
  );
}
