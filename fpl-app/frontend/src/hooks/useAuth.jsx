/**
 * useAuth — manages JWT token + user state across the app.
 * Token stored in localStorage. Exposes login, register, logout, updateProfile.
 */
import { useState, useEffect, useCallback, createContext, useContext } from "react";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

const AuthContext = createContext(null);

async function authReq(path, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function authGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function authPut(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { id, email, name, fpl_team_id }
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);   // checking localStorage on mount

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("offside_token");
    const savedUser  = localStorage.getItem("offside_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const saveSession = (tok, usr) => {
    setToken(tok);
    setUser(usr);
    localStorage.setItem("offside_token", tok);
    localStorage.setItem("offside_user",  JSON.stringify(usr));
  };

  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("offside_token");
    localStorage.removeItem("offside_user");
  };

  const register = useCallback(async (email, password, name) => {
    const data = await authReq("/auth/register", { email, password, name });
    saveSession(data.token, data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authReq("/auth/login", { email, password });
    saveSession(data.token, data.user);
    // Also fetch full profile (includes challenge history)
    try {
      const profile = await authGet("/user/profile", data.token);
      const merged  = { ...data.user, ...profile };
      saveSession(data.token, merged);
      return merged;
    } catch (_) {
      return data.user;
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!token) throw new Error("Not logged in");
    await authPut("/user/profile", updates, token);
    const newUser = { ...user, ...updates };
    setUser(newUser);
    localStorage.setItem("offside_user", JSON.stringify(newUser));
    return newUser;
  }, [token, user]);

  const saveChallengeResult = useCallback(async (gw, model_pts, user_pts, user_swaps = []) => {
    if (!token) return; // silently skip if not logged in
    try {
      await authReq("/user/challenge", { gw, model_pts, user_pts, user_swaps }, token);
    } catch (_) {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateProfile, saveChallengeResult }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}