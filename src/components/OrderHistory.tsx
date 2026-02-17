import { useEffect, useState, useCallback } from "react";
import { getApiUrl } from "@/lib/api";
import { Clock, User, MapPin, ShoppingBag, RefreshCcw, Printer, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ReceiptView, type Order } from "./ReceiptView";

const OrderHistory = () => {
    const [viewMode, setViewMode] = useState<"today" | "archive">("today");
    const [orders, setOrders] = useState<Order[]>([]);
    const [archiveData, setArchiveData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedArchiveDate, setSelectedArchiveDate] = useState<string | null>(null);

    // Fetch Today's Orders
    const fetchTodayOrders = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(getApiUrl(`/api/orders/history?date=${today}&t=${Date.now()}`));
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setOrders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Fetch Archive Summary
    const fetchArchiveSummary = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/orders/archive-summary?t=${Date.now()}`));
            const data = await res.json();
            setArchiveData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch Specific Date Orders (for Archive Drill-down)
    const fetchDateOrders = async (date: string) => {
        setLoading(true);
        setSelectedArchiveDate(date);
        try {
            const res = await fetch(getApiUrl(`/api/orders/history?date=${date}&t=${Date.now()}`));
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === "today") {
            setSelectedArchiveDate(null);
            fetchTodayOrders();
        } else {
            fetchArchiveSummary();
        }
    }, [viewMode, fetchTodayOrders, fetchArchiveSummary]);

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

    const handlePrint = () => window.print();

    // Group Archive Data by Month
    const groupedArchive = archiveData.reduce((acc: any, curr: any) => {
        const month = new Date(curr.day).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!acc[month]) acc[month] = [];
        acc[month].push(curr);
        return acc;
    }, {});

    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center no-print flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-foreground transition-colors duration-300">Order History</h2>
                    <p className="text-xs text-muted-foreground transition-colors duration-300">
                        {viewMode === "today"
                            ? "Displaying transactions for TODAY"
                            : selectedArchiveDate
                                ? `Viewing Archive: ${new Date(selectedArchiveDate).toLocaleDateString()}`
                                : "Browse past transactions by date"}
                    </p>
                </div>

                <div className="flex bg-muted/50 p-1 rounded-xl gap-1">
                    <button
                        onClick={() => setViewMode("today")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "today" ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setViewMode("archive")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "archive" ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50"}`}
                    >
                        Archives
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCcw className="w-6 h-6 text-primary animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
                    {/* ARCHIVE VIEW - SUMMARY LIST */}
                    {viewMode === "archive" && !selectedArchiveDate && (
                        <div className="space-y-6 animate-fade-in">
                            {Object.entries(groupedArchive).map(([month, days]: [string, any]) => (
                                <div key={month} className="space-y-3">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">{month}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {days.map((day: any) => (
                                            <button
                                                key={day.day}
                                                onClick={() => fetchDateOrders(day.day)}
                                                className="bg-card hover:bg-primary/5 border border-border/50 p-4 rounded-2xl flex items-center justify-between group transition-all hover:scale-[1.02] active:scale-95 text-left"
                                            >
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">
                                                        {new Date(day.day).toLocaleDateString("en-US", { day: 'numeric', weekday: 'long' })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{day.order_count} Orders</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-primary">₱{day.total_sales.toLocaleString()}</p>
                                                    <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">View Logs →</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ORDER GRID (Accessed via Today OR Archive Drill-down) */}
                    {(viewMode === "today" || selectedArchiveDate) && (
                        <>
                            {selectedArchiveDate && (
                                <button
                                    onClick={() => { setSelectedArchiveDate(null); fetchArchiveSummary(); }}
                                    className="mb-4 text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1"
                                >
                                    ← Back to Archives
                                </button>
                            )}

                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <ShoppingBag className="w-12 h-12 mb-4" />
                                    <p>No orders found for this date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 no-print pb-20">
                                    {orders.map((order, index) => (
                                        <Dialog key={order.id} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                                            <DialogTrigger asChild>
                                                <div
                                                    onClick={() => setSelectedOrder(order)}
                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                    className="bg-card rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all border border-border/50 flex flex-col justify-between h-full cursor-pointer group animate-fade-up active:scale-[0.98]"
                                                >
                                                    <div>
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <h3 className="text-base font-bold text-foreground dark:text-card-foreground group-hover:text-primary transition-colors">
                                                                        {order.id}
                                                                    </h3>
                                                                    <span
                                                                        className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest leading-none ${order.type === "delivery"
                                                                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                                            : order.type === "dine-in"
                                                                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                                                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                                                            }`}
                                                                    >
                                                                        {order.type}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1.5 font-bold text-foreground/80 bg-muted/30 px-2 py-0.5 rounded-md">
                                                                        <User className="w-3 h-3 text-primary" />
                                                                        {order.customer_name}
                                                                    </div>
                                                                    {order.type === "delivery" ? (
                                                                        <span className="flex items-center gap-1 min-w-0 flex-1">
                                                                            <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                                                                            <span className="truncate">{order.address || "No Address"}</span>
                                                                        </span>
                                                                    ) : order.table_no && order.table_no !== "N/A" ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 text-primary" />
                                                                            Table {order.table_no}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-primary">₱{Number(order.total || 0).toFixed(2)}</p>
                                                                <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1.5 mt-1 font-medium">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(order.date)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-border/50">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Summary</p>
                                                                <p className="text-[10px] font-bold text-primary group-hover:underline underline-offset-4">View Full Receipt</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(order.items || []).slice(0, 3).map((item, idx) => (
                                                                    <span key={idx} className="text-[11px] bg-muted/50 px-2 py-1 rounded-lg text-foreground/70 font-medium">
                                                                        {item.quantity}x {item.name}
                                                                    </span>
                                                                ))}
                                                                {(order.items || []).length > 3 && (
                                                                    <span className="text-[11px] bg-primary/5 text-primary px-2 py-1 rounded-lg font-bold">
                                                                        +{(order.items || []).length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px] rounded-[2rem] bg-card p-0 overflow-hidden border-none shadow-2xl no-print">
                                                <DialogHeader className="p-8 pb-4">
                                                    <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                                        <Printer className="w-6 h-6 text-primary" />
                                                        Order Receipt
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="p-8 pt-0 overflow-y-auto max-h-[70vh]">
                                                    <div className="bg-muted/20 rounded-3xl p-6 mb-6">
                                                        {selectedOrder && <ReceiptView order={selectedOrder} />}
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={handlePrint}
                                                            className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover-lift flex items-center justify-center gap-3"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                            Print Receipt
                                                        </button>
                                                        <DialogTrigger asChild>
                                                            <button className="px-6 py-4 bg-gray-100 dark:bg-muted text-foreground/60 rounded-2xl font-bold text-sm uppercase transition-all hover:bg-gray-200 dark:hover:bg-muted/80">
                                                                Close
                                                            </button>
                                                        </DialogTrigger>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Hidden Print Element */}
            {selectedOrder && (
                <div className="hidden print:block print-only">
                    <ReceiptView order={selectedOrder} />
                </div>
            )}
        </div>
    );
};

export default OrderHistory;
