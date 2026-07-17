import { Box, Paper, Typography, Grid, Divider, Chip } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import { useAuthStore } from "../../store/authStore";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Local account and simulator information." />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Account
            </Typography>
            <Typography variant="body2">
              <b>Name:</b> {user?.name}
            </Typography>
            <Typography variant="body2">
              <b>Email:</b> {user?.email}
            </Typography>
            <Typography variant="body2">
              <b>Role:</b> {user?.role}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              About this simulator
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              This is a self-contained Apigee X / Edge concept simulator built for interview practice. All entities (proxies, policies, products, developers, apps, KVMs, deployments, analytics) are modeled locally with SQLite + Prisma - no real Apigee account required.
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Chip size="small" label="React + TypeScript + MUI" sx={{ mr: 1, mb: 1 }} />
            <Chip size="small" label="Node + Express + Prisma" sx={{ mr: 1, mb: 1 }} />
            <Chip size="small" label="SQLite" sx={{ mr: 1, mb: 1 }} />
            <Chip size="small" label="Local auth only" sx={{ mr: 1, mb: 1 }} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
