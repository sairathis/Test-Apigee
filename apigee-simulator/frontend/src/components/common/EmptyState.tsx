import { Box, Typography, Button } from "@mui/material";
import { ReactNode } from "react";

export default function EmptyState({ icon, title, description, actionLabel, onAction }: { icon?: ReactNode; title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Box sx={{ textAlign: "center", py: 8, px: 3, border: "1px dashed", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      {icon && (
        <Box sx={{ mb: 2, color: "text.disabled", "& svg": { fontSize: 48 } }}>{icon}</Box>
      )}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: "auto" }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
