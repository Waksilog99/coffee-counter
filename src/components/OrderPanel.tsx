import { Minus, Plus, X, CreditCard, Wallet, Banknote, Coffee, Heart, GripVertical } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import type { MenuItem } from "@/data/menu";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ReceiptView, type Order } from "./ReceiptView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createPortal } from "react-dom";

export type OrderItem = MenuItem & { quantity: number };

type Props = {
  items: OrderItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  currentTicketId: string;
  onOrderSuccess: () => void;
};

const OrderPanel = ({ items, onUpdateQty, onRemove, onClear, currentTicketId, onOrderSuccess }: Props) => {
  const [orderType, setOrderType] = useState<"delivery" | "dine-in" | "take-away">("dine-in");
  const [customerName, setCustomerName] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [lastOrderForPrint, setLastOrderForPrint] = useState<Order | null>(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "E-Wallet" | "Card">("Cash");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to refresh ID when order is cleared
  const [prevItemsLength, setPrevItemsLength] = useState(0);
  useEffect(() => {
    if (prevItemsLength > 0 && items.length === 0) {
      onOrderSuccess();
    }
    setPrevItemsLength(items.length);
  }, [items.length, onOrderSuccess]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const netAmount = total / 1.12;
  const tax = total - netAmount;

  const handlePay = async (overrideRef?: string) => {
    if (items.length === 0) return;
    if (paymentMethod !== "Cash" && !overrideRef && !referenceId) {
      setIsPaymentModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    const finalRefId = overrideRef || referenceId || "CASH-PAY";

    const orderData: Order = {
      id: currentTicketId,
      customer_name: customerName || "Guest",
      table_no: tableNo || "N/A",
      items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
      total: total,
      date: new Date().toISOString(),
      type: orderType,
      payment_method: paymentMethod,
      payment_reference: finalRefId
    };

    try {
      let res;
      try {
        res = await fetch(getApiUrl("/api/orders"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderData.id,
            customerName: orderData.customer_name,
            tableNo: orderType === "dine-in" ? tableNo : "N/A",
            address: orderType === "delivery" ? tableNo : "",
            items: items,
            total: total,
            type: orderType,
            paymentMethod: paymentMethod,
            paymentReference: finalRefId
          }),
        });
      } catch (netErr) {
        throw new Error("Network error. Check connection.");
      }

      if (!res.ok) {
        let errorMsg = "Failed to place order";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* ignore JSON parse error */ }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      toast.success(`Ticket #${data.orderId} confirmed!`);
      setLastOrderForPrint(orderData);
      setTimeout(() => {
        window.print();
        setTimeout(() => setLastOrderForPrint(null), 500);
      }, 300);
      onClear();
      setCustomerName("");
      setTableNo("");
      setReferenceId("");
      setIsPaymentModalOpen(false);
      onOrderSuccess();
    } catch (error: any) {
      console.error("Order Submit Error:", error);
      toast.error("Submission Failed", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceId.trim()) handlePay(referenceId);
  };

  return (
    <div className="flex-1 grid grid-rows-[auto_1fr_auto] h-full min-h-0 gap-0 overflow-hidden animate-fade-in pr-1">
      {/* SECTION 1: Fixed Header Area */}
      <div className="space-y-4 pb-4 border-b border-border/10 flex-shrink-0">
        {/* Order Type Toggle */}
        <div className="flex bg-secondary/30 p-1.5 rounded-full border border-primary/5">
          {["dine-in", "take-away", "delivery"].map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type as any)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-500 ${orderType === type
                ? "bg-primary text-white shadow-lg"
                : "text-muted-foreground hover:bg-card/50"
                }`}
            >
              {type === "take-away" ? "take out" : type.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Customer Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Customer name</label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-card dark:bg-muted/20 border border-border/10 rounded-full px-5 py-2.5 text-xs font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
            />
          </div>

          {(orderType === "dine-in" || orderType === "delivery") && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">
                {orderType === "dine-in" ? "Table Number" : "Delivery Address"}
              </label>
              <input
                type="text"
                placeholder={orderType === "dine-in" ? "Table No." : "Enter full address"}
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                className="w-full bg-card dark:bg-muted/20 border border-border/10 rounded-full px-5 py-2.5 text-xs font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Scrollable Middle Area (Dynamic Height) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-baseline justify-between px-2 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Order list:</p>
          <p className="text-[10px] font-bold text-primary">{items.length} Products</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20">
              <Coffee className="w-12 h-12 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">No orders yet</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="group flex items-center justify-between gap-3 px-1 animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={() => onRemove(item.id)} className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors">
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <div className="w-14 h-14 rounded-full bg-secondary/50 overflow-hidden flex-shrink-0 border-2 border-background dark:border-border shadow-sm">
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-foreground text-[11px] truncate uppercase tracking-tight">{item.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground">₱{Number(item.price).toFixed(0)} x {item.quantity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-full">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-card flex items-center justify-center text-primary shadow-sm active:scale-90"><Minus className="w-3 h-3" /></button>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shadow-lg active:scale-95"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: Fixed Footer Area */}
      <div className="pt-6 border-t border-dashed border-border/50 bg-background/50 backdrop-blur-sm">
        {/* Breakdown */}
        <div className="bg-muted/30 p-5 rounded-[2rem] border border-dashed border-border/50 mb-6 space-y-2">
          {[
            { label: "Subtotal (Net)", value: netAmount },
            { label: "VAT (12%)", value: tax }
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>{row.label}</span>
              <span>₱{row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-dashed border-border/30 flex justify-between items-center text-xs font-black uppercase tracking-widest text-primary">
            <span>Total Amount</span>
            <span className="text-xl">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment and Place Order */}
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Method</p>
            <div className="flex gap-3">
              {["Cash", "E-Wallet", "Card"].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`flex-1 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === method ? "bg-primary text-white border-primary shadow-lg" : "bg-card border-border/10 text-muted-foreground hover:bg-muted"}`}
                >
                  {method === "E-Wallet" ? "Wallet" : method}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handlePay()}
            disabled={items.length === 0 || isSubmitting}
            className="w-full py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Confirming..." : `Place order ₱${total.toLocaleString()}`}
          </button>
        </div>
      </div>

      {/* Payment Reference Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl bg-card border border-border/10 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              {paymentMethod === "E-Wallet" ? <Wallet className="w-6 h-6 text-primary" /> : <CreditCard className="w-6 h-6 text-primary" />}
              {paymentMethod} Payment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleModalSubmit} className="p-8 pt-0 space-y-6">
            <div className="bg-muted/30 p-6 rounded-2xl border border-dashed border-border/50">
              <p className="text-sm font-bold text-foreground/80 mb-2">Order Total: <span className="text-primary">₱{total.toLocaleString()}</span></p>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Reference Required</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">{paymentMethod === "E-Wallet" ? "Transaction ID" : "Approval Code"}</label>
              <input
                autoFocus
                type="text"
                placeholder={paymentMethod === "E-Wallet" ? "Enter GCash/Maya Trans ID" : "Enter Terminal Approval Code"}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full bg-muted/50 dark:bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 bg-muted text-muted-foreground rounded-xl font-bold text-xs uppercase tracking-widest transition-all">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">{isSubmitting ? "Confirming..." : "Confirm & Place Order"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {lastOrderForPrint && createPortal(
        <div className="print-only">
          <ReceiptView order={lastOrderForPrint} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default OrderPanel;
