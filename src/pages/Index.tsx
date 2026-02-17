import { useState, useCallback } from "react";
import MenuGrid from "@/components/MenuGrid";
import OrderPanel, { type OrderItem } from "@/components/OrderPanel";
import type { MenuItem } from "@/data/menu";
import { Coffee } from "lucide-react";

const Index = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

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
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearOrder = useCallback(() => setOrderItems([]), []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
        <Coffee className="w-6 h-6 text-accent" />
        <h1 className="font-display text-xl font-bold text-foreground">
          Brew & Co.
        </h1>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          POS Terminal
        </span>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Menu Side */}
        <main className="flex-1 p-5 overflow-hidden">
          <MenuGrid onAddItem={addItem} />
        </main>

        {/* Order Side */}
        <aside className="w-[380px] p-4 pl-0">
          <OrderPanel
            items={orderItems}
            onUpdateQty={updateQty}
            onRemove={removeItem}
            onClear={clearOrder}
          />
        </aside>
      </div>
    </div>
  );
};

export default Index;
