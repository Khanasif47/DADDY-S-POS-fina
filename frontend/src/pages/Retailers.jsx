import { useEffect, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export default function Retailers() {
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(null); // supplier
  const [payAmount, setPayAmount] = useState(0);
  const [form, setForm] = useState({ name: "", category: "", contact: "", amount_owed: 0 });

  const load = async () => {
    const [s, p] = await Promise.all([api.get("/suppliers"), api.get("/supplier-payments")]);
    setSuppliers(s.data);
    setPayments(p.data);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await api.post("/suppliers", { ...form, amount_owed: Number(form.amount_owed) });
      toast.success("Supplier added");
      setOpen(false);
      setForm({ name: "", category: "", contact: "", amount_owed: 0 });
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const settle = async () => {
    try {
      await api.post(`/suppliers/${payOpen.id}/pay`, {
        amount: Number(payAmount),
        note: `Settlement ${new Date().toLocaleDateString()}`,
      });
      toast.success(`Paid ${inr(payAmount)} to ${payOpen.name}`);
      setPayOpen(null);
      setPayAmount(0);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove supplier?")) return;
    await api.delete(`/suppliers/${id}`);
    load();
  };

  const totalOwed = suppliers.reduce((s, x) => s + (x.amount_owed || 0), 0);

  return (
    <div className="p-8 lg:p-12" data-testid="retailers-page">
      <PageHeader
        eyebrow="Payables"
        title="Retailer Payments"
        subtitle="Track what you owe to flour mills, dairy, packaging & other vendors."
        right={
          <button
            onClick={() => setOpen(true)}
            data-testid="add-supplier-button"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add supplier
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Mini label="Suppliers" value={suppliers.length} />
        <Mini label="Total Outstanding" value={inr(totalOwed)} />
        <Mini
          label="Paid (last 30d)"
          value={inr(
            payments
              .filter(
                (p) => new Date(p.paid_at) >= new Date(Date.now() - 30 * 86400000)
              )
              .reduce((s, p) => s + p.amount, 0)
          )}
        />
      </div>

      <div className="card-luxe overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f2e6] text-[#5a3a31]">
            <tr className="text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Supplier</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Contact</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-right">Owed</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Last Paid</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                data-testid={`supplier-row-${s.id}`}
                className="border-t border-[rgba(139,0,0,0.08)]"
              >
                <td className="px-5 py-3 font-medium text-[#2c1b18]">{s.name}</td>
                <td className="px-5 py-3 capitalize text-[#5a3a31]">{s.category}</td>
                <td className="px-5 py-3 text-[#5a3a31]">{s.contact}</td>
                <td className="px-5 py-3 text-right font-serif-display text-lg" style={{ color: s.amount_owed > 0 ? "#8B0000" : "#2e6f40" }}>
                  {inr(s.amount_owed)}
                </td>
                <td className="px-5 py-3 text-[#5a3a31] text-xs">
                  {s.last_paid_at ? new Date(s.last_paid_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setPayOpen(s);
                        setPayAmount(s.amount_owed);
                      }}
                      disabled={s.amount_owed <= 0}
                      data-testid={`settle-supplier-${s.id}`}
                      className="px-3 py-1.5 text-xs rounded-sm bg-[#8B0000] text-white hover:bg-[#6a0000] disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Wallet size={12} /> Settle
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="p-1.5 text-[#8B0000] hover:bg-[rgba(139,0,0,0.06)] rounded-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-luxe mt-10 p-6">
        <div className="label-eyebrow">Ledger</div>
        <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
          Recent Payments
        </h3>
        {payments.length === 0 ? (
          <div className="text-sm text-[#5a3a31]">No payments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {payments.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-t border-[rgba(139,0,0,0.08)]">
                  <td className="py-2 text-[#5a3a31] text-xs">
                    {new Date(p.paid_at).toLocaleString()}
                  </td>
                  <td className="py-2">{p.supplier_name}</td>
                  <td className="py-2 text-[#5a3a31]">{p.note}</td>
                  <td className="py-2 text-right font-medium">{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add supplier */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">Add supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              data-testid="supplier-name-input"
              placeholder="Supplier name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="Category (e.g. flour, dairy)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="Contact"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="form-input"
            />
            <input
              type="number"
              placeholder="Amount owed (₹)"
              value={form.amount_owed}
              onChange={(e) => setForm({ ...form, amount_owed: e.target.value })}
              className="form-input"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button data-testid="save-supplier-button" onClick={create} className="btn-primary">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle */}
      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">
              Settle dues — {payOpen?.name}
            </DialogTitle>
          </DialogHeader>
          <div>
            <div className="text-sm text-[#5a3a31] mb-3">
              Outstanding: <strong>{inr(payOpen?.amount_owed)}</strong>
            </div>
            <input
              type="number"
              data-testid="settle-amount-input"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="form-input"
              placeholder="Amount to pay"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setPayOpen(null)} className="btn-outline">
              Cancel
            </button>
            <button data-testid="confirm-settle-button" onClick={settle} className="btn-primary">
              Pay {inr(payAmount)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.form-input{width:100%;padding:.5rem .75rem;background:#fff;border:1px solid rgba(139,0,0,.2);border-radius:4px;font-size:.875rem;outline:none}.form-input:focus{border-color:#8B0000;box-shadow:0 0 0 1px #8B0000}`}</style>
    </div>
  );
}

const Mini = ({ label, value }) => (
  <div className="card-luxe p-5">
    <div className="label-eyebrow">{label}</div>
    <div className="font-serif-display text-3xl mt-2" style={{ color: "#2c1b18" }}>
      {value}
    </div>
  </div>
);
