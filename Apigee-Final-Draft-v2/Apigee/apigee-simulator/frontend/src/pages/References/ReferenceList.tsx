import { useEffect, useState } from "react";
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import { referencesApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

export default function ReferenceList() {
  const [refs, setRefs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", refers: "", resourceType: "KeyStore" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    referencesApi.list().then(setRefs);
  }
  useEffect(load, []);

  async function handleCreate() {
    await referencesApi.create(form);
    setOpen(false);
    setForm({ name: "", refers: "", resourceType: "KeyStore" });
    showSnackbar("Reference created");
    load();
  }

  async function handleDelete(id: string) {
    await referencesApi.remove(id);
    showSnackbar("Reference deleted");
    load();
  }

  return (
    <Box>
      <PageHeader
        title="References"
        subtitle="Indirect pointers to KeyStores, TrustStores, or JWKS used by security policies like VerifyJWT."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Create Reference
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Refers To</TableCell>
              <TableCell>Resource Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {refs.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                <TableCell>{r.refers}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.resourceType} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleDelete(r.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Reference</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Refers To" size="small" value={form.refers} onChange={(e) => setForm({ ...form, refers: e.target.value })} />
          <TextField select label="Resource Type" size="small" value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}>
            <MenuItem value="KeyStore">KeyStore</MenuItem>
            <MenuItem value="TrustStore">TrustStore</MenuItem>
            <MenuItem value="JWKS">JWKS</MenuItem>
          </TextField>
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
