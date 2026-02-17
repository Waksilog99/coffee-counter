
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper to run queries
const query = async (text, params) => {
    return await pool.query(text, params);
};

// Initialize DB
const initDb = async () => {
    try {
        // Users Table
        await query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            name TEXT,
            profile_picture TEXT
        )`);

        // Attendance Table
        await query(`CREATE TABLE IF NOT EXISTS attendance (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            time_in TEXT,
            time_out TEXT,
            status TEXT DEFAULT 'pending',
            date_paid TEXT
        )`);

        // Orders Table
        await query(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT,
            table_no TEXT,
            address TEXT,
            total NUMERIC,
            date TEXT,
            type TEXT,
            payment_method TEXT,
            payment_reference TEXT
        )`);

        // Order Items Table
        await query(`CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id TEXT REFERENCES orders(id),
            product_name TEXT,
            quantity INTEGER,
            price NUMERIC
        )`);

        // Products Table
        await query(`CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT,
            price NUMERIC,
            category TEXT,
            image TEXT,
            description TEXT
        )`);

        // Categories Table
        await query(`CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE
        )`);

        // Seed Admin
        const adminUser = 'admin';
        const res = await query("SELECT * FROM users WHERE username = $1", [adminUser]);
        if (res.rows.length === 0) {
            const adminPass = 'admin123';
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(adminPass, salt);
            await query("INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)", [adminUser, hash, 'admin', 'System Admin']);
            console.log("Admin user created.");
        }

        console.log("Postgres tables initialized.");
    } catch (err) {
        console.error("Error initializing Postgres DB:", err);
    }
};

// Auto-init on load if DB_URL is present (or we can call it explicitly)
if (process.env.DATABASE_URL) {
    initDb();
}

export default {
    // Users
    users: {
        findByUsername: async (username) => {
            const res = await query("SELECT * FROM users WHERE username = $1", [username]);
            return res.rows[0];
        },
        findById: async (id) => {
            const res = await query("SELECT * FROM users WHERE id = $1", [id]);
            return res.rows[0];
        },
        getAll: async () => {
            const res = await query("SELECT id, username, role, name, profile_picture FROM users");
            return res.rows;
        },
        create: async (user) => {
            const res = await query(
                "INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING id",
                [user.username, user.password, user.role, user.name]
            );
            return { id: res.rows[0].id };
        },
        updatePassword: async (id, password) => {
            await query("UPDATE users SET password = $1 WHERE id = $2", [password, id]);
            return { id };
        },
        updateProfilePicture: async (id, url) => {
            await query("UPDATE users SET profile_picture = $1 WHERE id = $2", [url, id]);
            return { id };
        },
        delete: async (id) => {
            await query("DELETE FROM users WHERE id = $1", [id]);
            return { id };
        }
    },

    // Products
    products: {
        getAll: async () => {
            const res = await query("SELECT * FROM products ORDER BY category, name");
            return res.rows;
        },
        create: async (p) => {
            const res = await query(
                "INSERT INTO products (name, price, category, image, description) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [p.name, p.price, p.category, p.image, p.description]
            );
            return { id: res.rows[0].id };
        },
        update: async (id, p) => {
            await query(
                "UPDATE products SET name = $1, price = $2, category = $3, image = $4, description = $5 WHERE id = $6",
                [p.name, p.price, p.category, p.image, p.description, id]
            );
            return { id };
        },
        delete: async (id) => {
            await query("DELETE FROM products WHERE id = $1", [id]);
            return { id };
        }
    },

    // Categories
    categories: {
        getAll: async () => {
            const res = await query("SELECT * FROM categories ORDER BY name");
            return res.rows;
        },
        create: async (name) => {
            const res = await query("INSERT INTO categories (name) VALUES ($1) RETURNING id", [name]);
            return { id: res.rows[0].id };
        },
        delete: async (id) => {
            await query("DELETE FROM categories WHERE id = $1", [id]);
            return { id };
        }
    },

    // Attendance
    attendance: {
        findActiveSession: async (userId) => {
            const res = await query("SELECT * FROM attendance WHERE user_id = $1 AND time_out IS NULL ORDER BY time_in DESC LIMIT 1", [userId]);
            return res.rows[0];
        },
        timeIn: async (userId, time) => {
            const res = await query("INSERT INTO attendance (user_id, time_in) VALUES ($1, $2) RETURNING id", [userId, time]);
            return { id: res.rows[0].id };
        },
        timeOut: async (id, time) => {
            await query("UPDATE attendance SET time_out = $1 WHERE id = $2", [time, id]);
            return { id };
        },
        getHistory: async (userId, limit = 30) => {
            const res = await query("SELECT * FROM attendance WHERE user_id = $1 ORDER BY time_in DESC LIMIT $2", [userId, limit]);
            return res.rows;
        },
        getAll: async () => {
            const res = await query("SELECT a.*, u.name as employee_name, u.role FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.time_in DESC");
            return res.rows;
        },
        getCompleted: async () => {
            const res = await query("SELECT a.*, u.name as employee_name, u.role FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.time_out IS NOT NULL ORDER BY a.time_in DESC");
            return res.rows;
        },
        markAsPaid: async (userId, date, status) => {
            await query("UPDATE attendance SET status = $1, date_paid = $2 WHERE user_id = $3 AND status = 'pending' AND time_out IS NOT NULL", [status, date, userId]);
            return { success: true };
        }
    },

    // Orders
    orders: {
        countToday: async (pattern) => {
            // Pattern like ORD-20230101-%
            const res = await query("SELECT COUNT(*) as count FROM orders WHERE id LIKE $1", [pattern]);
            return { count: parseInt(res.rows[0].count) };
        },

        create: async (order) => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    "INSERT INTO orders (id, customer_name, table_no, address, total, date, type, payment_method, payment_reference) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                    [order.id, order.customerName, order.tableNo, order.address, order.total, order.date, order.type, order.paymentMethod, order.paymentReference]
                );

                for (const item of order.items) {
                    await client.query(
                        "INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ($1, $2, $3, $4)",
                        [order.id, item.name, item.quantity, item.price]
                    );
                }

                await client.query('COMMIT');
                return order.id;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        },

        getAll: async (date) => {
            let text = `
                SELECT o.*, oi.product_name, oi.quantity, oi.price
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
            `;
            const params = [];
            if (date) {
                text += ` WHERE o.date LIKE $1`;
                params.push(`${date}%`);
            }
            text += ` ORDER BY o.date DESC`;

            const res = await query(text, params);
            return res.rows;
        },

        getStats: async (today, month) => {
            // Postgres aggregation
            const salesRes = await query(`
             SELECT 
               (SELECT SUM(total) FROM orders WHERE date LIKE $1) as daily_sales,
               (SELECT SUM(total) FROM orders WHERE date LIKE $2) as monthly_sales,
               (SELECT COUNT(*) FROM orders WHERE date LIKE $3) as daily_orders
             `, [`${today}%`, `${month}%`, `${today}%`]);

            const topProductsRes = await query(`
             SELECT product_name, SUM(quantity) as total_qty 
             FROM order_items 
             GROUP BY product_name 
             ORDER BY total_qty DESC 
             LIMIT 5
             `);

            const trendRes = await query(`
             SELECT substring(date, 1, 10) as day, SUM(total) as amount
             FROM orders
             GROUP BY day
             ORDER BY day DESC
             LIMIT 7
             `);

            return {
                sales: salesRes.rows[0],
                topProducts: topProductsRes.rows,
                trend: trendRes.rows
            };
        }
    }
};
