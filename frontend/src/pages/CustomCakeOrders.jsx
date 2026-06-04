import { useEffect, useState } from "react";
import { api, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Cake, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  new:           "bg-blue-100 text-blue-700",
  "in-discussion":"bg-yellow-100 text-yellow-700",
  confirmed:     "bg-green-100 text-green-700",
  completed:     "bg-gray-100 text-gray-600",
  rejected:      "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  new:           "New Enquiry",
  "in-discussion":"In Discussion",
  confirmed:     "Confirmed",
  completed:     "Completed",
  rejected:      "Rejected",
};

export default function CustomCakeOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get("/custom-cake-orders");
      setOrders(r.data);
    } catch (e) {
      toast.error(formatErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/custom-cake-orders/${id}/status`, { status });
      setOrders(o => o.map(x => x.id === id ? { ...x, status } : x));
      toast.success("Status updated");
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this enquiry?")) return;
    try {
      await api.delete(`/custom-cake-orders/${id}`);
      setOrders(o => o.filter(x => x.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const newCount = orders.filter(o => o.status === "new").length;

  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        eyebrow="From the Website"
        title="Custom Cake Enquiries"
        subtitle="These arrive when a customer submits the Custom Cake form on your website. Reply via WhatsApp to discuss."
        right={
          newCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(139,0,0,0.1)] text-[#8B0000]">
              <Cake size={12} /> {newCount} new
            </span>
          ) : null
        }
      />

      {loading ? (
        <div className="text-center py-16 text-[#5a3a31]">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card-luxe p-12 text-center text-[#5a3a31]">
          <div className="text-4xl mb-3">🎂</div>
          <div className="font-medium">No custom cake enquiries yet.</div>
          <div className="text-sm mt-1 opacity-60">They'll appear here when customers submit the form on your website.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="card-luxe p-5">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#2c1b18] text-base">{o.customer_name}</span>
                    {o.phone && (
                      <a
                        href={`https://wa.me/${o.phone.replace(/[^0-9]/g,'')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                      >
                        <Phone size={10} /> {o.phone} (WhatsApp)
                      </a>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm text-[#5a3a31]">
                    {o.occasion   && <span>🎉 {o.occasion}</span>}
                    {o.date_needed && <span>📅 {new Date(o.date_needed).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                    {o.flavour    && <span>🍰 {o.flavour}</span>}
                    {o.tiers      && <span>🏗️ {o.tiers}</span>}
                    {o.weight     && <span>⚖️ {o.weight}</span>}
                    {o.budget     && <span>💰 {o.budget}</span>}
                  </div>

                  {o.description && (
                    <div className="mt-2 text-sm text-[#2c1b18] bg-[#f5f2e6] rounded p-2 border border-[rgba(139,0,0,0.08)]">
                      📝 {o.description}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-[#5a3a31] opacity-50">
                    Received {new Date(o.created_at).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={o.status}
                    onChange={e => setStatus(o.id, e.target.value)}
                    className="text-xs px-2 py-1.5 border border-[rgba(139,0,0,0.2)] rounded bg-white text-[#2c1b18] focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>

                  {o.phone && (
                    <a
                      href={`https://wa.me/${o.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${o.customer_name}! We received your custom cake enquiry for your ${o.occasion}. Let's discuss the details!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-semibold transition-colors"
                    >
                      💬 Reply
                    </a>
                  )}

                  <button
                    onClick={() => remove(o.id)}
                    className="p-1.5 text-[#8B0000] hover:bg-[rgba(139,0,0,0.08)] rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
