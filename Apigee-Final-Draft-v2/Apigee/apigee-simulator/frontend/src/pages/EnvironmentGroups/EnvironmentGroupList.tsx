import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import { environmentGroupsApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

export default function EnvironmentGroupList() {
  const [groups, setGroups] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", hostnames: "", envNames: "" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    environmentGroupsApi.list().then(setGroups);
  }
  useEffect(load, []);

  async function handleCreate() {
    await environmentGroupsApi.create(form);
    setOpen(false);
    setForm({ name: "", hostnames: "", envNames: "" });
    showSnackbar("Environment group created");
    load();
  }

  async function handleDelete(id: string) {
    await environmentGroupsApi.remove(id);
    showSnackbar("Environment group deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="Environment Groups"
        subtitle="Route inbound hostnames to one or more environments (bonus feature mirroring Apigee X env groups)."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create Group
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Hostnames</TableCell>
              <TableCell>Environments</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell sx={{ fontWeight: 600 }}>{g.name}</TableCell>
                <TableCell>{g.hostnames}</TableCell>
                <TableCell>{g.envNames}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(g.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Environment Group</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Hostnames (comma-separated)" size="small" value={form.hostnames} onChange={(e) => setForm({ ...form, hostnames: e.target.value })} />
          <TextField label="Environments (comma-separated)" size="small" value={form.envNames} onChange={(e) => setForm({ ...form, envNames: e.target.value })} />
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
