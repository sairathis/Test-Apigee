import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Chip, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ApiIcon from "@mui/icons-material/AccountTreeOutlined";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { proxiesApi } from "../../api/services";

export default function ProxyList() {
  const [proxies, setProxies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", basePath: "", description: "", targetUrl: "https://jsonplaceholder.typicode.com/users" });
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    proxiesApi.list().then(setProxies).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    const { proxy } = await proxiesApi.create(form);
    setOpen(false);
    setForm({ name: "", basePath: "", description: "", targetUrl: "https://jsonplaceholder.typicode.com/users" });
    navigate(`/proxies/${proxy.id}`);
  }

  return (
    <Box>
      <PageHeader
        title="API Proxies"
        subtitle="Create and manage API proxies - the entry point clients call into your backends."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create Proxy
          </Button>
        }
      />

      {!loading && proxies.length === 0 ? (
        <EmptyState icon={<ApiIcon />} title="No API proxies yet" description="Create your first proxy to define a client-facing API backed by a target service." actionLabel="Create Proxy" onAction={() => setOpen(true)} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Base Path</TableCell>
                <TableCell>Revision</TableCell>
                <TableCell>Deployed To</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proxies.map((p) => (
                <TableRow key={p.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/proxies/${p.id}`)}>
                  <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>{p.name}</TableCell>
                  <TableCell>
                    <code>{p.basePath}</code>
                  </TableCell>
                  <TableCell>{p.latestRevision}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {p.deployments.length === 0 && <Chip size="small" label="Undeployed" variant="outlined" />}
                      {p.deployments.map((d: any, i: number) => (
                        <Chip key={i} size="small" label={d.environment} color="success" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{p.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Proxy</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Proxy Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" autoFocus />
          <TextField label="Base Path" value={form.basePath} onChange={(e) => setForm({ ...form, basePath: e.target.value })} fullWidth size="small" placeholder="/my-api" />
          <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth size="small" multiline rows={2} />
          <TextField label="Initial Target URL" value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} fullWidth size="small" helperText="e.g. https://jsonplaceholder.typicode.com/users" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.basePath}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
