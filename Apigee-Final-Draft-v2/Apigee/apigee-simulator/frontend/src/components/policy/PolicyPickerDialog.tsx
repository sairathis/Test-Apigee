import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, Box, TextField, Grid, Paper, Typography, Chip, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/GppGoodOutlined";
import SpeedIcon from "@mui/icons-material/SpeedOutlined";
import BuildIcon from "@mui/icons-material/BuildOutlined";
import TransformIcon from "@mui/icons-material/TransformOutlined";
import ExtensionIcon from "@mui/icons-material/ExtensionOutlined";
import { POLICY_CATALOG, POLICY_CATEGORIES, PolicyTypeDef } from "../../data/policyCatalog";

const CATEGORY_ICON: Record<string, JSX.Element> = {
  Security: <SecurityIcon fontSize="small" />,
  "Traffic Management": <SpeedIcon fontSize="small" />,
  Mediation: <BuildIcon fontSize="small" />,
  Transformation: <TransformIcon fontSize="small" />,
  Extension: <ExtensionIcon fontSize="small" />,
};

export default function PolicyPickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (def: PolicyTypeDef) => void }) {
  const [search, setSearch] = useState("");

  const filtered = POLICY_CATALOG.filter((p) => p.type.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Policy</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        {POLICY_CATEGORIES.map((category) => {
          const items = filtered.filter((p) => p.category === category);
          if (items.length === 0) return null;
          return (
            <Box key={category} sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
                {CATEGORY_ICON[category]} {category}
              </Typography>
              <Grid container spacing={1.5}>
                {items.map((p) => (
                  <Grid item xs={12} sm={6} md={4} key={p.type}>
                    <Paper
                      variant="outlined"
                      onClick={() => onPick(p)}
                      sx={{ p: 1.5, cursor: "pointer", height: "100%", borderRadius: 2, "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" } }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {p.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}
        {filtered.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No policies match "{search}"
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
