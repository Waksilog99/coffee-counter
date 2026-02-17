import 'dotenv/config'; // Load env vars first
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import db from './db.js';

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
app.post('/api/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, profile_picture: user.profile_picture } });
    });
});

// Helper to get next sequential Ticket ID
const getNextTicketId = () => {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const datePattern = `ORD-${dateStr}-%`;

        db.get("SELECT COUNT(*) as count FROM orders WHERE id LIKE ?", [datePattern], (err, row) => {
            if (err) return reject(err);
            const nextNum = (row.count + 1).toString().padStart(4, '0');
            resolve(`ORD-${dateStr}-${nextNum}`);
        });
    });
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

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.run("INSERT INTO orders (id, customer_name, table_no, address, total, date, type, payment_method, payment_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [ticketId, customerName, tableNo, address, total, date, type, paymentMethod, paymentReference],
                function (err) {
                    if (err) {
                        console.error("Error creating order header:", err);
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }

                    const stmt = db.prepare("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)");
                    let completed = 0;
                    let hasError = false;

                    items.forEach((item) => {
                        stmt.run(ticketId, item.name, item.quantity, item.price, (err) => {
                            if (hasError) return; // Already failed
                            if (err) {
                                hasError = true;
                                console.error(`Error inserting item [${item.name}]:`, err);
                                stmt.finalize();
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: "Failed to save order items" });
                            }
                            completed++;
                            if (completed === items.length) {
                                stmt.finalize();
                                db.run("COMMIT", (err) => {
                                    if (err) {
                                        console.error("Error committing transaction:", err);
                                        return res.status(500).json({ error: "Transaction commit failed" });
                                    }
                                    console.log(`Order ${ticketId} fully saved with ${items.length} items.`);
                                    res.json({ message: "Order created", orderId: ticketId });
                                });
                            }
                        });
                    });
                }
            );
        });
    } catch (err) {
        console.error("Unexpected error in /api/orders:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Order History (Filtered by Date if provided)
app.get('/api/orders/history', (req, res) => {
    const { date } = req.query;
    let query = `
        SELECT 
            o.id,
            o.customer_name,
            o.table_no,
            o.address,
            o.total,
            o.date,
            o.type,
            o.payment_method,
            o.payment_reference,
            oi.product_name,
            oi.quantity,
            oi.price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    const params = [];
    if (date) {
        query += ` WHERE o.date LIKE ?`;
        params.push(`${date}%`);
    }

    query += ` ORDER BY o.date DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Database error fetching history:", err);
            return res.status(500).json({ error: err.message });
        }

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
    });
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
app.get('/api/dashboard', (req, res) => {
    // Simple stats for now
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7); // YYYY-MM

    const querySales = `
    SELECT 
      (SELECT SUM(total) FROM orders WHERE date LIKE ?) as daily_sales,
      (SELECT SUM(total) FROM orders WHERE date LIKE ?) as monthly_sales,
      (SELECT COUNT(*) FROM orders WHERE date LIKE ?) as daily_orders
  `;

    const queryTopProducts = `
    SELECT product_name, SUM(quantity) as total_qty 
    FROM order_items 
    GROUP BY product_name 
    ORDER BY total_qty DESC 
    LIMIT 5
  `;

    const queryDailyTrend = `
        SELECT substr(date, 1, 10) as day, SUM(total) as amount
        FROM orders
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7
    `;

    db.get(querySales, [`${today}%`, `${month}%`, `${today}%`], (err, sales) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(queryTopProducts, [], (err, topProducts) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(queryDailyTrend, [], (err, trend) => {
                if (err) return res.status(500).json({ error: err.message });
                const s = sales || {};
                res.json({
                    dailySales: s.daily_sales || 0,
                    monthlySales: s.monthly_sales || 0,
                    dailyOrders: s.daily_orders || 0,
                    topProducts,
                    trend: trend.reverse()
                });
            });
        });
    });
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
app.get('/api/employees', authenticateToken, (req, res) => {
    db.all("SELECT id, username, role, name, profile_picture FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create new employee
app.post('/api/employees', authenticateToken, (req, res) => {
    const { username, password, role, name } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'Missing fields' });

    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)", [username, hash, role || 'employee', name], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Employee created' });
    });
});

// Reset password
app.post('/api/employees/reset-password', authenticateToken, (req, res) => {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hash, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Password reset successfully' });
    });
});

