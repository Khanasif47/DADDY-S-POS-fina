import { useEffect, useMemo, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Globe, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteMenu() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | shown | hidden

  const load = async () => {
    const r = await api.get("/products");
    setItems(r.data);
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((p) =>
        filter === "all" ? true : filter === "shown" ? p.show_on_website !== false : p.show_on_website === false
      )
      .filter((p) =>
        search.trim() === "" ? true : p.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [items, filter, search]);

  const update = async (id, patch) => {
    try {
      await api.put(`/products/${id}`, patch);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const toggle = (p) => update(p.id, { show_on_website: !(p.show_on_website !== false) });

  const setWebPrice = (p, v) => {
    const n = v === "" ? null : Number(v);
    update(p.id, { website_price: n });
  };

  const shownCount = items.filter((p) => p.show_on_website !== false).length;

  return (
    <div className="p-8 lg:p-12" data-testid="website-menu-page">
      <PageHeader
        eyebrow="From the Bakery to the Web"
        title="Website Menu"
        subtitle="Choose what shows on daddyss.org. Optionally set a different online price (leave blank to use the POS price)."
        right={
          <a
            href={"#"}
            onClick={(e) => {
              e.preventDefault();
              toast.success("Saved live — the website will pick up changes within seconds.");
            }}
            className="text-xs text-[#5a3a31] hidden sm:inline"
          >
            <Globe className="inline mr-1" size={12} /> {shownCount} of {items.length} listed online
          </a>
        }
      />

      <div className="card-luxe p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          data-testid="website-menu-search"
          placeholder="Search menu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
        />
        <div className="flex gap-2">
          {[
            ["all", "All"],
            ["shown", "On website"],
            ["hidden", "Hidden"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              data-testid={`website-filter-${k}`}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-sm border transition-colors ${
                filter === k
                  ? "bg-[#8B0000] border-[#8B0000] text-white"
                  : "bg-white border-[rgba(139,0,0,0.2)] text-[#5a3a31] hover:border-[#8B0000]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-luxe overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f2e6] text-[#5a3a31]">
            <tr className="text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Item</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Category</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">POS Price</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Website Price</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider">Stock</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wider text-center">On website</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const shown = p.show_on_website !== false;
              return (
                <tr
                  key={p.id}
                  data-testid={`website-row-${p.id}`}
                  className={`border-t border-[rgba(139,0,0,0.08)] ${
                    shown ? "" : "opacity-60"
                  }`}
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
                  <td className="px-5 py-3 font-medium">{inr(p.price)}</td>
                  <td className="px-5 py-3">
                    <input
                      data-testid={`website-price-${p.id}`}
                      type="number"
                      defaultValue={p.website_price ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value;
                        const cur = p.website_price ?? "";
                        if (String(cur) !== String(v)) setWebPrice(p, v);
                      }}
                      placeholder={String(p.price)}
                      className="w-28 px-2.5 py-1.5 bg-white border border-[rgba(139,0,0,0.2)] rounded-sm font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                    />
                  </td>
                  <td className="px-5 py-3">{p.stock}</td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggle(p)}
                      data-testid={`toggle-website-${p.id}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm font-semibold transition-colors ${
                        shown
                          ? "bg-[rgba(46,111,64,0.12)] text-[#2e6f40] hover:bg-[rgba(46,111,64,0.2)]"
                          : "bg-[rgba(139,0,0,0.08)] text-[#8B0000] hover:bg-[rgba(139,0,0,0.16)]"
                      }`}
                    >
                      {shown ? (
                        <>
                          <Eye size={12} /> Visible
                        </>
                      ) : (
                        <>
                          <EyeOff size={12} /> Hidden
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#5a3a31]">
                  No items match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
