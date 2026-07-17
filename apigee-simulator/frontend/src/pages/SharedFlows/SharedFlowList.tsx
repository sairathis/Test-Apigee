import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LayersIcon from "@mui/icons-material/LayersOutlined";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { sharedFlowsApi } from "../../api/services";

export default function SharedFlowList() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    sharedFlowsApi.list().then(setFlows).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    const { flow } = await sharedFlowsApi.create(form);
    setOpen(false);
    setForm({ name: "", description: "" });
    navigate(`/shared-flows/${flow.id}`);
  }

  return (
    <Box>
      <PageHeader
        title="Shared Flows"
        subtitle="Reusable policy sequences that can be invoked from proxies or attached as flow hooks."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create Shared Flow
          </Button>
        }
      />
      {!loading && flows.length === 0 ? (
        <EmptyState icon={<LayersIcon />} title="No shared flows yet" description="Create a shared flow to reuse policy logic across multiple proxies." actionLabel="Create Shared Flow" onAction={() => setOpen(true)} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Latest Revision</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flows.map((f) => (
                <TableRow key={f.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/shared-flows/${f.id}`)}>
                  <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>{f.name}</TableCell>
                  <TableCell>{f.latestRevision}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{f.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Shared Flow</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" autoFocus />
          <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth size="small" multiline rows={2} />
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
    </Box>
  );
}
