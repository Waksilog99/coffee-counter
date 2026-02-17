import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users/Employees Table (Consolidated)
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      name TEXT,
      profile_picture TEXT
    )`);

        // Attendance Table
        db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      time_in TEXT,
      time_out TEXT,
      status TEXT DEFAULT 'pending',
      date_paid TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

        // Orders Table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      table_no TEXT,
      address TEXT,
      total REAL,
      date TEXT,
      type TEXT,
      payment_method TEXT,
      payment_reference TEXT
    )`);

        // Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      product_name TEXT,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )`);

        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        category TEXT,
        image TEXT,
        description TEXT
    )`);

        // Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`);

        // Seed Admin User
        const adminUser = 'admin';
        const adminPass = 'admin123';

        db.get("SELECT * FROM users WHERE username = ?", [adminUser], (err, row) => {
            if (!row) {
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(adminPass, salt);
                db.run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)", [adminUser, hash, 'admin', 'System Admin']);
                console.log("Admin user created.");
            }
        });
    });
}

// Wrapper for Promise-based access
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};


export default {
    // Expose raw methods for complex queries if needed, but prefer higher-level abstractions
    run,
    get,
    all,
    raw: db,

    // Users
    users: {
        findByUsername: (username) => get("SELECT * FROM users WHERE username = ?", [username]),
        findById: (id) => get("SELECT * FROM users WHERE id = ?", [id]),
        getAll: () => all("SELECT id, username, role, name, profile_picture FROM users"),
        create: (user) => run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)", [user.username, user.password, user.role, user.name]),
        updatePassword: (id, password) => run("UPDATE users SET password = ? WHERE id = ?", [password, id]),
        updateProfilePicture: (id, url) => run("UPDATE users SET profile_picture = ? WHERE id = ?", [url, id]),
        delete: (id) => run("DELETE FROM users WHERE id = ?", [id])
    },

    // Products
    products: {
        getAll: () => all("SELECT * FROM products ORDER BY category, name"),
        create: (p) => run("INSERT INTO products (name, price, category, image, description) VALUES (?, ?, ?, ?, ?)", [p.name, p.price, p.category, p.image, p.description]),
        update: (id, p) => run("UPDATE products SET name = ?, price = ?, category = ?, image = ?, description = ? WHERE id = ?", [p.name, p.price, p.category, p.image, p.description, id]),
        delete: (id) => run("DELETE FROM products WHERE id = ?", [id])
    },

    // Categories
    categories: {
        getAll: () => all("SELECT * FROM categories ORDER BY name"),
        create: (name) => run("INSERT INTO categories (name) VALUES (?)", [name]),
        delete: (id) => run("DELETE FROM categories WHERE id = ?", [id])
    },

    // Attendance
    attendance: {
        findActiveSession: (userId) => get("SELECT * FROM attendance WHERE user_id = ? AND time_out IS NULL ORDER BY time_in DESC LIMIT 1", [userId]),
        timeIn: (userId, time) => run("INSERT INTO attendance (user_id, time_in) VALUES (?, ?)", [userId, time]),
        timeOut: (id, time) => run("UPDATE attendance SET time_out = ? WHERE id = ?", [time, id]),
        getHistory: (userId, limit = 30) => all("SELECT * FROM attendance WHERE user_id = ? ORDER BY time_in DESC LIMIT ?", [userId, limit]),
        getAll: () => all("SELECT a.*, u.name as employee_name, u.role FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.time_in DESC"),
        getCompleted: () => all("SELECT a.*, u.name as employee_name, u.role FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.time_out IS NOT NULL ORDER BY a.time_in DESC"),
        markAsPaid: (userId, date, status) => run("UPDATE attendance SET status = ?, date_paid = ? WHERE user_id = ? AND status = 'pending' AND time_out IS NOT NULL", [status, date, userId])
    },

    // Orders (Complex)
    orders: {
        countToday: (pattern) => get("SELECT COUNT(*) as count FROM orders WHERE id LIKE ?", [pattern]),
        create: (order) => {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    db.run("INSERT INTO orders (id, customer_name, table_no, address, total, date, type, payment_method, payment_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        [order.id, order.customerName, order.tableNo, order.address, order.total, order.date, order.type, order.paymentMethod, order.paymentReference],
                        function (err) {
                            if (err) {
                                db.run("ROLLBACK");
                                return reject(err);
                            }
                            const stmt = db.prepare("INSERT INTO order_items (order_id, product_name, quantity, price) VALUES (?, ?, ?, ?)");
                            order.items.forEach(item => {
                                stmt.run(order.id, item.name, item.quantity, item.price);
                            });
                            stmt.finalize((err) => {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return reject(err);
                                }
                                db.run("COMMIT", (err) => {
                                    if (err) reject(err);
                                    else resolve(order.id);
                                });
                            });
                        }
                    );
                });
            });
        },
        getAll: (date) => {
            let query = `
                SELECT o.*, oi.product_name, oi.quantity, oi.price
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
            `;
            const params = [];
            if (date) {
                query += ` WHERE o.date LIKE ?`;
                params.push(`${date}%`);
            }
            query += ` ORDER BY o.date DESC`;
            return all(query, params);
        },
        getStats: async (today, month) => {
            // Reusing the complex SQL for stats as it's efficient in SQLite
            const sales = await get(`
            SELECT 
              (SELECT SUM(total) FROM orders WHERE date LIKE ?) as daily_sales,
              (SELECT SUM(total) FROM orders WHERE date LIKE ?) as monthly_sales,
              (SELECT COUNT(*) FROM orders WHERE date LIKE ?) as daily_orders
            `, [`${today}%`, `${month}%`, `${today}%`]);

            const topProducts = await all(`
            SELECT product_name, SUM(quantity) as total_qty 
            FROM order_items 
            GROUP BY product_name 
            ORDER BY total_qty DESC 
            LIMIT 5
            `);

            const trend = await all(`
            SELECT substr(date, 1, 10) as day, SUM(total) as amount
            FROM orders
            GROUP BY day
            ORDER BY day DESC
            LIMIT 7
            `);

            return { sales, topProducts, trend };
        }
    }
};
