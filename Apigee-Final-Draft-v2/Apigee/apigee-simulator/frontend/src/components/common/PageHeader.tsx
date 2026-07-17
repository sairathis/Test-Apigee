import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { ReactNode } from "react";

export default function PageHeader({ title, subtitle, breadcrumbs, actions }: { title: string; subtitle?: string; breadcrumbs?: string[]; actions?: ReactNode }) {
  return (
    <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
      <Box>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 0.5 }}>
            {breadcrumbs.map((b, i) => (
              <Link key={i} underline="hover" color="text.secondary" variant="caption">
                {b}
              </Link>
            ))}
          </Breadcrumbs>
        )}
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}
