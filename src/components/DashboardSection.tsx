import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import { TrendingUp, Award, DollarSign, Calendar } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-4 border border-border rounded-2xl shadow-xl backdrop-blur-md bg-opacity-90">
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-black text-primary">
                    {typeof payload[0].value === 'number' ? `₱${payload[0].value.toFixed(2)}` : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const DashboardSection = () => {
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    const fetchStats = () => {
        setRetrying(true);
        setError(null);
        fetch(getApiUrl("/api/dashboard"))
            .then((res) => {
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data && !data.error) setStats(data);
                else throw new Error(data.error || "Failed to fetch stats");
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || "Failed to load dashboard data");
                setStats(null); // Ensure we don't show stale/partial data
            })
            .finally(() => setRetrying(false));
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (error) return (
        <div className="flex items-center justify-center h-[400px] p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-md p-8 bg-destructive/5 rounded-[2rem] border border-destructive/20">
                <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-2">
                    <TrendingUp size={32} className="rotate-180" />
                </div>
                <h3 className="text-xl font-black text-foreground">Analytics Unavailable</h3>
                <p className="text-muted-foreground text-sm mb-4">{error}</p>
                <button
                    onClick={fetchStats}
                    disabled={retrying}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {retrying ? "Retrying..." : "Try Again"}
                </button>
            </div>
        </div>
    );

    if (!stats) return (
        <div className="flex items-center justify-center h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Analyzing Statistics...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 p-6 lg:p-10 animate-in fade-in duration-700">
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-foreground dark:text-card-foreground tracking-tight">Analytics Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Real-time performance metrics for Waks Cafe</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-card p-8 rounded-[2rem] border border-border shadow-sm group hover:shadow-md transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={80} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-3 text-primary mb-4">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Daily Sales</h3>
                    </div>
                    <p className="text-5xl font-black text-foreground dark:text-card-foreground">
                        ₱{(stats.dailySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1 rounded-full">
                        LIVE UPDATING
                    </div>
                </div>

                <div className="bg-white dark:bg-card p-8 rounded-[2rem] border border-border shadow-sm group hover:shadow-md transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Calendar size={80} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-3 text-secondary-foreground mb-4">
                        <div className="p-2 bg-secondary/20 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Monthly Sales</h3>
                    </div>
                    <p className="text-5xl font-black text-foreground dark:text-card-foreground">
                        ₱{(stats.monthlySales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-4 text-[10px] font-bold text-muted-foreground px-3 py-1 bg-gray-50 dark:bg-muted w-fit rounded-full uppercase tracking-widest">
                        Current Month
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Trend Chart */}
                <div className="bg-white dark:bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Revenue Trend</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Sales activity over the last 7 days</p>
                        </div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trend}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" opacity={0.2} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    tickFormatter={(val) => `₱${val}`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products Chart */}
                <div className="bg-white dark:bg-card p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Best Sellers</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Most ordered products by quantity</p>
                        </div>
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Award size={20} />
                        </div>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="text-border" opacity={0.2} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="product_name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }}
                                    className="text-muted-foreground"
                                    width={120}
                                />
                                <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.5 }} content={<CustomTooltip />} />
                                <Bar
                                    dataKey="total_qty"
                                    fill="#10b981"
                                    radius={[0, 10, 10, 0]}
                                    barSize={24}
                                    animationDuration={2000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSection;
