import { Snackbar, Alert } from "@mui/material";
import AppRoutes from "./routes/AppRoutes";
import { useUiStore } from "./store/uiStore";

export default function App() {
  const { snackbar, closeSnackbar } = useUiStore();
  return (
    <>
      <AppRoutes />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
