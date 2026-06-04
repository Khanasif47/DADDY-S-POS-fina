import { useEffect, useRef, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { useSettings } from "../context/SettingsContext";
import { ChevronRight, Send, X, MessageCircle, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { key: "new", label: "New" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "dispatched", label: "Dispatched" },
  { key: "completed", label: "Completed" },
];

const NEXT = {
  new: "preparing",
  preparing: "ready",
  ready: "dispatched",
  dispatched: "completed",
};

// strip non-digits for wa.me links
const waNumber = (s) => (s || "").replace(/[^0-9]/g, "");

const buildOwnerMessage = (o, settings) => {
  const lines = [
    `🛎️ NEW ORDER · ${settings.full_name || "DADDY's Bakery"}`,
    "",
    `Customer: ${o.customer_name}`,
    `Phone: ${o.phone || "—"}`,
    `Type: ${o.order_type.toUpperCase()}`,
    `Payment: ${o.payment.toUpperCase()}`,
    "",
    "Items:",
    ...o.items.map((i) => `• ${i.qty} × ${i.name}  — ₹${i.price * i.qty}`),
    "",
    `Subtotal: ₹${o.subtotal}`,
    `GST (5%): ₹${o.gst}`,
    `TOTAL: ₹${o.total}`,
    o.address ? `\nDeliver to:\n${o.address}` : "",
    o.instructions ? `\nNotes: ${o.instructions}` : "",
  ];
  return lines.filter(Boolean).join("\n");
};

const buildCustomerMessage = (o, settings) =>
  `Hi ${o.customer_name}, this is ${settings.full_name || "DADDY's Bakery"}. ` +
  `We've received your order of ₹${o.total} and we're starting on it now. ` +
  `We'll update you when it's ${o.order_type === "delivery" ? "out for delivery" : "ready"}. 🎂`;

export default function OnlineOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [notify, setNotify] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("notify_orders") !== "off"
  );
  const seenRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const make = (freq, t0, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t0);
        o.stop(ctx.currentTime + t0 + dur);
      };
      make(880, 0, 0.18);
      make(1320, 0.12, 0.22);
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    try {
      const r = await api.get("/online-orders");
      const arr = r.data;
      // Detect new "new"-status orders since last poll
      if (!firstLoadRef.current) {
        const newcomers = arr.filter(
          (o) => o.status === "new" && !seenRef.current.has(o.id)
        );
        if (newcomers.length && notify) {
          playChime();
          newcomers.forEach((o) => {
            toast.success(`🛎️ New order · ${o.customer_name} · ${inr(o.total)}`, {
              duration: 5000,
            });
            try {
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification(
                  `New order · ${settings.full_name || "DADDY's Bakery"}`,
                  {
                    body: `${o.customer_name} · ${inr(o.total)} · ${o.order_type}`,
                    icon: "/daddys-logo.png",
                  }
                );
              }
            } catch {
              /* ignore */
            }
          });
        }
      }
      arr.forEach((o) => seenRef.current.add(o.id));
      firstLoadRef.current = false;
      setOrders(arr);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  const enableNotifications = async () => {
    try {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Browser notifications were blocked");
          return;
        }
      }
      localStorage.setItem("notify_orders", "on");
      setNotify(true);
      toast.success("Notifications enabled · you'll get a chime + popup on new orders");
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const disableNotifications = () => {
    localStorage.setItem("notify_orders", "off");
    setNotify(false);
    toast.success("Notifications muted");
  };

  const advance = async (o) => {
    const next = NEXT[o.status];
    if (!next) return;
    try {
      await api.put(`/online-orders/${o.id}/status`, { status: next });
      toast.success(`Moved to ${next}`);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const reject = async (o) => {
    try {
      await api.put(`/online-orders/${o.id}/status`, { status: "rejected" });
      toast.success("Order rejected");
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const pushPos = async (o) => {
    try {
      await api.post(`/online-orders/${o.id}/push-to-pos`);
      toast.success("Pushed to POS as a sale");
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  // WhatsApp click-to-open links
  const waToOwner = (o) => {
    const num = waNumber(settings.whatsapp);
    if (!num) {
      toast.error("Add your WhatsApp number in Bakery Settings first.");
      return;
    }
    const url = `https://wa.me/${num}?text=${encodeURIComponent(buildOwnerMessage(o, settings))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const waToCustomer = (o) => {
    const num = waNumber(o.phone);
    if (!num) {
      toast.error("This order has no customer phone number.");
      return;
    }
    const url = `https://wa.me/${num}?text=${encodeURIComponent(buildCustomerMessage(o, settings))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-8 lg:p-12" data-testid="online-orders-page">
      <PageHeader
        eyebrow="From the Website"
        title="Online Orders"
        subtitle={`Live pipeline of orders coming in from ${settings.email ? settings.email.split("@")[1] : "the website"}.`}
        right={
          notify ? (
            <button
              onClick={disableNotifications}
              data-testid="notifications-toggle"
              className="btn-outline flex items-center gap-2"
            >
              <Bell size={14} /> Notifications on
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              data-testid="notifications-toggle"
              className="btn-primary flex items-center gap-2"
            >
              <BellOff size={14} /> Enable order alerts
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.key);
          return (
            <div
              key={col.key}
              className="card-luxe p-4 min-h-[200px]"
              data-testid={`kanban-col-${col.key}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="label-eyebrow">{col.label}</div>
                <span className="text-xs text-[#5a3a31] bg-[#f5f2e6] px-2 py-0.5 rounded-sm font-semibold">
                  {list.length}
                </span>
              </div>
              <div className="space-y-3">
                {list.map((o) => (
                  <div
                    key={o.id}
                    data-testid={`order-card-${o.id}`}
                    className="bg-[#f5f2e6] border border-[rgba(139,0,0,0.1)] p-3 rounded-sm fade-up"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-[#2c1b18]">{o.customer_name}</div>
                        <div className="text-xs text-[#5a3a31] capitalize">
                          {o.order_type} · {o.payment.toUpperCase()}
                        </div>
                      </div>
                      <div className="font-serif-display text-lg" style={{ color: "#8B0000" }}>
                        {inr(o.total)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-[#5a3a31] space-y-0.5">
                      {o.items.map((i, idx) => (
                        <div key={idx}>
                          {i.qty} × {i.name}
                        </div>
                      ))}
                    </div>
                    {o.address && (
                      <div className="mt-2 text-[11px] text-[#5a3a31] italic">📍 {o.address}</div>
                    )}
                    {o.instructions && (
                      <div className="mt-1 text-[11px] text-[#5a3a31] italic">📝 {o.instructions}</div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.status !== "completed" && o.status !== "rejected" && NEXT[o.status] && (
                        <button
                          onClick={() => advance(o)}
                          data-testid={`advance-${o.id}`}
                          className="text-xs px-2.5 py-1 bg-[#8B0000] text-white rounded-sm hover:bg-[#6a0000] flex items-center gap-1"
                        >
                          {NEXT[o.status]} <ChevronRight size={12} />
                        </button>
                      )}
                      {o.status === "new" && (
                        <button
                          onClick={() => reject(o)}
                          data-testid={`reject-${o.id}`}
                          className="text-xs px-2.5 py-1 border border-[#8B0000] text-[#8B0000] rounded-sm hover:bg-[rgba(139,0,0,0.06)] flex items-center gap-1"
                        >
                          <X size={12} /> Reject
                        </button>
                      )}
                      <button
                        onClick={() => waToOwner(o)}
                        data-testid={`wa-owner-${o.id}`}
                        title="Open in WhatsApp on your phone (forward order to yourself / staff)"
                        className="text-xs px-2.5 py-1 rounded-sm flex items-center gap-1 text-white hover:opacity-90"
                        style={{ background: "#25D366" }}
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </button>
                      {o.phone && (
                        <button
                          onClick={() => waToCustomer(o)}
                          data-testid={`wa-customer-${o.id}`}
                          title={`Reply to ${o.customer_name} on WhatsApp`}
                          className="text-xs px-2.5 py-1 border border-[#25D366] text-[#1f8f4d] rounded-sm hover:bg-[rgba(37,211,102,0.08)] flex items-center gap-1"
                        >
                          <MessageCircle size={12} /> Reply
                        </button>
                      )}
                      {!o.pushed_to_pos && o.status !== "rejected" && (
                        <button
                          onClick={() => pushPos(o)}
                          data-testid={`push-pos-${o.id}`}
                          className="text-xs px-2.5 py-1 border border-[#8B0000] text-[#8B0000] rounded-sm hover:bg-[rgba(139,0,0,0.06)] flex items-center gap-1"
                        >
                          <Send size={12} /> Push to POS
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-[10px] text-[#5a3a31]">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <div className="text-xs text-[#5a3a31] py-4 text-center italic">
                    No orders here.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
