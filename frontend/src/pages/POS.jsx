import { useEffect, useMemo, useRef, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Search, Plus, Minus, Trash2, Printer, ScanLine } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["all", "cakes", "pastries", "breads", "chocolates", "beverages"];

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const scanRef = useRef(null);

  const load = async () => {
    const r = await api.get("/products");
    setProducts(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  // Resolve a scanned/typed barcode to a product and add it to cart.
  const resolveBarcode = (code) => {
    if (!code) return;
    const c = code.trim();
    if (!c) return;
    const p = products.find((x) => (x.barcode || "") === c);
    if (p) {
      addToCart(p);
      try {
        // little click/beep cue
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.04, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.09);
      } catch {
        /* ignore */
      }
      toast.success(`+ ${p.name}`, { duration: 1200 });
    } else {
      toast.error(`No product for code ${c}`);
    }
  };

  // Global scanner capture: USB/Bluetooth scanners type fast and end with Enter.
  // We buffer characters and accept the buffer when Enter is pressed (or after a typing pause).
  useEffect(() => {
    let buf = "";
    let lastT = 0;
    const onKey = (e) => {
      const target = e.target;
      // Ignore when user is typing in an input/textarea (manual typing should not auto-fire)
      const tag = target?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      const now = Date.now();
      if (now - lastT > 80) buf = "";
      lastT = now;

      if (e.key === "Enter") {
        if (buf.length >= 4 && !inField) {
          e.preventDefault();
          resolveBarcode(buf);
        }
        buf = "";
        return;
      }
      if (e.key.length === 1) {
        if (!inField) buf += e.key;
        if (buf.length > 32) buf = buf.slice(-32);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter((p) => p.active !== false)
      .filter((p) => (cat === "all" ? true : p.category === cat))
      .filter((p) =>
        search.trim() === "" ? true : p.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [products, cat, search]);

  const addToCart = (p) => {
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex)
        return c.map((i) =>
          i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...c, { product_id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const inc = (id) =>
    setCart((c) => c.map((i) => (i.product_id === id ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id) =>
    setCart((c) =>
      c
        .map((i) => (i.product_id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  const rm = (id) => setCart((c) => c.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const afterDisc = Math.max(0, subtotal - Number(discount || 0));
  const gst = Math.round(afterDisc * 0.05 * 100) / 100;
  const total = Math.round((afterDisc + gst) * 100) / 100;

  const checkout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/sales", {
        items: cart,
        payment_method: payment,
        discount: Number(discount || 0),
        customer_name: customer || null,
        source: "pos",
      });
      setLastReceipt(data);
      setCart([]);
      setDiscount(0);
      setCustomer("");
      toast.success("Sale completed · " + inr(data.total));
      load();
    } catch (e) {
      toast.error(formatErr(e));
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (receiptData) => {
    const r = receiptData || lastReceipt;
    if (!r) return;
    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    const rows = r.items
      .map(
        (i) =>
          `<tr><td>${i.name} × ${i.qty}</td><td style="text-align:right">${inr(
            i.price * i.qty
          )}</td></tr>`
      )
      .join("");
    const paymentLabel = (r.payment_method || "cash").toUpperCase();
    const customerLine = r.customer_name
      ? `<div>Customer: <strong>${r.customer_name}</strong></div>`
      : "";
    const discountRow = r.discount > 0
      ? `<tr class="tot"><td>Discount</td><td style="text-align:right">−${inr(r.discount)}</td></tr>`
      : "";
    w.document.write(`<html><head><title>Receipt</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Manrope:wght@400;600;700&display=swap');
        body{font-family:Manrope,sans-serif;color:#2c1b18;padding:28px 24px;background:#fff;max-width:340px;margin:0 auto}
        h1{font-family:'DM Serif Display',serif;color:#8B0000;margin:0 0 2px}
        .sub{font-size:11px;color:#5a3a31;letter-spacing:.08em;margin-bottom:12px}
        .meta{font-size:12px;color:#5a3a31;margin-bottom:14px;line-height:1.6}
        .divider{border:none;border-top:1px dashed rgba(139,0,0,0.3);margin:10px 0}
        table{width:100%;font-size:13px;border-collapse:collapse}
        td{padding:5px 0;border-bottom:1px dashed rgba(139,0,0,0.12)}
        .tot td{border-bottom:none;font-weight:600;padding-top:6px}
        .grand td{font-family:'DM Serif Display',serif;color:#8B0000;font-size:20px;padding-top:8px;border-top:2px solid #8B0000}
        .badge{display:inline-block;background:rgba(139,0,0,0.08);color:#8B0000;border-radius:3px;padding:1px 7px;font-size:11px;font-weight:700;letter-spacing:.06em}
        .footer{margin-top:22px;text-align:center;font-style:italic;color:#5a3a31;font-size:12px;line-height:1.7}
        @media print{body{padding:10px}}
      </style></head><body>
      <h1>DADDY's Bakery</h1>
      <div class="sub">Virar, Maharashtra</div>
      <hr class="divider"/>
      <div class="meta">
        Receipt #${r.id ? r.id.slice(0, 8).toUpperCase() : "—"}<br/>
        ${new Date(r.created_at || Date.now()).toLocaleString("en-IN")}<br/>
        ${customerLine}
        Payment: <span class="badge">${paymentLabel}</span>
      </div>
      <table>${rows}
        <tr class="tot"><td>Subtotal</td><td style="text-align:right">${inr(r.subtotal)}</td></tr>
        ${discountRow}
        <tr class="tot"><td>GST (5%)</td><td style="text-align:right">${inr(r.gst)}</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right">${inr(r.total)}</td></tr>
      </table>
      <div class="footer">Thank you for choosing DADDY's Bakery<br/>Baked with love. Made for you. 🎂</div>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="p-8 lg:p-12" data-testid="pos-page">
      <PageHeader
        eyebrow="Counter"
        title="POS / Billing"
        subtitle="Build a bill, take payment, print receipt — fast."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products */}
        <section className="lg:col-span-8">
          <div className="card-luxe p-5 mb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B0000]" />
                <input
                  data-testid="product-search-input"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    data-testid={`category-filter-${c}`}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm border transition-colors ${
                      cat === c
                        ? "bg-[#8B0000] border-[#8B0000] text-white"
                        : "bg-white border-[rgba(139,0,0,0.2)] text-[#5a3a31] hover:border-[#8B0000]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                data-testid={`product-card-${p.id}`}
                className="card-luxe text-left overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 fade-up"
              >
                <div className="h-28 bg-[#f5f2e6] flex items-center justify-center text-5xl">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    p.emoji || "🍰"
                  )}
                </div>
                <div className="p-3">
                  <div className="text-xs uppercase tracking-wider text-[#8B0000] font-semibold">
                    {p.category}
                  </div>
                  <div className="font-medium text-[#2c1b18] mt-1 truncate">{p.name}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-serif-display text-xl" style={{ color: "#8B0000" }}>
                      {inr(p.price)}
                    </div>
                    <div className="text-xs text-[#5a3a31]">stock {p.stock}</div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-[#5a3a31] py-8 text-center">No products.</div>
            )}
          </div>
        </section>

        {/* Cart */}
        <aside className="lg:col-span-4">
          <div className="card-luxe p-6 sticky top-6" data-testid="cart-panel">
            <div className="label-eyebrow">Current Bill</div>
            <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
              Cart
            </h3>

            <div className="max-h-[300px] overflow-y-auto scroll-thin -mx-2 px-2">
              {cart.length === 0 && (
                <div className="text-sm text-[#5a3a31] py-8 text-center" data-testid="cart-empty">
                  No items yet — tap a product to add.
                </div>
              )}
              {cart.map((i) => (
                <div
                  key={i.product_id}
                  className="flex items-center gap-3 py-3 border-b border-[rgba(139,0,0,0.08)]"
                  data-testid={`cart-item-${i.product_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#2c1b18] truncate">{i.name}</div>
                    <div className="text-xs text-[#5a3a31]">{inr(i.price)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => dec(i.product_id)}
                      className="w-7 h-7 flex items-center justify-center border border-[rgba(139,0,0,0.2)] text-[#8B0000] rounded-sm hover:bg-[rgba(139,0,0,0.05)]"
                    >
                      <Minus size={12} />
                    </button>
                    <div className="w-7 text-center text-sm font-semibold">{i.qty}</div>
                    <button
                      onClick={() => inc(i.product_id)}
                      data-testid={`cart-inc-${i.product_id}`}
                      className="w-7 h-7 flex items-center justify-center bg-[#8B0000] text-white rounded-sm hover:bg-[#6a0000]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => rm(i.product_id)}
                    className="text-[#8B0000] hover:text-[#6a0000]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <input
                data-testid="customer-input"
                placeholder="Customer name (optional)"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-[#5a3a31] uppercase tracking-wider">Discount ₹</label>
                <input
                  data-testid="discount-input"
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-28 px-3 py-1.5 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                />
              </div>
              <div className="flex gap-2">
                {["cash", "card", "upi"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayment(m)}
                    data-testid={`payment-${m}`}
                    className={`flex-1 py-2 text-xs uppercase tracking-wider rounded-sm border ${
                      payment === m
                        ? "bg-[#8B0000] border-[#8B0000] text-white"
                        : "bg-white border-[rgba(139,0,0,0.2)] text-[#5a3a31]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[rgba(139,0,0,0.12)] space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#5a3a31]">Subtotal</span>
                <span data-testid="cart-subtotal">{inr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5a3a31]">GST (5%)</span>
                <span>{inr(gst)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="label-eyebrow">Total</span>
                <span
                  className="font-serif-display text-3xl"
                  style={{ color: "#8B0000" }}
                  data-testid="cart-total"
                >
                  {inr(total)}
                </span>
              </div>
            </div>

            <button
              onClick={checkout}
              disabled={loading || cart.length === 0}
              data-testid="checkout-button"
              className="btn-primary w-full mt-4 disabled:opacity-50"
            >
              {loading ? "Processing…" : "Checkout"}
            </button>

            {lastReceipt && (
              <button
                onClick={printReceipt}
                data-testid="print-last-receipt"
                className="btn-outline w-full mt-3 flex items-center justify-center gap-2"
              >
                <Printer size={14} /> Print last receipt · {inr(lastReceipt.total)}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
