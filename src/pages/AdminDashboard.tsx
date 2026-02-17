import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";
import { LogOut } from "lucide-react";

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (!user || user.role !== "admin") {
            navigate("/login");
            return;
        }

        fetch(getApiUrl("/api/dashboard"))
            .then((res) => res.json())
            .then((data) => setStats(data))
            .catch((err) => console.error(err));
    }, [user, navigate]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    if (!stats) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="min-h-screen bg-background p-8 space-y-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">Welcome back, {user?.username}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Daily Sales
                    </h3>
                    <p className="text-4xl font-display font-bold text-primary mt-2">
                        ₱{Number(stats.dailySales).toFixed(2)}
                    </p>
                </div>
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Monthly Sales
                    </h3>
                    <p className="text-4xl font-display font-bold text-foreground mt-2">
                        ₱{Number(stats.monthlySales).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-border/50 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Top Products</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topProducts}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="product_name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="total_qty" fill="#0F5132" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-border/50 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Sales Trend (Last 7 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="amount" stroke="#0F5132" strokeWidth={3} dot={{ r: 4, fill: '#0F5132' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
