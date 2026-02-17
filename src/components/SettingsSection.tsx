import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";
import { UserPlus, Clock, Key, Trash2, User, CheckCircle2, AlertCircle, LogIn, LogOut, History, DollarSign, ChevronRight, Coffee } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { MenuItem } from "@/data/menu";

type Employee = {
    id: number;
    username: string;
    role: string;
    name: string;
};

type Attendance = {
    id: number;
    time_in: string;
    time_out: string | null;
    employee_name?: string;
    pay?: number;
    hours?: number;
    status?: "pending" | "paid";
    date_paid?: string | null;
};

const CollapsibleGroup = ({ group, defaultOpen, isAdmin, formatDate }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Calculate unique days present (based on date string)
    const uniqueDays = new Set(group.items.map((item: any) => new Date(item.time_in).toDateString())).size;

    return (
        <>
            <tr
                onClick={() => setIsOpen(!isOpen)}
                className="bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors group"
            >
                <td colSpan={isAdmin ? 4 : 3} className="px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
                            <span className="text-xs font-black uppercase tracking-widest text-primary/80">{group.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide bg-background px-2 py-1 rounded-md border border-border/50">
                            {uniqueDays} Days Present
                        </span>
                    </div>
                </td>
            </tr>
            {isOpen && group.items.map((att: Attendance) => (
                <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/5 transition-colors animate-in fade-in slide-in-from-top-1 duration-200">
                    <td className="px-8 py-6 text-sm font-bold">{new Date(att.time_in).toLocaleDateString()}</td>
                    {isAdmin && (
                        <td className="px-8 py-6 text-xs font-black uppercase">{att.employee_name || "Unknown"}</td>
                    )}
                    <td className="px-8 py-6 text-sm font-mono text-primary font-bold">{formatDate(att.time_in)}</td>
                    <td className="px-8 py-6 text-sm font-mono text-muted-foreground">{formatDate(att.time_out)}</td>
                </tr>
            ))}
        </>
    );
};

const SettingsSection = () => {
    const [activeTab, setActiveTab] = useState<"employees" | "attendance" | "profile" | "payroll" | "menu">("profile");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
    const [myPayroll, setMyPayroll] = useState<Attendance[]>([]);
    const { products, addProduct, deleteProduct, updateProduct } = useProducts();
    const { categories, addCategory, deleteCategory } = useCategories();
    const [loading, setLoading] = useState(false);

    // Product Form
    const [prodName, setProdName] = useState("");
    const [prodPrice, setProdPrice] = useState("");
    const [prodCategory, setProdCategory] = useState<string>("");

    // Set default category when loaded
    useEffect(() => {
        if (categories.length > 0 && !prodCategory) {
            setProdCategory(categories[0].name);
        }
    }, [categories]);

    const [newCategoryName, setNewCategoryName] = useState("");

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await addCategory.mutateAsync(newCategoryName);
            setNewCategoryName("");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm("Are you sure? Products in this category will remain but might not show up in filters correctly until reassigned.")) return;
        try {
            await deleteCategory.mutateAsync(id);
        } catch (err) {
            console.error(err);
        }
    };
    const [prodImage, setProdImage] = useState("");
    const { token, user, login } = useAuth();

    // ... (rest of state)

    // ... (fetch functions)

    const handleReleaseSalary = async (employeeId: number, employeeName: string) => {
        if (!confirm(`Are you sure you want to release salary for ${employeeName}? This will mark all pending records as PAID.`)) return;

        try {
            const res = await fetch(getApiUrl(`/api/payroll/pay/${employeeId}`), {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`Salary released for ${employeeName}`, { description: `${data.recordsUpdated} shifts marked as paid.` });
                fetchPayroll();
            } else {
                toast.error(data.error || "Failed to release salary");
            }
        } catch (err) {
            toast.error("Technical error");
        }
    };

    // Profile States
    const [profileImage, setProfileImage] = useState<string | null>(user?.profile_picture || null);
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    // Form states
    const [newName, setNewName] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetId, setResetId] = useState<number | null>(null);
    const [resetPassword, setResetPassword] = useState("");

    const fetchEmployees = async () => {
        try {
            const res = await fetch(getApiUrl("/api/employees"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setEmployees(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAttendance = async () => {
        const endpoint = user?.role === "admin" ? "/api/attendance/all" : "/api/attendance/me";
        try {
            const res = await fetch(getApiUrl(endpoint), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setAttendanceHistory(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPayroll = async () => {
        const endpoint = user?.role === "admin" ? "/api/payroll/all" : "/api/payroll/me";
        try {
            const res = await fetch(getApiUrl(endpoint), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setMyPayroll(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === "employees" && user?.role === "admin") fetchEmployees();
        if (activeTab === "attendance") fetchAttendance();
        if (activeTab === "payroll") fetchPayroll();
    }, [activeTab, user?.role]);

    const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const productData = {
                name: prodName,
                price: parseFloat(prodPrice),
                category: prodCategory,
                image: prodImage || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80"
            };

            if (editingProduct) {
                await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
                setEditingProduct(null);
            } else {
                await addProduct.mutateAsync(productData);
            }

            // Success handled in hook
            setProdName(""); setProdPrice(""); setProdImage("");
        } catch (err) {
            console.error("Product Action Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (product: MenuItem) => {
        setEditingProduct(product);
        setProdName(product.name);
        setProdPrice(product.price.toString());
        setProdCategory(product.category);
        setProdImage(product.image);
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setProdName(""); setProdPrice(""); setProdImage("");
    };

    const handleDeleteProduct = async (id: number | string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await deleteProduct.mutateAsync(id);
        } catch (err) {
            console.error("Delete Error:", err);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(getApiUrl("/api/employees"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, username: newUsername, password: newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Employee created successfully");
                setNewName("");
                setNewUsername("");
                setNewPassword("");
                fetchEmployees();
            } else {
                toast.error(data.error || "Failed to create employee");
            }
        } catch (err) {
            toast.error("Technical error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetId) return;
        try {
            const res = await fetch(getApiUrl("/api/employees/reset-password"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: resetId, newPassword: resetPassword })
            });
            if (res.ok) {
                toast.success("Password reset successfully");
                setResetId(null);
                setResetPassword("");
            } else {
                toast.error("Failed to reset password");
            }
        } catch (err) {
            toast.error("Technical error occurred");
        }
    };

    const handleTimeIn = async () => {
        try {
            const res = await fetch(getApiUrl("/api/attendance/in"), {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Timed in successfully!");
                fetchAttendance();
            } else {
                toast.error(data.error || "Time-in failed");
            }
        } catch (err) {
            toast.error("Technical error");
        }
    };

    const handleTimeOut = async () => {
        try {
            const res = await fetch(getApiUrl("/api/attendance/out"), {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Timed out successfully!");
                fetchAttendance();
            } else {
                toast.error(data.error || "Time-out failed");
            }
        } catch (err) {
            toast.error("Technical error");
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const res = await fetch(getApiUrl("/api/user/profile-picture"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ profile_picture: base64 })
                });
                if (res.ok) {
                    setProfileImage(base64);
                    if (user) login(token!, { ...user, profile_picture: base64 });
                    toast.success("Profile picture updated!");
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Upload failed");
                }
            } catch (err) { toast.error("Upload failed"); }
        };
        reader.readAsDataURL(file);
    };

    const handleSelfPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) return toast.error("Passwords do not match");
        try {
            const res = await fetch(getApiUrl("/api/user/change-password"), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
            });
            if (res.ok) {
                toast.success("Password updated!");
                setCurrentPass(""); setNewPass(""); setConfirmPass("");
            } else {
                const data = await res.json();
                toast.error(data.error || "Update failed");
            }
        } catch (err) { toast.error("Technical error"); }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "---";
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const groupDataByMonth = (data: any[], dateKey: string) => {
        return data.reduce((acc, item) => {
            if (!item[dateKey]) return acc;
            const date = new Date(item[dateKey]);
            const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const existing = acc.find((g: any) => g.title === key);
            if (existing) {
                existing.items.push(item);
            } else {
                acc.push({ title: key, items: [item] });
            }
            return acc;
        }, [] as { title: string, items: any[] }[]);
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-up pb-24 md:pb-8">
            <div className="mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-foreground dark:text-foreground tracking-tight mb-2">System Settings</h2>
                <p className="text-xs md:text-sm text-muted-foreground">Manage employee credentials and attendance tracking</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-4 mb-8">
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === "profile"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-white dark:bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                        }`}
                >
                    <User className="w-5 h-5" />
                    Profile
                </button>
                {user?.role === "admin" && (
                    <button
                        onClick={() => setActiveTab("employees")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === "employees"
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white dark:bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                            }`}
                    >
                        <UserPlus className="w-5 h-5" />
                        Management
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("attendance")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === "attendance"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-white dark:bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                        }`}
                >
                    <Clock className="w-5 h-5" />
                    Attendance
                </button>
                <button
                    onClick={() => setActiveTab("payroll")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === "payroll"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-white dark:bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                        }`}
                >
                    <DollarSign className="w-5 h-5" />
                    {user?.role === "admin" ? "Payroll History" : "MyPay"}
                </button>
                {user?.role === "admin" && (
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === "menu"
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white dark:bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted"
                            }`}
                    >
                        <Coffee className="w-5 h-5" />
                        Menu
                    </button>
                )}
            </div>

            {activeTab === "menu" && user?.role === "admin" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Coffee className="w-5 h-5 text-primary" />
                                {editingProduct ? "Edit Product" : "Add New Product"}
                            </h3>
                            <form onSubmit={handleAddProduct} className="space-y-4">
                                {/* ... existing inputs ... */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Product Name</label>
                                    <input value={prodName} onChange={e => setProdName(e.target.value)} className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold" placeholder="e.g. Carabao Latte" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Price (₱)</label>
                                    <input type="number" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold" placeholder="0.00" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Category</label>
                                    <div className="flex gap-2">
                                        <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="flex-1 bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold">
                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Category Management (Mini) */}
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-2 block">Manage Categories</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            placeholder="New Category..."
                                            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            disabled={!newCategoryName.trim()}
                                            className="px-3 bg-primary text-white rounded-xl font-bold text-xs hover:opacity-90 disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(c => (
                                            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-lg text-[10px] font-bold">
                                                {c.name}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCategory(c.id)}
                                                    className="w-4 h-4 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive rounded-full"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Product Image</label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setProdImage("")}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${!prodImage.startsWith("data:") ? "bg-primary/10 text-primary ring-1 ring-primary" : "bg-muted text-muted-foreground"}`}
                                        >
                                            Image URL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProdImage("data:")}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${prodImage.startsWith("data:") ? "bg-primary/10 text-primary ring-1 ring-primary" : "bg-muted text-muted-foreground"}`}
                                        >
                                            Upload File
                                        </button>
                                    </div>

                                    {!prodImage.startsWith("data:") ? (
                                        <input
                                            value={prodImage}
                                            onChange={e => setProdImage(e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold"
                                            placeholder="https://..."
                                        />
                                    ) : (
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setProdImage(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                                            />
                                            {prodImage.length > 10 && (
                                                <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-muted border border-border">
                                                    <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {editingProduct && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-6 py-4 bg-gray-100 dark:bg-muted text-foreground rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-muted/80 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button disabled={loading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                        {editingProduct ? "Update Product" : "Add Product"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden">
                            <div className="p-6 border-b border-border/50 bg-gray-50/50 dark:bg-muted/10">
                                <h3 className="text-xl font-black">Current Menu</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-muted/30 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Product</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Category</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Price</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                                                            <img src={p.image} className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="font-bold text-sm">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">{p.category}</td>
                                                <td className="px-6 py-4 text-sm font-black text-primary">₱{p.price}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(p)}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                            title="Edit Product"
                                                        >
                                                            <div className="w-4 h-4">✏️</div>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card p-10 rounded-[2.5rem] border border-border flex flex-col items-center text-center shadow-sm">
                        <div className="relative group mb-8">
                            <div className="w-40 h-40 rounded-full border-4 border-primary/20 p-2 overflow-hidden bg-muted">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <User size={60} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-2 right-2 p-3 bg-primary text-white rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/30">
                                <UserPlus size={20} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <h3 className="text-2xl font-black mb-1">{user?.name}</h3>
                        <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-8">{user?.role}</p>

                        <div className="w-full space-y-3 pt-6 border-t border-border/50">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-muted-foreground">Username</span>
                                <span className="font-mono bg-muted px-3 py-1 rounded-lg">{user?.username}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-10 rounded-[2.5rem] border border-border shadow-sm">
                        <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-foreground/80">
                            <Key className="text-primary" />
                            Security Settings
                        </h3>
                        <form onSubmit={handleSelfPasswordReset} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPass}
                                    onChange={(e) => setCurrentPass(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full bg-muted/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button className="w-full py-5 bg-foreground text-background dark:bg-white dark:text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/5">
                                Update Password
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === "employees" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Employee Form */}
                    {user?.role === "admin" && (
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card p-6 rounded-[2rem] shadow-sm border border-border">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Add New Employee
                                </h3>
                                <form onSubmit={handleCreateEmployee} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Full Name</label>
                                        <input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Username</label>
                                        <input
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            placeholder="johndoe123"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Initial Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <button
                                        disabled={loading}
                                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >
                                        Create Account
                                    </button>
                                </form>
                            </div>

                            {/* Reset Password Card */}
                            {resetId && (
                                <div className="bg-card p-6 rounded-[2rem] shadow-sm border-2 border-primary/20 animate-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Key className="w-5 h-5 text-primary" />
                                            Reset Password
                                        </h3>
                                        <button onClick={() => setResetId(null)} className="text-muted-foreground hover:text-foreground">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <div className="space-y-1">
                                            <input
                                                type="password"
                                                value={resetPassword}
                                                onChange={(e) => setResetPassword(e.target.value)}
                                                className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                                placeholder="New Password"
                                                required
                                            />
                                        </div>
                                        <button className="w-full py-3 bg-foreground text-background dark:bg-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all">
                                            Update Password
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Employee List */}
                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-[2rem] shadow-sm border border-border overflow-hidden">
                            <div className="p-6 border-b border-border/50">
                                <h3 className="font-bold flex items-center gap-2 text-foreground/80">
                                    <User className="w-4 h-4 text-primary" />
                                    Active Employees
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 dark:bg-muted/30">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Username</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-border/30">
                                        {employees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-muted/10 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-foreground/90">{emp.name}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono bg-gray-100 dark:bg-muted px-2 py-1 rounded-md text-muted-foreground">{emp.username}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${emp.role === "admin" ? "bg-primary/10 text-primary" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700"
                                                        }`}>
                                                        {emp.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setResetId(emp.id); setResetPassword(""); }}
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                            title="Reset Password"
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </button>
                                                        {emp.username !== "admin" && (
                                                            <button
                                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "attendance" && (
                <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-border/50 flex justify-between items-center bg-gray-50/50 dark:bg-muted/10">
                        <h3 className="text-xl font-black">Attendance Logs</h3>
                        {user?.role !== "admin" && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleTimeIn}
                                    className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-600/20"
                                >
                                    Time In
                                </button>
                                <button
                                    onClick={handleTimeOut}
                                    className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 active:scale-95 transition-all shadow-lg shadow-amber-600/20"
                                >
                                    Time Out
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[30%]">Date</th>
                                    {user?.role === "admin" && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[20%]">Employee</th>}
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[25%]">Time In</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-[25%]">Time Out</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {groupDataByMonth(attendanceHistory, 'time_in').map((group, index) => (
                                    <CollapsibleGroup
                                        key={group.title}
                                        group={group}
                                        defaultOpen={index === 0} // Open first group (current month) by default
                                        isAdmin={user?.role === "admin"}
                                        formatDate={formatDate}
                                    />
                                ))}
                                {attendanceHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={user?.role === "admin" ? 4 : 3} className="px-8 py-10 text-center text-muted-foreground font-bold uppercase text-[10px] tracking-widest opacity-50">No logs found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "payroll" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {user?.role === "admin" ? (
                        /* ADMIN VIEW */
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {employees.filter(e => e.role !== 'admin').map(emp => {
                                    const empShifts = myPayroll.filter(p => p.employee_name === emp.name);
                                    const pendingPay = empShifts.filter(p => !p.status || p.status === 'pending').reduce((sum, p) => sum + (p.pay || 0), 0);
                                    const totalPaid = empShifts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.pay || 0), 0);

                                    return (
                                        <div key={emp.id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col justify-between group hover:border-primary/30 transition-all">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-black text-foreground">{emp.name}</h3>
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{emp.role}</p>
                                                    </div>
                                                    <div className="p-2 bg-secondary/50 rounded-full">
                                                        <User size={16} className="text-primary" />
                                                    </div>
                                                </div>

                                                <div className="space-y-3 mb-6">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-muted-foreground uppercase">Pending</span>
                                                        <span className="text-xl font-black text-primary">₱{pendingPay.toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full h-px bg-border/50" />
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground">Total Paid</span>
                                                        <span className="font-bold text-foreground">₱{totalPaid.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleReleaseSalary(emp.id, emp.name)}
                                                disabled={pendingPay === 0}
                                                className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                                            >
                                                {pendingPay > 0 ? "Release Salary" : "All Paid"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Recent Payments Log */}
                            <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-border/50 bg-gray-50/50 dark:bg-muted/10">
                                    <h3 className="text-xl font-black">Payroll History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date Paid</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Employee</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                            {groupDataByMonth(myPayroll.filter(p => p.status === 'paid'), 'date_paid').map((group) => (
                                                <>
                                                    <tr key={group.title} className="bg-muted/20">
                                                        <td colSpan={4} className="px-8 py-3 text-xs font-black uppercase tracking-widest text-primary/80">
                                                            {group.title}
                                                        </td>
                                                    </tr>
                                                    {group.items.map((pay: Attendance) => (
                                                        <tr key={pay.id} className="hover:bg-primary/5 transition-colors">
                                                            <td className="px-8 py-4 text-sm font-bold">{new Date(pay.date_paid || "").toLocaleDateString()}</td>
                                                            <td className="px-8 py-4 text-xs font-black uppercase">{pay.employee_name}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-primary">₱{(pay.pay || 0).toFixed(2)}</td>
                                                            <td className="px-8 py-4">
                                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[9px] font-black uppercase">PAID</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EMPLOYEE VIEW */
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-card p-8 rounded-[2.5rem] border border-border flex flex-col items-center text-center shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Pending Takeout</p>
                                    <h4 className="text-5xl font-black text-primary mb-2">
                                        ₱{myPayroll.filter(p => !p.status || p.status === 'pending').reduce((acc, curr) => acc + (curr.pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h4>
                                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wide">
                                        Accrued / Unpaid
                                    </span>
                                </div>
                                <div className="bg-card p-8 rounded-[2.5rem] border border-border flex flex-col items-center text-center shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Total Received</p>
                                    <h4 className="text-5xl font-black text-foreground">
                                        ₱{myPayroll.filter(p => p.status === 'paid').reduce((acc, curr) => acc + (curr.pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h4>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-500 rounded-full text-[10px] font-black uppercase tracking-wide">
                                        Lifetime Earnings
                                    </span>
                                </div>
                            </div>

                            <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
                                <div className="p-8 border-b border-border/50 bg-gray-50/50 dark:bg-muted/10">
                                    <h3 className="text-xl font-black">Pay Slip History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-muted/30">
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hours</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right border-l border-border/10">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                            {groupDataByMonth(myPayroll, 'time_in').map((group) => (
                                                <>
                                                    <tr key={group.title} className="bg-muted/20">
                                                        <td colSpan={4} className="px-8 py-3 text-xs font-black uppercase tracking-widest text-primary/80">
                                                            {group.title}
                                                        </td>
                                                    </tr>
                                                    {group.items.map((pay: any) => (
                                                        <tr key={pay.id} className="hover:bg-primary/5 transition-colors group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black">{new Date(pay.time_in).toLocaleDateString()}</span>
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(pay.time_in).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className="text-sm font-mono font-bold">{pay.hours} hr</span>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className="text-base font-black text-foreground">₱{(pay.pay || 0).toLocaleString()}</span>
                                                            </td>
                                                            <td className="px-8 py-6 text-right border-l border-border/10">
                                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${pay.status === 'paid'
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                                                    {pay.status || 'PENDING'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsSection;
