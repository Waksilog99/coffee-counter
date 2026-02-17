import 'dotenv/config'; // Load env vars first
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import db from './db/index.js'; // Use new DB abstraction

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'fallback_secret_key'; // Use env var

// Security Headers
app.use(helmet());

// Rate Limiting (Global)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Login Rate Limiter (Stricter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: { error: "Too many login attempts, please try again later." }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Ping Endpoint for connectivity check
app.get('/api/ping', (req, res) => res.send('pong'));

// Login Endpoint
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.users.findByUsername(username);

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, profile_picture: user.profile_picture } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to get next sequential Ticket ID
const getNextTicketId = async () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const datePattern = `ORD-${dateStr}-%`;
    const row = await db.orders.countToday(datePattern);
    const nextNum = (row.count + 1).toString().padStart(4, '0');
    return `ORD-${dateStr}-${nextNum}`;
};

// Endpoint to get next ticket ID for frontend
app.get('/api/orders/next-id', async (req, res) => {
    try {
        const nextId = await getNextTicketId();
        res.json({ nextId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const { id, customerName, tableNo, address, items, total, type, paymentMethod, paymentReference } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Order must contain at least one item" });
        }

        const date = new Date().toISOString();
        const ticketId = id || await getNextTicketId();

        const orderData = {
            id: ticketId,
            customerName,
            tableNo,
            address,
            total,
            date,
            type,
            paymentMethod,
            paymentReference,
            items
        };

        await db.orders.create(orderData);
        console.log(`Order ${ticketId} fully saved with ${items.length} items.`);
        res.json({ message: "Order created", orderId: ticketId });

    } catch (err) {
        console.error("Unexpected error in /api/orders:", err);
        res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
});

// Get Order History (Filtered by Date if provided)
app.get('/api/orders/history', async (req, res) => {
    try {
        const { date } = req.query;
        const rows = await db.orders.getAll(date);

        // Group rows by order id
        const ordersMap = new Map();
        rows.forEach(row => {
            if (!ordersMap.has(row.id)) {
                ordersMap.set(row.id, {
                    id: row.id,
                    customer_name: row.customer_name,
                    table_no: row.table_no,
                    address: row.address,
                    total: row.total,
                    date: row.date,
                    type: row.type,
                    payment_method: row.payment_method,
                    payment_reference: row.payment_reference,
                    items: []
                });
            }
            if (row.product_name) {
                ordersMap.get(row.id).items.push({
                    name: row.product_name,
                    quantity: row.quantity,
                    price: row.price
                });
            }
        });

        const result = Array.from(ordersMap.values());
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Archive Summary (Grouped by Day)
app.get('/api/orders/archive-summary', (req, res) => {
    const query = `
        SELECT 
            substr(date, 1, 7) as month, 
            substr(date, 1, 10) as day, 
            COUNT(*) as order_count, 
            SUM(total) as total_sales 
        FROM orders 
        GROUP BY day 
        ORDER BY day DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Dashboard Stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7); // YYYY-MM

        const { sales, topProducts, trend } = await db.orders.getStats(today, month);
        const s = sales || {};

        res.json({
            dailySales: s.daily_sales || 0,
            monthlySales: s.monthly_sales || 0,
            dailyOrders: s.daily_orders || 0,
            topProducts,
            trend: trend.reverse()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Auth token missing' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- Employee Management Endpoints ---

// Get all employees
app.get('/api/employees', authenticateToken, async (req, res) => {
    try {
        const rows = await db.users.getAll();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new employee
app.post('/api/employees', authenticateToken, async (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });

    const hash = bcrypt.hashSync(password, 10);
    try {
        const result = await db.users.create({ username, password: hash, role: role || 'employee', name });
        res.json({ id: result.id, message: 'Employee created' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Reset password
app.post('/api/employees/reset-password', authenticateToken, async (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const hash = bcrypt.hashSync(newPassword, 10);
    try {
        await db.users.updatePassword(userId, hash);
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete employee
app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
    try {
        await db.users.delete(req.params.id);
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Attendance Endpoints ---

// Time In
app.post('/api/attendance/in', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
        const active = await db.attendance.findActiveSession(userId);
        if (active) return res.status(400).json({ error: 'Already timed in' });

        await db.attendance.timeIn(userId, now);
        res.json({ message: 'Timed in successfully', time: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Time Out
app.post('/api/attendance/out', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    try {
        const active = await db.attendance.findActiveSession(userId);
        if (!active) return res.status(400).json({ error: 'No active session found' });

        await db.attendance.timeOut(active.id, now);
        res.json({ message: 'Timed out successfully', time: now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get My Attendance History
app.get('/api/attendance/me', authenticateToken, async (req, res) => {
    try {
        const rows = await db.attendance.getHistory(req.user.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Attendance (Admin)
app.get('/api/attendance/all', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const rows = await db.attendance.getAll();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Profile Endpoints ---

// Update Profile Picture
app.post('/api/user/profile-picture', authenticateToken, async (req, res) => {
    const { profile_picture } = req.body;
    try {
        await db.users.updateProfilePicture(req.user.id, profile_picture);
        res.json({ message: 'Profile picture updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Self Change Password
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await db.users.findById(req.user.id);
        if (!user) return res.status(500).json({ error: 'User not found' });

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        await db.users.updatePassword(req.user.id, hash);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Payroll Endpoints ---

const MINIMUM_DAILY_PAY = 695;

const calculatePayForShifts = (shifts) => {
    return shifts.map(s => {
        if (!s.time_out) return { ...s, pay: 0, hours: 0 };
        const start = new Date(s.time_in);
        const end = new Date(s.time_out);
        const diffMs = end - start;
        let hours = diffMs / (1000 * 60 * 60);

        // Break Deduction Rule:
        // If shift > 4.5 hours, deduct 1 hour for break.
        // Otherwise, no deduction.
        if (hours > 4.5) {
            hours -= 1;
        }

        // Formula: min(1, EffectiveHours / 8) * 695
        const pay = Math.min(1, hours / 8) * MINIMUM_DAILY_PAY;

        // Ensure paid hours isn't negative (edge case logic)
        const finalHours = Math.max(0, hours);

        return {
            ...s,
            pay: Math.max(0, pay),
            hours: Math.round(finalHours * 100) / 100
        };
    });
};

app.get('/api/payroll/me', authenticateToken, async (req, res) => {
    try {
        const rows = await db.attendance.getHistory(req.user.id); // Reusing logic, but filtering for completed in controller? Adapter has better method
        // Using explicit query for completed shifts matching previous logic
        const completed = rows.filter(r => r.time_out !== null);
        res.json(calculatePayForShifts(completed));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/payroll/all', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        const rows = await db.attendance.getCompleted();
        res.json(calculatePayForShifts(rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark as Paid (Release Salary)
app.post('/api/payroll/pay/:userId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const now = new Date().toISOString();
    try {
        const result = await db.attendance.markAsPaid(req.params.userId, now, 'paid');
        res.json({
            message: 'Salary released successfully',
            recordsUpdated: result.changes,
            datePaid: now
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Category Management Endpoints ---

// Get All Categories
app.get('/api/categories', async (req, res) => {
    try {
        const rows = await db.categories.getAll();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Category (Admin)
app.post('/api/categories', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    try {
        const result = await db.categories.create(name);
        res.json({ id: result.id, message: "Category added", name });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Category already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Delete Category (Admin)
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        await db.categories.delete(req.params.id);
        res.json({ message: "Category deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Product Management Endpoints ---

// Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const rows = await db.products.getAll();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Product (Admin)
app.post('/api/products', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, category, image, description } = req.body;

    if (!name || !price || !category) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const result = await db.products.create({ name, price, category, image, description });
        res.json({ id: result.id, message: "Product added" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Product (Admin)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, category, image, description } = req.body;
    const { id } = req.params;

    if (!name || !price || !category) return res.status(400).json({ error: 'Missing required fields' });

    try {
        const result = await db.products.update(id, { name, price, category, image, description });
        if (result.changes === 0) return res.status(404).json({ error: "Product not found" });
        res.json({ message: "Product updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Product (Admin)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    try {
        await db.products.delete(req.params.id);
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default app;
