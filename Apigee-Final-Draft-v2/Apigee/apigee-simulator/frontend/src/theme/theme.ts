import { createTheme } from "@mui/material/styles";

// A Google Cloud Console / Apigee X inspired theme: white surfaces, a dark
// slate left nav, Google blue accents, and Google Sans / Roboto typography.
export const apigeeTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1a73e8", dark: "#174ea6", light: "#4285f4" },
    secondary: { main: "#673ab7" },
    success: { main: "#1e8e3e" },
    warning: { main: "#f9ab00" },
    error: { main: "#d93025" },
    background: { default: "#f6f8fc", paper: "#ffffff" },
    text: { primary: "#202124", secondary: "#5f6368" },
    divider: "#e0e3e7",
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500 },
    h2: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500 },
    h3: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500 },
    h4: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "1.5rem" },
    h5: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "1.25rem" },
    h6: { fontFamily: '"Google Sans", sans-serif', fontWeight: 500, fontSize: "1.05rem" },
    button: { textTransform: "none", fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiTableCell: {
      styleOverrides: { head: { fontWeight: 600, color: "#5f6368", background: "#f6f8fc" } },
    },
  },
});

export const NAV_BG = "#202b3d";
export const NAV_BG_SELECTED = "#28374f";
export const NAV_TEXT = "#d2d7e0";
