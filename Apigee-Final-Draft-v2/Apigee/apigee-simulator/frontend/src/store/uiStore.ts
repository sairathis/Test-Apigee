import { create } from "zustand";

interface UiState {
  selectedEnvironment: string;
  setSelectedEnvironment: (env: string) => void;
  snackbar: { open: boolean; message: string; severity: "success" | "error" | "info" | "warning" };
  showSnackbar: (message: string, severity?: "success" | "error" | "info" | "warning") => void;
  closeSnackbar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedEnvironment: "test",
  setSelectedEnvironment: (env) => set({ selectedEnvironment: env }),
  snackbar: { open: false, message: "", severity: "success" },
  showSnackbar: (message, severity = "success") => set({ snackbar: { open: true, message, severity } }),
  closeSnackbar: () => set((s) => ({ snackbar: { ...s.snackbar, open: false } })),
}));
