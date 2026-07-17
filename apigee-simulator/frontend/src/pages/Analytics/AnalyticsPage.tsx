import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, TextField, MenuItem } from "@mui/material";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import { analyticsApi, environmentsApi, proxiesApi } from "../../api/services";

const PIE_COLORS: Record<string, string> = { "2xx": "#1e8e3e", "3xx": "#4285f4", "4xx": "#f9ab00", "5xx": "#d93025" };

export default function AnalyticsPage() {
  const [range, setRange] = useState("24h");
  const [environmentName, setEnvironmentName] = useState("");
  const [proxyName, setProxyName] = useState("");
  const [envs, setEnvs] = useState<any[]>([]);
  const [proxies, setProxies] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    environmentsApi.list().then(setEnvs);
    proxiesApi.list().then(setProxies);
  }, []);

  useEffect(() => {
    analyticsApi.summary({ range, environmentName: environmentName || undefined, proxyName: proxyName || undefined }).then(setSummary);
  }, [range, environmentName, proxyName]);

  const pieData = summary ? Object.entries(summary.responseCodeBreakdown).map(([name, value]) => ({ name, value })) : [];
  const trend = summary
    ? summary.trafficTrend.map((t: any) => ({ ...t, time: new Date(t.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" }) }))
    : [];

  return (
    <Box>
      <PageHeader title="Analytics" subtitle="Request volume, response codes, latency, and top APIs across your simulated traffic." />

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField select label="Time Range" size="small" value={range} onChange={(e) => setRange(e.target.value)} sx={{ minWidth: 140 }}>
          {["1h", "24h", "7d", "30d"].map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Environment" size="small" value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All environments</MenuItem>
          {envs.map((e) => (
            <MenuItem key={e.id} value={e.name}>
              {e.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Proxy" size="small" value={proxyName} onChange={(e) => setProxyName(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All proxies</MenuItem>
          {proxies.map((p) => (
            <MenuItem key={p.id} value={p.name}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {summary && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Total Requests" value={summary.totalRequests} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Success Rate" value={summary.successRate} suffix="%" accent="#1e8e3e" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Error Rate" value={summary.errorRate} suffix="%" accent="#d93025" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Avg Latency" value={summary.avgLatencyMs} suffix="ms" accent="#f9ab00" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Traffic Trend
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#1a73e8" strokeWidth={2} dot={false} name="Requests" />
                    <Line type="monotone" dataKey="errors" stroke="#d93025" strokeWidth={2} dot={false} name="Errors" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Latency Trend
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgLatency" stroke="#673ab7" strokeWidth={2} dot={false} name="Avg Latency (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Response Codes
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[entry.name] || "#5f6368"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Top APIs
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={summary.topApis} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1a73e8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
