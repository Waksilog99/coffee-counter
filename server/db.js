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

        // Migration: Add columns to users if they don't exist
        db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => { });
        db.run(`ALTER TABLE users ADD COLUMN profile_picture TEXT`, (err) => { });

        // Migration: Add address if it doesn't exist (handle existing DBs)
        db.run(`ALTER TABLE orders ADD COLUMN address TEXT`, (err) => {
            // Ignore error if column already exists
        });

        // Migration: Add payment fields if they don't exist
        db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT`, (err) => { });
        db.run(`ALTER TABLE orders ADD COLUMN payment_reference TEXT`, (err) => { });

        // Migration: Add payroll fields to attendance
        db.run(`ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => { });
        db.run(`ALTER TABLE attendance ADD COLUMN date_paid TEXT`, (err) => { });

        // Order Items Table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      product_name TEXT,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )`);

        // Seed Admin User
        const adminUser = 'admin';
        const adminPass = 'admin123';
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(adminPass, salt);

        db.get("SELECT * FROM users WHERE username = ?", [adminUser], (err, row) => {
            if (!row) {
                db.run("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)", [adminUser, hash, 'admin', 'System Admin']);
                console.log("Admin user created.");
            }
        });
        // Create Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        category TEXT,
        image TEXT,
        description TEXT
    )`, (err) => {
            if (err) return console.error(err.message);

            // Seed Products if empty
            db.get("SELECT count(*) as count FROM products", [], (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding products...");
                    const initialProducts = [
                        // Hot Drinks
                        { name: "Espresso", price: 140, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&q=80" },
                        { name: "Americano", price: 160, category: "Hot Drinks", image: "https://redplatter.ph/restaurant/wp-content/uploads/2016/08/Cafe-Americano-1.jpg" },
                        { name: "Cappuccino", price: 200, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80" },
                        { name: "Latte", price: 220, category: "Hot Drinks", image: "https://nucleuscoffee.com/cdn/shop/articles/Latte-recipe.jpg" },
                        { name: "Mocha", price: 230, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=800&q=80" },
                        { name: "Hot Chocolate", price: 180, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&q=80" },
                        { name: "Chai Latte", price: 210, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1576092762791-2f31f045052c?w=800&q=80" },
                        { name: "Matcha Latte", price: 230, category: "Hot Drinks", image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800&q=80" },
                        // Cold Drinks
                        { name: "Iced Latte", price: 220, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701604599-bb29b5dd73ad?w=800&q=80" },
                        { name: "Iced Americano", price: 180, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80" },
                        { name: "Cold Brew", price: 200, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80" },
                        { name: "Frappuccino", price: 240, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80" },
                        { name: "Lemonade", price: 160, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80" },
                        { name: "Iced Matcha", price: 240, category: "Cold Drinks", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80" },
                        // Pastries
                        { name: "Croissant", price: 140, category: "Pastries", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80" },
                        { name: "Muffin", price: 150, category: "Pastries", image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80" },
                        { name: "Bagel", price: 160, category: "Pastries", image: "https://images.unsplash.com/photo-1585478259715-876a6a81fc08?w=800&q=80" },
                        { name: "Scone", price: 140, category: "Pastries", image: "https://images.unsplash.com/photo-1589118949245-7d38baf380d6?w=800&q=80" },
                        { name: "Cinnamon Roll", price: 180, category: "Pastries", image: "https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=800&q=80" },
                        { name: "Cookie", price: 110, category: "Pastries", image: "https://images.unsplash.com/photo-1499636138143-bd630f5cf386?w=800&q=80" },
                    ];

                    const stmt = db.prepare("INSERT INTO products (name, price, category, image) VALUES (?, ?, ?, ?)");
                    initialProducts.forEach(p => stmt.run(p.name, p.price, p.category, p.image));
                    stmt.finalize();
                }
            });
        });
        // Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )`, (err) => {
            if (err) return console.error(err.message);
            // Seed Categories if empty
            db.get("SELECT count(*) as count FROM categories", [], (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding categories...");
                    const initialCategories = ["Hot Drinks", "Cold Drinks", "Pastries"];
                    const stmt = db.prepare("INSERT INTO categories (name) VALUES (?)");
                    initialCategories.forEach(c => stmt.run(c));
                    stmt.finalize();
                }
            });
        });
    });
}

export default db;
