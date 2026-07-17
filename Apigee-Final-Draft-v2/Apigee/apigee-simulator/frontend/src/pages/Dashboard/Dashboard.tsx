import { useEffect, useState } from "react";
import { Grid, Box, Typography, Paper } from "@mui/material";
import ApiIcon from "@mui/icons-material/AccountTreeOutlined";
import CategoryIcon from "@mui/icons-material/CategoryOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import AppsIcon from "@mui/icons-material/AppsOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHorizOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SpeedIcon from "@mui/icons-material/SpeedOutlined";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { dashboardApi, analyticsApi } from "../../api/services";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    dashboardApi.get().then(setStats).catch(() => setStats(null));
    analyticsApi
      .summary({ range: "24h" })
      .then((d) => setTrend(d.trafficTrend.map((t: any) => ({ ...t, time: new Date(t.time).toLocaleTimeString([], { hour: "2-digit" }) }))))
      .catch(() => setTrend([]));
  }, []);

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Overview of your simulated Apigee organization" />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total APIs" value={stats?.totalProxies ?? "—"} icon={<ApiIcon fontSize="small" />} accent="#1a73e8" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Products" value={stats?.totalProducts ?? "—"} icon={<CategoryIcon fontSize="small" />} accent="#673ab7" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Developers" value={stats?.totalDevelopers ?? "—"} icon={<PeopleIcon fontSize="small" />} accent="#f9ab00" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Apps" value={stats?.totalApps ?? "—"} icon={<AppsIcon fontSize="small" />} accent="#1e8e3e" />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Total Requests (24h)" value={stats?.totalRequests24h ?? "—"} icon={<SwapHorizIcon fontSize="small" />} accent="#1a73e8" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Success Rate" value={stats?.successRate ?? "—"} suffix="%" icon={<CheckCircleIcon fontSize="small" />} accent="#1e8e3e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Error Rate" value={stats?.errorRate ?? "—"} suffix="%" icon={<ErrorIcon fontSize="small" />} accent="#d93025" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Avg Response Time" value={stats?.avgResponseTimeMs ?? "—"} suffix="ms" icon={<SpeedIcon fontSize="small" />} accent="#f9ab00" />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Traffic trend (last 24h)
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#1a73e8" strokeWidth={2} dot={false} name="Requests" />
            <Line type="monotone" dataKey="errors" stroke="#d93025" strokeWidth={2} dot={false} name="Errors" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
