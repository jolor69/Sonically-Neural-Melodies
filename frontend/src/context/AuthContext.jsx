import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (e) {
      // 401 on /auth/me just means "not logged in" — expected for anonymous visitors
      if (e?.response?.status && e.response.status !== 401) {
        console.warn("Auth check failed:", e);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    // Backend sets httpOnly auth_token cookie (primary auth on deployed site).
    // We also mirror the JWT in localStorage as a fallback for same-origin dev setups
    // where third-party cookies may be blocked.
    if (res.data.token) localStorage.setItem("auth_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const signup = async (email, password, name) => {
    const res = await api.post("/auth/signup", { email, password, name });
    if (res.data.token) localStorage.setItem("auth_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { console.warn("Logout API failed:", e); }
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (e) {
      console.warn("Refresh /auth/me failed:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
