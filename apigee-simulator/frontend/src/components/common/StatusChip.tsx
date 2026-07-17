import { Chip } from "@mui/material";

const COLOR_MAP: Record<string, "success" | "default" | "error" | "warning" | "info"> = {
  deployed: "success",
  active: "success",
  approved: "success",
  success: "success",
  ok: "success",
  undeployed: "default",
  inactive: "default",
  revoked: "error",
  error: "error",
  failed: "error",
  pending: "warning",
  warning: "warning",
  skipped: "info",
  info: "info",
};

export default function StatusChip({ status }: { status: string }) {
  const color = COLOR_MAP[status?.toLowerCase()] || "default";
  return <Chip size="small" label={status} color={color} variant={color === "default" ? "outlined" : "filled"} sx={{ textTransform: "capitalize", fontWeight: 600 }} />;
}
