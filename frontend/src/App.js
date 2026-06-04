import "@/App.css";
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import Layout from "./components/Layout";
import Splash from "./components/Splash";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Employees from "./pages/Employees";
import Retailers from "./pages/Retailers";
import OnlineOrders from "./pages/OnlineOrders";
import Settings from "./pages/Settings";
import WebsiteMenu from "./pages/WebsiteMenu";
import CustomCakeOrders from "./pages/CustomCakeOrders";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div
        className="min-h-screen flex items-center justify-center text-[#5a3a31]"
        style={{ background: "#ede7c7" }}
        data-testid="auth-checking"
      >
        Loading…
      </div>
    );
  if (!user || !user.id) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  // Skip splash if user has already seen it this session — feels less repetitive.
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== "undefined" && !sessionStorage.getItem("splash_done")
  );
  const onSplashDone = () => {
    sessionStorage.setItem("splash_done", "1");
    setShowSplash(false);
  };

  return (
    <div className="App">
      {showSplash && <Splash onDone={onSplashDone} />}
      <SettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <Protected>
                    <Layout />
                  </Protected>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="website-menu" element={<WebsiteMenu />} />
                <Route path="online-orders" element={<OnlineOrders />} />
                <Route path="custom-cake-orders" element={<CustomCakeOrders />} />
                <Route path="employees" element={<Employees />} />
                <Route path="retailers" element={<Retailers />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </div>
  );
}

export default App;
