import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { toast } from "sonner";

export type OrderItem = MenuItem & { quantity: number };

type Props = {
  items: OrderItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

const TAX_RATE = 0.08;

const OrderPanel = ({ items, onUpdateQty, onRemove, onClear }: Props) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handlePay = () => {
    if (items.length === 0) return;
    toast.success(`Order placed! Total: $${total.toFixed(2)}`, {
      description: `${itemCount} item${itemCount > 1 ? "s" : ""} • Thank you!`,
    });
    onClear();
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-accent" />
          <h2 className="font-display text-lg font-bold text-card-foreground">
            Current Order
          </h2>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <ShoppingBag className="w-10 h-10 opacity-30" />
            <p className="text-sm">No items yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-background"
            >
              <span className="text-xl">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${item.price.toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    item.quantity === 1
                      ? onRemove(item.id)
                      : onUpdateQty(item.id, -1)
                  }
                  className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors"
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="w-6 text-center text-sm font-bold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.id, 1)}
                  className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold w-14 text-right text-foreground">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer / Totals */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tax (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-foreground font-display">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <button
          onClick={handlePay}
          disabled={items.length === 0}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
        >
          Pay ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default OrderPanel;
