import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./server/database.sqlite');

const today = new Date().toISOString().split('T')[0];
console.log(`Checking orders for: ${today}`);

db.all("SELECT date FROM orders", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Total orders in DB: ${rows.length}`);
    const todayOrders = rows.filter(r => r.date.startsWith(today));
    console.log(`Orders today (${today}): ${todayOrders.length}`);

    if (rows.length > 0) {
        console.log("Last 5 order dates:");
        rows.slice(-5).forEach(r => console.log(r.date));
    }
    db.close();
});
