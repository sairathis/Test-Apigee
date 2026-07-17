import { useEffect, useState } from "react";
import { AppBar, Toolbar, Typography, Box, Select, MenuItem, IconButton, Menu, Avatar, Divider, ListItemIcon } from "@mui/material";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import PersonIcon from "@mui/icons-material/PersonOutline";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { environmentsApi } from "../api/services";

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { selectedEnvironment, setSelectedEnvironment } = useUiStore();
  const [envs, setEnvs] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    environmentsApi.list().then(setEnvs).catch(() => setEnvs([]));
  }, []);

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Organization: <b>apigee-sim-org</b>
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Environment
        </Typography>
        <Select size="small" value={selectedEnvironment} onChange={(e) => setSelectedEnvironment(e.target.value)} sx={{ minWidth: 120 }}>
          {(envs.length ? envs : [{ name: "dev" }, { name: "test" }, { name: "prod" }]).map((e) => (
            <MenuItem key={e.name} value={e.name}>
              {e.name}
            </MenuItem>
          ))}
        </Select>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>{user?.name?.[0] || "U"}</Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => navigate("/settings")}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
