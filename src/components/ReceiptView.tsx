import { Printer } from "lucide-react";

export type OrderItem = {
    name: string;
    quantity: number;
    price: number;
};

export type Order = {
    id: string;
    customer_name: string;
    table_no: string;
    address?: string;
    total: number;
    date: string;
    type: "delivery" | "dine-in" | "take-away";
    items: OrderItem[];
    payment_method?: string;
    payment_reference?: string;
};

export const ReceiptView = ({ order }: { order: Order }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const subtotal = (order.items || []).reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const tax = subtotal * 0.1;

    return (
        <div className="receipt-mono text-[12px] text-foreground bg-card p-8 border border-dashed border-border mx-auto max-w-[300px] shadow-sm print:bg-white print:text-black print:border-gray-300">
            <div className="text-center mb-6">
                <h1 className="text-xl font-black uppercase tracking-widest mb-1">Waks Cafe</h1>
                <p className="text-[10px] uppercase font-bold">Premium Coffee Experience</p>
                <div className="text-[9px] mt-2 space-y-0.5 opacity-80">
                    <p>123 Coffee St., BGC, Taguig City</p>
                    <p>Metro Manila, Philippines</p>
                    <p>Contact: +63 912 345 6789</p>
                </div>
                <div className="my-3 border-b border-dashed border-border print:border-black"></div>
                <p className="font-bold text-[14px]">{order.id}</p>
                <p className="text-[10px]">{formatDate(order.date)}</p>
                <div className="uppercase text-[10px] mt-1 space-y-1">
                    <p>{order.type}</p>
                    {order.type === "dine-in" && order.table_no !== "N/A" && <p className="font-bold">TABLE: {order.table_no}</p>}
                    {order.type === "delivery" && order.address && (
                        <div className="mt-1 normal-case italic">
                            <p className="font-bold uppercase not-italic">Delivery Address:</p>
                            <p className="leading-tight">{order.address}</p>
                        </div>
                    )}
                </div>
                <p className="font-bold uppercase mt-2 pt-2 border-t border-dashed border-border print:border-black">
                    Cashier: {(order.customer_name || "N/A").split(' ')[0].toUpperCase()}
                </p>
            </div>

            <div className="space-y-1 mb-4">
                <div className="flex justify-between font-bold border-b border-dashed border-border print:border-black pb-1 mb-2">
                    <span>ITEM</span>
                    <span>PRICE</span>
                </div>
                {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                        <span className="flex-1 pr-2">
                            {item.quantity}x {item.name.toUpperCase()}
                        </span>
                        <span className="whitespace-nowrap">
                            ₱{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="border-t border-dashed border-border print:border-black pt-4 space-y-1">
                <div className="flex justify-between">
                    <span>NET AMOUNT</span>
                    <span>₱{Number(order.total / 1.12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>VAT (12%)</span>
                    <span>₱{(Number(order.total) - (Number(order.total) / 1.12)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2">
                    <span>TOTAL</span>
                    <span>₱{Number(order.total || 0).toFixed(2)}</span>
                </div>
            </div>

            {order.payment_method && (
                <div className="mt-4 pt-4 border-t border-dashed border-border print:border-black text-[10px]">
                    <div className="flex justify-between">
                        <span>PAYMENT:</span>
                        <span className="font-bold">{order.payment_method.toUpperCase()}</span>
                    </div>
                    {order.payment_reference && order.payment_reference !== "CASH-PAY" && (
                        <div className="flex justify-between">
                            <span>REF ID:</span>
                            <span className="font-bold">{order.payment_reference}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="text-center mt-8 pt-4 border-t border-dashed border-border print:border-black">
                <p className="font-bold uppercase tracking-wider">Thank you!</p>
                <p className="text-[9px] mt-1">Please come again</p>
            </div>
        </div>
    );
};
