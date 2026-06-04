import { useEffect, useState } from "react";
import { api, inr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, AlertTriangle, Trophy } from "lucide-react";

const PIE = ["#8B0000", "#c0392b", "#a52a2a", "#5a3a31", "#d97706", "#2e6f40"];

const Stat = ({ icon: Icon, label, value, sub, testid }) => (
  <div className="card-luxe p-6 fade-up" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="label-eyebrow">{label}</div>
      <Icon size={18} strokeWidth={1.5} style={{ color: "#8B0000" }} />
    </div>
    <div className="font-serif-display text-3xl mt-3" style={{ color: "#2c1b18" }}>
      {value}
    </div>
    {sub && <div className="text-xs mt-1 text-[#5a3a31]">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);

  const load = async () => {
    const [a, r] = await Promise.all([
      api.get("/sales/analytics"),
      api.get("/sales", { params: { limit: 6 } }),
    ]);
    setData(a.data);
    setRecent(r.data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!data)
    return (
      <div className="p-10 text-[#5a3a31]" data-testid="dashboard-loading">
        Loading dashboard…
      </div>
    );

  return (
    <div className="p-8 lg:p-12" data-testid="dashboard-page">
      <PageHeader
        eyebrow="Daily Pulse"
        title="Today at the bakery"
        subtitle="Your monthly sales, fast-movers & low-stock alerts — at a glance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Stat
          icon={TrendingUp}
          label="Today Revenue"
          value={inr(data.today_revenue)}
          sub={`${data.today_orders} orders today`}
          testid="stat-today-revenue"
        />
        <Stat
          icon={ShoppingBag}
          label="Top Item"
          value={data.top_items?.[0]?.name || "—"}
          sub={data.top_items?.[0] ? `${data.top_items[0].qty} sold (30d)` : ""}
          testid="stat-top-item"
        />
        <Stat
          icon={AlertTriangle}
          label="Low Stock"
          value={data.low_stock_count}
          sub="items at or below threshold"
          testid="stat-low-stock"
        />
        <Stat
          icon={Trophy}
          label="30-Day Revenue"
          value={inr(data.daily.reduce((s, d) => s + d.revenue, 0))}
          sub="rolling window"
          testid="stat-30d-revenue"
        />
      </div>

      <div className="card-luxe p-6 mb-8 fade-up" data-testid="chart-monthly">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="label-eyebrow">Monthly Sales</div>
            <h3 className="font-serif-display text-2xl mt-1" style={{ color: "#2c1b18" }}>
              Revenue · Last 12 months
            </h3>
          </div>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={data.monthly}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B0000" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#8B0000" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#8B0000" strokeOpacity={0.08} />
              <XAxis dataKey="month" stroke="#5a3a31" fontSize={12} />
              <YAxis stroke="#5a3a31" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid rgba(139,0,0,0.2)", borderRadius: 4 }}
                formatter={(v) => inr(v)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8B0000"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card-luxe p-6 lg:col-span-2 fade-up" data-testid="chart-daily">
          <div className="label-eyebrow">Last 30 Days</div>
          <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
            Daily Revenue
          </h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data.daily}>
                <CartesianGrid stroke="#8B0000" strokeOpacity={0.08} />
                <XAxis dataKey="date" stroke="#5a3a31" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#5a3a31" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid rgba(139,0,0,0.2)" }}
                  formatter={(v) => inr(v)}
                />
                <Bar dataKey="revenue" fill="#8B0000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-luxe p-6 fade-up" data-testid="chart-category-mix">
          <div className="label-eyebrow">Category Mix</div>
          <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
            What's selling
          </h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.category_mix}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.category_mix.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#5a3a31" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-luxe p-6" data-testid="table-recent-sales">
          <div className="label-eyebrow">Live Ledger</div>
          <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {recent.length === 0 && (
              <div className="text-sm text-[#5a3a31]">No sales yet.</div>
            )}
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b border-[rgba(139,0,0,0.08)] pb-3 last:border-0"
              >
                <div>
                  <div className="font-medium text-[#2c1b18]">
                    {s.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
                  </div>
                  <div className="text-xs text-[#5a3a31] mt-0.5">
                    {new Date(s.created_at).toLocaleString()} · {s.payment_method.toUpperCase()} ·{" "}
                    {s.source}
                  </div>
                </div>
                <div className="font-serif-display text-xl" style={{ color: "#8B0000" }}>
                  {inr(s.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-luxe p-6" data-testid="table-top-items">
          <div className="label-eyebrow">Bestsellers</div>
          <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
            Top Items (30d)
          </h3>
          <div className="space-y-2">
            {data.top_items.map((t, i) => (
              <div key={t.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 flex items-center justify-center font-serif-display"
                    style={{
                      background: "rgba(139,0,0,0.08)",
                      color: "#8B0000",
                      borderRadius: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[#2c1b18]">{t.name}</span>
                </div>
                <span className="text-[#5a3a31]">{t.qty} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
