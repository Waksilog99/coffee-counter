import { useState, useCallback, useEffect } from "react";
import MenuGrid from "@/components/MenuGrid";
import OrderPanel, { type OrderItem } from "@/components/OrderPanel";
import DashboardSection from "@/components/DashboardSection";
import { getApiUrl } from "@/lib/api";
import OrderHistory from "@/components/OrderHistory";
import MenuDisplay from "@/components/MenuDisplay";
import SettingsSection from "@/components/SettingsSection";
import type { MenuItem } from "@/data/menu";
import { Coffee, LogOut, User, Home, FileText, Clock, Users, Settings, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

const Index = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState("Loading...");
  const [activeTab, setActiveTab] = useState<"menu" | "dashboard" | "history" | "menu-display" | "settings">("menu");
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [todayOrders, setTodayOrders] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNextId = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/orders/next-id"));
      const data = await res.json();
      setCurrentTicketId(data.nextId);
    } catch (err) {
      console.error("Failed to fetch next ticket ID", err);
      setCurrentTicketId("ERROR");
    }
  }, []);

  useEffect(() => {
    fetchNextId();
  }, [fetchNextId]);

  const fetchTodayOrders = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/dashboard"));
      const data = await res.json();
      setTodayOrders(data.dailyOrders);
    } catch (err) {
      console.error("Failed to fetch today orders", err);
    }
  }, []);

  useEffect(() => {
    fetchTodayOrders();
    const interval = setInterval(fetchTodayOrders, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchTodayOrders]);

  const addItem = useCallback((item: MenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearOrder = useCallback(() => setOrderItems([]), []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground transition-colors duration-300 overflow-hidden font-sans">
      {/* Sidebar Nav (Desktop) */}
      <aside className="hidden md:flex w-20 bg-background border-r border-border/10 flex-col items-center py-6 gap-6 z-20">
        <button onClick={() => setActiveTab("menu")} className={`p-3 rounded-2xl transition-all ${activeTab === "menu" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"}`}>
          <Home className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("history")} className={`p-3 rounded-2xl transition-all ${activeTab === "history" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"}`}>
          <Clock className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={`p-3 rounded-2xl transition-all ${activeTab === "dashboard" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"}`}>
          <Users className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("settings")} className={`p-3 rounded-2xl transition-all ${activeTab === "settings" ? "bg-primary text-white shadow-xl shadow-primary/20" : "text-muted-foreground hover:bg-secondary/50"}`}>
          <Settings className="w-5 h-5" />
        </button>
        <div className="mt-auto">
          <button onClick={handleLogout} className="p-3 rounded-2xl text-destructive hover:bg-destructive/10 transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content (Center) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {/* Top Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-background border-b border-border/10 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col">
              <h1 className="text-xs md:text-sm font-black tracking-tighter uppercase leading-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Waks Cafe
              </h1>
            </div>
            <div className="hidden md:block h-4 w-px bg-border/20" />
            <div className="hidden md:flex flex-col">
              <p className="text-sm font-black text-foreground uppercase tracking-tight">
                {currentTime.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} PHT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Mobile Order Panel Toggle (Checkout Button) */}
            {activeTab === "menu" && orderItems.length > 0 && (
              <button
                onClick={() => setIsOrderPanelOpen(true)}
                className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse"
              >
                <Clock className="w-3 h-3" />
                Checkout ({orderItems.length})
              </button>
            )}

            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Today:</span>
              <span className="bg-primary/10 px-3 py-1 rounded-full text-primary text-base font-black">
                {todayOrders}
              </span>
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 md:p-3 bg-white dark:bg-card border border-border rounded-full hover:bg-gray-50 transition-all shadow-sm group"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Desktop Order Toggle */}
            {activeTab === "menu" && (
              <button
                onClick={() => setIsOrderPanelOpen(!isOrderPanelOpen)}
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border ${isOrderPanelOpen
                  ? "bg-primary text-white border-primary shadow-primary/20"
                  : "bg-card text-foreground border-border/10 hover:bg-muted"
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {isOrderPanelOpen ? "Close Review" : "View Order"}
              </button>
            )}

            <div className="flex items-center gap-3 pl-4 border-l border-border/20">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black shadow-sm overflow-hidden border-2 border-white">
                <img
                  src={user?.profile_picture || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces"}
                  alt={user?.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
          {/* Products Area */}
          <div className="flex-1 overflow-auto p-4 md:p-8 pt-6 custom-scrollbar pb-24 md:pb-8">
            {activeTab === "menu" ? (
              <MenuGrid onAddItem={addItem} />
            ) : activeTab === "dashboard" ? (
              <DashboardSection />
            ) : activeTab === "history" ? (
              <OrderHistory />
            ) : activeTab === "settings" ? (
              <SettingsSection />
            ) : (
              <MenuDisplay onAddItem={addItem} />
            )}
          </div>

          {/* Desktop Toggle Handle */}
          {activeTab === "menu" && (
            <div
              className="hidden md:block z-50 transition-all duration-500 ease-in-out absolute top-1/2 -translate-y-1/2"
              style={{ right: isOrderPanelOpen && activeTab === "menu" ? "410px" : "-10px" }}
            >
              <button
                onClick={() => setIsOrderPanelOpen(!isOrderPanelOpen)}
                className="group w-8 h-12 bg-primary dark:bg-card border-2 border-primary dark:border-border rounded-xl flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                title={isOrderPanelOpen ? "Minimize Panel" : "Expand Panel"}
              >
                <div className={`transition-transform duration-500 ${isOrderPanelOpen ? "" : "rotate-180"}`}>
                  <Coffee className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}

          {/* Order Panel (Responsive Drawer) */}
          <div
            className={`
                fixed inset-0 z-50 md:static md:z-0 md:h-full bg-background md:border-l border-border/10 transition-all duration-500 ease-in-out flex flex-col overflow-hidden 
                ${isOrderPanelOpen && activeTab === "menu"
                ? "opacity-100 translate-y-0 md:translate-y-0 md:w-[420px]"
                : "opacity-0 translate-y-full md:translate-y-0 md:w-0 pointer-events-none md:pointer-events-auto"
              }
              `}
          >
            <div className="w-full md:w-[420px] h-full p-4 flex flex-col gap-3 overflow-hidden bg-background">
              <div className="flex items-center justify-between flex-shrink-0 mb-1">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsOrderPanelOpen(false)} className="md:hidden p-2 bg-muted rounded-full">
                    <Home className="w-4 h-4" />
                  </button>
                  <button className="hidden md:block p-2.5 bg-card border border-border rounded-full shadow-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight text-foreground">Purchase Review</h2>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase opacity-50">#{currentTicketId}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    clearOrder();
                    setIsOrderPanelOpen(false);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <OrderPanel
                  items={orderItems}
                  onUpdateQty={updateQty}
                  onRemove={removeItem}
                  onClear={clearOrder}
                  currentTicketId={currentTicketId}
                  onOrderSuccess={() => {
                    fetchNextId();
                    fetchTodayOrders();
                    setIsOrderPanelOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around z-40 pb-safe">
        <button onClick={() => setActiveTab("menu")} className={`flex flex-col items-center gap-1 p-2 ${activeTab === "menu" ? "text-primary" : "text-muted-foreground"}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
        <button onClick={() => setActiveTab("history")} className={`flex flex-col items-center gap-1 p-2 ${activeTab === "history" ? "text-primary" : "text-muted-foreground"}`}>
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center gap-1 p-2 ${activeTab === "dashboard" ? "text-primary" : "text-muted-foreground"}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stats</span>
        </button>
        <button onClick={() => setActiveTab("settings")} className={`flex flex-col items-center gap-1 p-2 ${activeTab === "settings" ? "text-primary" : "text-muted-foreground"}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-destructive">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Index;
