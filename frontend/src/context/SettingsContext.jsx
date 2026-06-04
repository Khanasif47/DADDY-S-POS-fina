import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const SettingsCtx = createContext(null);

const DEFAULTS = {
  name: "DADDY's",
  full_name: "DADDY's Bakery",
  tagline: "Baked with Love, Made for You",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  facebook: "",
  maps_url: "",
  hours: "",
  established_year: 2014,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings({ ...DEFAULTS, ...data });
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsCtx.Provider value={{ settings, setSettings, refresh, loaded }}>
      {children}
    </SettingsCtx.Provider>
  );
};

export const useSettings = () => useContext(SettingsCtx);
