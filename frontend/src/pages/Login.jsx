import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export default function Login() {
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user.id) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) nav("/");
    else setError(r.error || "Login failed");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2" style={{ background: "#ede7c7" }}>
      <div
        className="hidden lg:flex relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(44,27,24,0.55), rgba(44,27,24,0.65)), url(https://images.unsplash.com/photo-1555507036-ab1d4075c6f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1536&q=80)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div
            className="text-xs tracking-[0.25em] uppercase mb-3"
            style={{ color: "#ede7c7" }}
          >
            Crafted with Love & Passion
          </div>
          <div className="font-serif-display text-6xl leading-[1.05]">
            Baked with love.
            <br />
            Made for you.
          </div>
          <div className="mt-6 text-sm" style={{ color: "rgba(237,231,199,0.8)" }}>
            DADDY's Bakery · Established 2018 · Virar, Maharashtra
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8" data-testid="login-screen">
        <form
          onSubmit={submit}
          className="w-full max-w-md card-luxe p-10 fade-up"
          data-testid="login-form"
        >
          <div className="flex justify-center mb-4">
            <img
              src="/daddys-logo.png"
              alt={settings.full_name}
              className="w-28 h-28 object-contain"
              draggable="false"
            />
          </div>
          <div className="label-eyebrow text-center">Owner Terminal</div>
          <h1 className="font-serif-display text-3xl mt-2 mb-1 text-center" style={{ color: "#2c1b18" }}>
            {settings.full_name || "DADDY's Bakery"}
          </h1>
          <p className="text-sm text-[#5a3a31] mb-7 text-center italic">
            {settings.tagline}
          </p>

          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5a3a31] mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input"
            className="w-full px-4 py-3 mb-5 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000] focus:border-[#8B0000]"
            required
          />

          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5a3a31] mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input"
            className="w-full px-4 py-3 mb-6 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000] focus:border-[#8B0000]"
            required
          />

          {error && (
            <div
              className="mb-4 text-sm text-[#8B0000] bg-[rgba(139,0,0,0.06)] px-3 py-2 rounded-sm"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit-button"
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Access Terminal"}
          </button>

        </form>
      </div>
    </div>
  );
}
