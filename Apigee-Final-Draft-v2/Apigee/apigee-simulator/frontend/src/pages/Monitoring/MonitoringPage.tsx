import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { monitoringApi } from "../../api/services";
import { useUiStore } from "../../store/uiStore";

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info"> = { critical: "error", warning: "warning", info: "info" };

export default function MonitoringPage() {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ proxyName: "OrderService-v1", metric: "error_rate", value: 25, threshold: 5, severity: "critical" });
  const showSnackbar = useUiStore((s) => s.showSnackbar);

  function load() {
    monitoringApi.get().then(setData);
  }
  useEffect(load, []);

  async function handleSimulate() {
    await monitoringApi.simulateAlert(form);
    setOpen(false);
    showSnackbar("Alert simulated");
    load();
  }

  async function handleResolve(id: string) {
    await monitoringApi.resolveAlert(id);
    showSnackbar("Alert resolved");
    load();
  }

  if (!data) return null;

  return (
    <Box>
      <PageHeader
        title="Monitoring"
        subtitle="API Monitoring: availability, latency, error rate, and traffic volume over the last hour."
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Simulate Alert
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Availability" value={data.availability} suffix="%" accent="#1e8e3e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Response Time" value={data.avgLatencyMs} suffix="ms" accent="#f9ab00" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Error Rate" value={data.errorRate} suffix="%" accent="#d93025" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Traffic Volume" value={data.trafficVolume} accent="#1a73e8" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Per-proxy health (last hour)
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Proxy</TableCell>
                  <TableCell>Traffic</TableCell>
                  <TableCell>Availability</TableCell>
                  <TableCell>Error Rate</TableCell>
                  <TableCell>Avg Latency</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.perProxy.map((p: any) => (
                  <TableRow key={p.proxyName}>
                    <TableCell sx={{ fontWeight: 600 }}>{p.proxyName}</TableCell>
                    <TableCell>{p.traffic}</TableCell>
                    <TableCell>{p.availability}%</TableCell>
                    <TableCell>{p.errorRate}%</TableCell>
                    <TableCell>{p.avgLatencyMs}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Alerts
              </Typography>
            </Box>
            <Table size="small">
              <TableBody>
                {data.alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Chip size="small" label={a.severity} color={SEVERITY_COLOR[a.severity]} sx={{ mr: 1 }} />
                      <Typography variant="caption">{a.message}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {!a.resolved ? (
                        <Button size="small" onClick={() => handleResolve(a.id)}>
                          Resolve
                        </Button>
                      ) : (
                        <Chip size="small" variant="outlined" label="Resolved" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Simulate an Alert</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField label="Proxy Name" size="small" value={form.proxyName} onChange={(e) => setForm({ ...form, proxyName: e.target.value })} />
          <TextField select label="Metric" size="small" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })}>
            <MenuItem value="availability">availability</MenuItem>
            <MenuItem value="latency">latency</MenuItem>
            <MenuItem value="error_rate">error_rate</MenuItem>
            <MenuItem value="traffic">traffic</MenuItem>
          </TextField>
          <TextField label="Value" type="number" size="small" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <TextField label="Threshold" type="number" size="small" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
          <TextField select label="Severity" size="small" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <MenuItem value="info">info</MenuItem>
            <MenuItem value="warning">warning</MenuItem>
            <MenuItem value="critical">critical</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSimulate}>
            Simulate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
