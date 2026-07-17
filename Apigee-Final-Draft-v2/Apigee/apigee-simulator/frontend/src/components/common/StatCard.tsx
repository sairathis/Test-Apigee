import { Paper, Box, Typography } from "@mui/material";
import { ReactNode } from "react";

export default function StatCard({ label, value, icon, accent = "#1a73e8", suffix }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string; suffix?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        {icon && (
          <Box sx={{ width: 34, height: 34, borderRadius: "8px", bgcolor: `${accent}1a`, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </Box>
        )}
      </Box>
      <Typography variant="h4" fontWeight={600}>
        {value}
        {suffix && (
          <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.5 }}>
            {suffix}
          </Typography>
        )}
      </Typography>
    </Paper>
  );
}