// Delete employee
app.delete('/api/employees/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Employee deleted' });
    });
});

// --- Attendance Endpoints ---

// Time In
app.post('/api/attendance/in', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Check if already timed in
    db.get("SELECT * FROM attendance WHERE user_id = ? AND time_out IS NULL", [userId], (err, row) => {
        if (row) return res.status(400).json({ error: 'Already timed in' });

        db.run("INSERT INTO attendance (user_id, time_in) VALUES (?, ?)", [userId, now], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Timed in successfully', time: now });
        });
    });
});

// Time Out
app.post('/api/attendance/out', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const now = new Date().toISOString();

    db.get("SELECT id FROM attendance WHERE user_id = ? AND time_out IS NULL ORDER BY time_in DESC LIMIT 1", [userId], (err, row) => {
        if (!row) return res.status(400).json({ error: 'No active session found' });

        db.run("UPDATE attendance SET time_out = ? WHERE id = ?", [now, row.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Timed out successfully', time: now });
        });
    });
});

// Get My Attendance History
app.get('/api/attendance/me', authenticateToken, (req, res) => {
    db.all("SELECT * FROM attendance WHERE user_id = ? ORDER BY time_in DESC LIMIT 30", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get All Attendance (Admin)
app.get('/api/attendance/all', authenticateToken, (req, res) => {
    const query = `
        SELECT a.*, u.name as employee_name 
        FROM attendance a 
        JOIN users u ON a.user_id = u.id 
        ORDER BY a.time_in DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- User Profile Endpoints ---

// Update Profile Picture
app.post('/api/user/profile-picture', authenticateToken, (req, res) => {
    const { profile_picture } = req.body;
    db.run("UPDATE users SET profile_picture = ? WHERE id = ?", [profile_picture, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Profile picture updated' });
    });
});

// Self Change Password
app.post('/api/user/change-password', authenticateToken, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    db.get("SELECT password FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'User not found' });

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        db.run("UPDATE users SET password = ? WHERE id = ?", [hash, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password updated successfully' });
        });
    });
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

app.get('/api/payroll/me', authenticateToken, (req, res) => {
    db.all("SELECT * FROM attendance WHERE user_id = ? AND time_out IS NOT NULL ORDER BY time_in DESC", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(calculatePayForShifts(rows));
    });
});

app.get('/api/payroll/all', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const query = `
        SELECT a.*, u.name as employee_name, u.role
        FROM attendance a 
        JOIN users u ON a.user_id = u.id 
        WHERE a.time_out IS NOT NULL
        ORDER BY a.time_in DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(calculatePayForShifts(rows));
    });
});

// Mark as Paid (Release Salary)
app.post('/api/payroll/pay/:userId', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const now = new Date().toISOString();

    // Update all 'pending' records that have a time_out (completed shifts)
    const query = `
        UPDATE attendance 
        SET status = 'paid', date_paid = ? 
        WHERE user_id = ? AND status = 'pending' AND time_out IS NOT NULL
    `;

    db.run(query, [now, req.params.userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            message: 'Salary released successfully',
            recordsUpdated: this.changes,
            datePaid: now
        });
    });
});

// --- Category Management Endpoints ---

// Get All Categories
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Category (Admin)
app.post('/api/categories', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Category already exists' });
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: "Category added", name });
    });
});

// Delete Category (Admin)
app.delete('/api/categories/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    db.run("DELETE FROM categories WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Category deleted" });
    });
});

// --- Product Management Endpoints ---

// Get All Products
app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY category, name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add Product (Admin)
app.post('/api/products', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, category, image, description } = req.body;

    if (!name || !price || !category) return res.status(400).json({ error: 'Missing required fields' });

    const sql = `INSERT INTO products (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [name, price, category, image || null, description || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Product added" });
    });
});

// Update Product (Admin)
app.put('/api/products/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, category, image, description } = req.body;
    const { id } = req.params;

    if (!name || !price || !category) return res.status(400).json({ error: 'Missing required fields' });

    const sql = `UPDATE products SET name = ?, price = ?, category = ?, image = ?, description = ? WHERE id = ?`;
    db.run(sql, [name, price, category, image || null, description || null, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Product not found" });
        res.json({ message: "Product updated" });
    });
});

// Delete Product (Admin)
app.delete('/api/products/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    db.run("DELETE FROM products WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product deleted" });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
