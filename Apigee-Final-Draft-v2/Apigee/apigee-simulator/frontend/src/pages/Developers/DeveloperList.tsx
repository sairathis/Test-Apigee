import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import StatusChip from "../../components/common/StatusChip";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { developersApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const emptyForm = { email: "", firstName: "", lastName: "", company: "", status: "active" };

export default function DeveloperList() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<any>(null);
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    setLoading(true);
    developersApi.list().then(setDevelopers).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    await developersApi.create(form);
    setOpen(false);
    setForm(emptyForm);
    showSnackbar("Developer created");
    load();
  }

  async function handleDelete() {
    await developersApi.remove(toDelete.id);
    setToDelete(null);
    showSnackbar("Developer deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="Developers"
        subtitle="Manage developer accounts who register apps against your API products."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Developer
          </Button>
        }
      />
      {!loading && developers.length === 0 ? (
        <EmptyState icon={<PeopleIcon />} title="No developers yet" description="Add a developer account to start registering apps." actionLabel="Add Developer" onAction={() => setOpen(true)} />
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Apps</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {developers.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {d.firstName} {d.lastName}
                  </TableCell>
                  <TableCell>{d.email}</TableCell>
                  <TableCell>{d.company}</TableCell>
                  <TableCell>{d._count?.apps ?? 0}</TableCell>
                  <TableCell>
                    <StatusChip status={d.status} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setToDelete(d)}>
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
        <DialogTitle>Add Developer</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Email" size="small" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextField label="First Name" size="small" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <TextField label="Last Name" size="small" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <TextField label="Company" size="small" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <TextField select label="Status" size="small" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.email || !form.firstName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(toDelete)} title="Delete Developer" message={`Delete "${toDelete?.email}"? Their apps will also be removed.`} onCancel={() => setToDelete(null)} onConfirm={handleDelete} />
    </Box>
  );
}
