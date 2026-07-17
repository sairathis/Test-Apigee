import { useState } from "react";
import { Box, Paper, TextField, Button, Typography, Alert, Tabs, Tab } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/services";
import { useAuthStore } from "../../store/authStore";

export default function Login() {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState("admin@apigee-sim.local");
  const [password, setPassword] = useState("Apigee123!");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = tab === 0 ? await authApi.login(email, password) : await authApi.register(email, password, name);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ height: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f6f8fc" }}>
      <Paper elevation={0} sx={{ width: 420, p: 4, border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: "#4285f4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>A</Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
              Apigee X Simulator
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Local login only - practice environment
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Sign in" />
          <Tab label="Create account" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 1 && <TextField label="Full name" fullWidth size="small" sx={{ mb: 2 }} value={name} onChange={(e) => setName(e.target.value)} required />}
          <TextField label="Email" type="email" fullWidth size="small" sx={{ mb: 2 }} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" fullWidth size="small" sx={{ mb: 2 }} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.1 }}>
            {tab === 0 ? "Sign in" : "Create account"}
          </Button>
        </form>

        {tab === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            Seeded demo login: admin@apigee-sim.local / Apigee123!
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
