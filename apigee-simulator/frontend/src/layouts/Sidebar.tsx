import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import ApiIcon from "@mui/icons-material/AccountTreeOutlined";
import LayersIcon from "@mui/icons-material/LayersOutlined";
import ProductIcon from "@mui/icons-material/CategoryOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutlined";
import AppsIcon from "@mui/icons-material/AppsOutlined";
import CloudIcon from "@mui/icons-material/CloudOutlined";
import DnsIcon from "@mui/icons-material/DnsOutlined";
import KeyIcon from "@mui/icons-material/VpnKeyOutlined";
import BookmarkIcon from "@mui/icons-material/BookmarksOutlined";
import HookIcon from "@mui/icons-material/LinkOutlined";
import RocketIcon from "@mui/icons-material/RocketLaunchOutlined";
import TimelineIcon from "@mui/icons-material/TimelineOutlined";
import BarChartIcon from "@mui/icons-material/BarChartOutlined";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeartOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import GroupWorkIcon from "@mui/icons-material/GroupWorkOutlined";
import { NAV_BG, NAV_BG_SELECTED, NAV_TEXT } from "../theme/theme";

interface NavItem {
  label: string;
  path: string;
  icon: JSX.Element;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { items: [{ label: "Dashboard", path: "/dashboard", icon: <DashboardIcon fontSize="small" /> }] },
  {
    title: "Develop",
    items: [
      { label: "API Proxies", path: "/proxies", icon: <ApiIcon fontSize="small" /> },
      { label: "Shared Flows", path: "/shared-flows", icon: <LayersIcon fontSize="small" /> },
    ],
  },
  {
    title: "Publish",
    items: [
      { label: "API Products", path: "/products", icon: <ProductIcon fontSize="small" /> },
      { label: "Developers", path: "/developers", icon: <PeopleIcon fontSize="small" /> },
      { label: "Apps", path: "/apps", icon: <AppsIcon fontSize="small" /> },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Environments", path: "/environments", icon: <CloudIcon fontSize="small" /> },
      { label: "Environment Groups", path: "/environment-groups", icon: <GroupWorkIcon fontSize="small" /> },
      { label: "Target Servers", path: "/target-servers", icon: <DnsIcon fontSize="small" /> },
      { label: "KVM", path: "/kvm", icon: <KeyIcon fontSize="small" /> },
      { label: "References", path: "/references", icon: <BookmarkIcon fontSize="small" /> },
      { label: "Flow Hooks", path: "/flow-hooks", icon: <HookIcon fontSize="small" /> },
    ],
  },
  {
    title: "Runtime",
    items: [
      { label: "Deployments", path: "/deployments", icon: <RocketIcon fontSize="small" /> },
      { label: "Trace", path: "/trace", icon: <TimelineIcon fontSize="small" /> },
      { label: "Analytics", path: "/analytics", icon: <BarChartIcon fontSize="small" /> },
      { label: "Monitoring", path: "/monitoring", icon: <MonitorHeartIcon fontSize="small" /> },
    ],
  },
  { items: [{ label: "Settings", path: "/settings", icon: <SettingsIcon fontSize="small" /> }] },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ width: 248, minWidth: 248, height: "100vh", bgcolor: NAV_BG, color: NAV_TEXT, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <Box sx={{ px: 2.5, py: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: "6px", bgcolor: "#4285f4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 14 }}>A</Box>
        <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 600, letterSpacing: 0.2 }}>
          Apigee X Simulator
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <Box sx={{ flex: 1, py: 1 }}>
        {SECTIONS.map((section, idx) => (
          <Box key={idx} sx={{ mb: 0.5 }}>
            {section.title && (
              <Typography variant="caption" sx={{ px: 2.5, pt: 2, pb: 0.5, display: "block", color: "rgba(210,215,224,0.55)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", fontSize: 11 }}>
                {section.title}
              </Typography>
            )}
            <List dense disablePadding>
              {section.items.map((item) => {
                const selected = location.pathname.startsWith(item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    selected={selected}
                    onClick={() => navigate(item.path)}
                    sx={{
                      mx: 1,
                      borderRadius: 1.5,
                      color: selected ? "#fff" : NAV_TEXT,
                      bgcolor: selected ? NAV_BG_SELECTED : "transparent",
                      "&:hover": { bgcolor: NAV_BG_SELECTED },
                      "&.Mui-selected": { bgcolor: NAV_BG_SELECTED },
                      "&.Mui-selected:hover": { bgcolor: NAV_BG_SELECTED },
                      mb: 0.25,
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>{item.icon}</ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: selected ? 600 : 400 }} primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
