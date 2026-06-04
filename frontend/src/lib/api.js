import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Bearer fallback (some browsers may not send 3rd-party cookies during preview)
let bearer = null;
export const setBearer = (token) => {
  bearer = token;
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
};
export const getBearer = () => bearer || localStorage.getItem("access_token");

api.interceptors.request.use((config) => {
  const t = getBearer();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const formatErr = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((x) => (x?.msg ? x.msg : JSON.stringify(x))).join(" ");
  return JSON.stringify(d);
};

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );
