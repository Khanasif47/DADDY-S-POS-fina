import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Users,
  Truck,
  Globe,
  LogOut,
  Settings as SettingsIcon,
  Globe2,
  Cake,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { Toaster } from "../components/ui/sonner";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/pos", label: "POS / Billing", icon: ShoppingBag, testid: "nav-pos" },
  { to: "/inventory", label: "Inventory", icon: Boxes, testid: "nav-inventory" },
  { to: "/website-menu", label: "Website Menu", icon: Globe2, testid: "nav-website-menu" },
  { to: "/online-orders", label: "Online Orders", icon: Globe, testid: "nav-online-orders" },
  { to: "/custom-cake-orders", label: "Custom Cakes", icon: Cake, testid: "nav-custom-cakes" },
  { to: "/employees", label: "Employees", icon: Users, testid: "nav-employees" },
  { to: "/retailers", label: "Retailer Payables", icon: Truck, testid: "nav-retailers" },
  { to: "/settings", label: "Bakery Settings", icon: SettingsIcon, testid: "nav-settings" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#ede7c7" }}>
      <aside
        className="w-64 shrink-0 border-r border-[rgba(139,0,0,0.14)] bg-white/70 backdrop-blur-md flex flex-col"
        data-testid="sidebar"
      >
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <img
            src="/daddys-logo.png"
            alt={settings.full_name}
            className="w-24 h-24 object-contain"
            draggable="false"
          />
          <div className="mt-2 text-xs text-[#5a3a31] tracking-wider uppercase">
            Est. {settings.established_year || 2014} · POS Terminal
          </div>
        </div>
        <div className="divider-thin mx-6" />
        <nav className="flex-1 mt-5 px-3 space-y-1 overflow-y-auto scroll-thin">
          {navItems.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={it.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#8B0000] text-white shadow-sm"
                      : "text-[#2c1b18] hover:bg-[rgba(139,0,0,0.06)]"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.6} />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[rgba(139,0,0,0.14)]">
          <div className="text-xs text-[#5a3a31] mb-2 truncate" data-testid="user-email">
            {user?.email}
          </div>
          <button
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            data-testid="logout-button"
            className="flex items-center gap-2 text-sm text-[#8B0000] hover:underline"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
