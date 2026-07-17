import { Fragment, useEffect, useState } from "react";
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
  IconButton,
  Chip,
  Collapse,
  Typography,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Autorenew";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AppsIcon from "@mui/icons-material/AppsOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import StatusChip from "../../components/common/StatusChip";
import { appsApi, developersApi, productsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const emptyForm = { name: "", developerId: "", callbackUrl: "", productIds: [] as string[] };

export default function AppList() {
  const [apps, setApps] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expanded, setExpanded] = useState<string | null>(null);
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    setLoading(true);
    appsApi.list().then(setApps).finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    developersApi.list().then(setDevelopers);
    productsApi.list().then(setProducts);
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      developerId: a.developerId || a.developer?.id || "",
      callbackUrl: a.callbackUrl || "",
      productIds: (a.products || []).map((p: any) => p.productId || p.product?.id).filter(Boolean),
    });
    setOpen(true);
  }

  async function handleSave() {
    if (editingId) {
      await appsApi.update(editingId, { name: form.name, callbackUrl: form.callbackUrl, productIds: form.productIds });
      showSnackbar("App updated");
    } else {
      await appsApi.create(form);
      showSnackbar("App created with a new consumer key/secret");
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  }

  async function handleRegenerate(id: string) {
    await appsApi.regenerateKeys(id);
    showSnackbar("Keys regenerated");
    load();
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    showSnackbar("Copied to clipboard", "info");
  }

  return (
    <Box>
      <PageHeader
        title="Apps"
        subtitle="Developer apps hold the API key / secret pairs used to call your API products."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Register App
          </Button>
        }
      />
      {!loading && apps.length === 0 ? (
        <EmptyState icon={<AppsIcon />} title="No apps registered" description="Register an app for a developer to generate an API key and secret." actionLabel="Register App" onAction={openCreate} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>App Name</TableCell>
                <TableCell>Developer</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((a) => (
                <Fragment key={a.id}>
                  <TableRow hover sx={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    <TableCell width={40}>
                      <ExpandMoreIcon sx={{ transform: expanded === a.id ? "rotate(180deg)" : "none", transition: "0.2s" }} fontSize="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                    <TableCell>{a.developer?.email}</TableCell>
                    <TableCell>
                      {a.products.length === 0 ? (
                        <span style={{ color: "rgba(0,0,0,0.5)" }}>None</span>
                      ) : (
                        a.products.map((p: any) => <Chip key={p.id} size="small" label={p.product.name} sx={{ mr: 0.5 }} />)
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={a.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit products">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(a); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Regenerate keys">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRegenerate(a.id); }}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expanded === a.id}>
                        <Box sx={{ p: 2, bgcolor: "#f6f8fc" }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Consumer Key
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <code style={{ fontSize: 13 }}>{a.consumerKey}</code>
                            <IconButton size="small" onClick={() => copy(a.consumerKey)}>
                              <ContentCopyIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Consumer Secret
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <code style={{ fontSize: 13 }}>{a.consumerSecret}</code>
                            <IconButton size="small" onClick={() => copy(a.consumerSecret)}>
                              <ContentCopyIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit App" : "Register App"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="App Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField select label="Developer" size="small" value={form.developerId} onChange={(e) => setForm({ ...form, developerId: e.target.value })} disabled={Boolean(editingId)} helperText={editingId ? "Developer can't be changed after creation" : undefined}>
            {developers.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField select SelectProps={{ multiple: true }} label="API Products (add or remove any time)" size="small" value={form.productIds} onChange={(e) => setForm({ ...form, productIds: e.target.value as any })}>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.displayName}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Callback URL" size="small" value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.developerId}>
            {editingId ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
