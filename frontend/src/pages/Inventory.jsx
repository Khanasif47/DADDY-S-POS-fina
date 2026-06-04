import { useEffect, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const empty = {
  name: "",
  category: "cakes",
  price: 100,
  stock: 10,
  low_stock_threshold: 5,
  emoji: "🎂",
  image: "",
  barcode: "",
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const r = await api.get("/products");
    setItems(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      low_stock_threshold: p.low_stock_threshold,
      emoji: p.emoji || "",
      image: p.image || "",
      barcode: p.barcode || "",
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock), low_stock_threshold: Number(form.low_stock_threshold) };
      if (editing) await api.put(`/products/${editing.id}`, body);
      else await api.post("/products", body);
      toast.success(editing ? "Product updated" : "Product added");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  return (
    <div className="p-8 lg:p-12" data-testid="inventory-page">
      <PageHeader
        eyebrow="Stockroom"
        title="Inventory"
        subtitle="Track stock levels, set thresholds, manage your menu."
        right={
          <button onClick={startNew} data-testid="add-product-button" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add product
          </button>
        }
      />

      <div className="card-luxe overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-[#f5f2e6] text-[#5a3a31]">
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Item</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Barcode</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Price</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Stock</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const low = p.stock <= p.low_stock_threshold;
              return (
                <tr
                  key={p.id}
                  data-testid={`inventory-row-${p.id}`}
                  className="border-t border-[rgba(139,0,0,0.08)] hover:bg-[rgba(139,0,0,0.02)]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-[#f5f2e6] flex items-center justify-center text-xl overflow-hidden">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.emoji || "🍰"
                        )}
                      </div>
                      <span className="font-medium text-[#2c1b18]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 capitalize text-[#5a3a31]">{p.category}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#5a3a31]">
                    {p.barcode || "—"}
                  </td>
                  <td className="px-5 py-3 font-medium">{inr(p.price)}</td>
                  <td className="px-5 py-3">{p.stock}</td>
                  <td className="px-5 py-3">
                    {low ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-sm bg-[rgba(139,0,0,0.1)] text-[#8B0000] font-semibold">
                        Low stock
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-sm bg-[rgba(46,111,64,0.12)] text-[#2e6f40] font-semibold">
                        In stock
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        data-testid={`edit-product-${p.id}`}
                        className="p-2 text-[#8B0000] hover:bg-[rgba(139,0,0,0.06)] rounded-sm"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        data-testid={`delete-product-${p.id}`}
                        className="p-2 text-[#8B0000] hover:bg-[rgba(139,0,0,0.06)] rounded-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">
              {editing ? "Edit product" : "Add product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name">
              <input
                data-testid="product-name-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="form-input"
                >
                  {["cakes", "pastries", "breads", "chocolates", "beverages"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Price (₹)">
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="form-input"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock">
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="form-input"
                />
              </Field>
              <Field label="Low-stock threshold">
                <input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                  className="form-input"
                />
              </Field>
            </div>
            <Field label="Emoji">
              <input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="form-input"
              />
            </Field>
            <Field label="Image URL (optional)">
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="form-input"
              />
            </Field>
            <Field label="Barcode / SKU">
              <input
                data-testid="product-barcode-input"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="Scan or type the barcode"
                className="form-input font-mono"
              />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button onClick={save} data-testid="save-product-button" className="btn-primary">
              {editing ? "Save changes" : "Add product"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.form-input{width:100%;padding:.5rem .75rem;background:#fff;border:1px solid rgba(139,0,0,.2);border-radius:4px;font-size:.875rem;outline:none}.form-input:focus{border-color:#8B0000;box-shadow:0 0 0 1px #8B0000}`}</style>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5a3a31] mb-1.5">
      {label}
    </label>
    {children}
  </div>
);
