import { useEffect, useState } from "react";
import { api, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { useSettings } from "../context/SettingsContext";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  Mail,
  Instagram,
  Facebook,
  MapPin,
  Clock,
  Calendar,
  Lock,
  ShieldCheck,
} from "lucide-react";

const Field = ({ label, icon: Icon, children, hint }) => (
  <div>
    <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#5a3a31] mb-1.5">
      {Icon && <Icon size={12} className="text-[#8B0000]" />} {label}
    </label>
    {children}
    {hint && <div className="mt-1 text-[11px] text-[#5a3a31]/70">{hint}</div>}
  </div>
);

export default function Settings() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" });
  const [savingCreds, setSavingCreds] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const onChange = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, established_year: Number(form.established_year || 2014) };
      await api.put("/settings", body);
      await refresh();
      toast.success("Bakery details saved · website will update too");
    } catch (e) {
      toast.error(formatErr(e));
    } finally {
      setSaving(false);
    }
  };

  const saveCreds = async () => {
    if (!creds.currentPassword) { toast.error("Enter your current password"); return; }
    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) {
      toast.error("New passwords do not match"); return;
    }
    if (creds.newPassword && creds.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters"); return;
    }
    if (!creds.newEmail && !creds.newPassword) { toast.error("Provide a new email or password"); return; }
    setSavingCreds(true);
    try {
      await api.post("/auth/change-credentials", {
        current_password: creds.currentPassword,
        new_email: creds.newEmail || undefined,
        new_password: creds.newPassword || undefined,
      });
      toast.success("Credentials updated — please log in again");
      setCreds({ currentPassword: "", newEmail: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      toast.error(formatErr(e));
    } finally {
      setSavingCreds(false);
    }
  };

  return (
    <div className="p-8 lg:p-12" data-testid="settings-page">
      <PageHeader
        eyebrow="Brand · Contact · Locale"
        title="Bakery Settings"
        subtitle="Edit once — these details appear on the POS, the website footer/contact, and on every WhatsApp message you send out."
        right={
          <button
            onClick={save}
            disabled={saving}
            data-testid="save-settings-button"
            className="btn-primary"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-luxe p-6 lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Brand mark (short)">
              <input
                data-testid="settings-name-input"
                value={form.name || ""}
                onChange={onChange("name")}
                className="form-input"
              />
            </Field>
            <Field label="Full name">
              <input
                value={form.full_name || ""}
                onChange={onChange("full_name")}
                className="form-input"
              />
            </Field>
          </div>

          <Field label="Tagline">
            <input
              data-testid="settings-tagline-input"
              value={form.tagline || ""}
              onChange={onChange("tagline")}
              className="form-input"
            />
          </Field>

          <Field label="Address" icon={MapPin}>
            <textarea
              data-testid="settings-address-input"
              value={form.address || ""}
              onChange={onChange("address")}
              rows={2}
              className="form-input"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Phone (call line)" icon={Phone}>
              <input
                value={form.phone || ""}
                onChange={onChange("phone")}
                className="form-input"
                placeholder="+91 …"
              />
            </Field>
            <Field
              label="WhatsApp (with country code)"
              icon={MessageCircle}
              hint="Used for new-order WhatsApp button on every online order."
            >
              <input
                data-testid="settings-whatsapp-input"
                value={form.whatsapp || ""}
                onChange={onChange("whatsapp")}
                className="form-input"
                placeholder="+91 99195 20765"
              />
            </Field>
          </div>

          <Field label="Email" icon={Mail}>
            <input
              value={form.email || ""}
              onChange={onChange("email")}
              className="form-input"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Instagram URL" icon={Instagram}>
              <input
                value={form.instagram || ""}
                onChange={onChange("instagram")}
                className="form-input"
                placeholder="https://instagram.com/…"
              />
            </Field>
            <Field label="Facebook URL" icon={Facebook}>
              <input
                value={form.facebook || ""}
                onChange={onChange("facebook")}
                className="form-input"
                placeholder="optional"
              />
            </Field>
          </div>

          <Field label="Google Maps share link" icon={MapPin}>
            <input
              value={form.maps_url || ""}
              onChange={onChange("maps_url")}
              className="form-input"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Operating hours" icon={Clock}>
              <input
                value={form.hours || ""}
                onChange={onChange("hours")}
                className="form-input"
              />
            </Field>
            <Field label="Established year" icon={Calendar}>
              <input
                type="number"
                value={form.established_year || 2014}
                onChange={onChange("established_year")}
                className="form-input"
              />
            </Field>
          </div>
        </div>

        <aside className="card-luxe p-6 self-start">
          <div className="label-eyebrow">Live Preview</div>
          <h3 className="font-serif-display text-3xl mt-2 mb-4" style={{ color: "#2c1b18" }}>
            {form.full_name || "DADDY's Bakery"}
          </h3>
          <div className="text-sm text-[#5a3a31] italic mb-5">{form.tagline}</div>
          <div className="space-y-3 text-sm">
            <Row icon={MapPin} v={form.address} />
            <Row icon={Phone} v={form.phone} />
            <Row icon={MessageCircle} v={form.whatsapp} />
            <Row icon={Mail} v={form.email} />
            <Row icon={Instagram} v={form.instagram} />
            <Row icon={Clock} v={form.hours} />
            <Row icon={Calendar} v={`Est. ${form.established_year}`} />
          </div>
          <div className="divider-thin my-5" />
          <div className="text-xs text-[#5a3a31]">
            Saving instantly updates the POS sidebar, login screen, receipts, online-order WhatsApp messages, and the public website's contact section.
          </div>
        </aside>
      </div>


      {/* ── Credentials Card ── */}
      <div className="card-luxe p-6 mt-6" data-testid="credentials-section">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-[#8B0000]" />
          <span className="label-eyebrow">Access Credentials</span>
        </div>
        <p className="text-sm text-[#5a3a31] mb-5">
          Change the email address or password used to log into this POS terminal. You must enter your <strong>current password</strong> to save any change.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Field label="Current password" icon={Lock}>
            <input
              type="password"
              value={creds.currentPassword}
              onChange={(e) => setCreds((c) => ({ ...c, currentPassword: e.target.value }))}
              className="form-input"
              placeholder="Required to make changes"
              data-testid="current-password-input"
            />
          </Field>
          <Field label="New email (leave blank to keep current)" icon={Mail}>
            <input
              type="email"
              value={creds.newEmail}
              onChange={(e) => setCreds((c) => ({ ...c, newEmail: e.target.value }))}
              className="form-input"
              placeholder="new@email.com"
              data-testid="new-email-input"
            />
          </Field>
          <Field label="New password (min 8 chars)" icon={ShieldCheck}>
            <input
              type="password"
              value={creds.newPassword}
              onChange={(e) => setCreds((c) => ({ ...c, newPassword: e.target.value }))}
              className="form-input"
              placeholder="Leave blank to keep current"
              data-testid="new-password-input"
            />
          </Field>
          {creds.newPassword && (
            <Field label="Confirm new password">
              <input
                type="password"
                value={creds.confirmPassword}
                onChange={(e) => setCreds((c) => ({ ...c, confirmPassword: e.target.value }))}
                className="form-input"
                placeholder="Re-enter new password"
                data-testid="confirm-password-input"
              />
            </Field>
          )}
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={saveCreds}
            disabled={savingCreds}
            data-testid="save-credentials-button"
            className="btn-primary disabled:opacity-60"
          >
            {savingCreds ? "Saving…" : "Update credentials"}
          </button>
          <span className="text-xs text-[#5a3a31]">
            After saving, you'll be logged out and must sign in with the new credentials.
          </span>
        </div>
      </div>

      <style>{`.form-input{width:100%;padding:.55rem .75rem;background:#fff;border:1px solid rgba(139,0,0,.2);border-radius:4px;font-size:.9rem;outline:none;font-family:'Manrope',sans-serif}.form-input:focus{border-color:#8B0000;box-shadow:0 0 0 1px #8B0000}`}</style>
    </div>
  );
}

const Row = ({ icon: Icon, v }) =>
  v ? (
    <div className="flex items-start gap-2.5 text-[#2c1b18]">
      <Icon size={14} className="mt-0.5 text-[#8B0000] shrink-0" />
      <span className="break-words">{v}</span>
    </div>
  ) : null;
