import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem("apigee_sim_token");
const storedUser = localStorage.getItem("apigee_sim_user");

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: Boolean(storedToken),
  login: (token, user) => {
    localStorage.setItem("apigee_sim_token", token);
    localStorage.setItem("apigee_sim_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("apigee_sim_token");
    localStorage.removeItem("apigee_sim_user");
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
