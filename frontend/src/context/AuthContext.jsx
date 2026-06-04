import { createContext, useContext, useEffect, useState } from "react";
import { api, setBearer, formatErr } from "../lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  // null = checking, false = unauthenticated, object = user
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((r) => mounted && setUser(r.data))
      .catch(() => mounted && setUser(false));
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.access_token) setBearer(data.access_token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatErr(e) };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setBearer(null);
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
