import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./server/database.sqlite');

const today = new Date().toISOString().split('T')[0];
const month = today.substring(0, 7);

const querySales = `
    SELECT 
      (SELECT SUM(total) FROM orders WHERE date LIKE ?) as daily_sales,
      (SELECT SUM(total) FROM orders WHERE date LIKE ?) as monthly_sales,
      (SELECT COUNT(*) FROM orders WHERE date LIKE ?) as daily_orders
`;

db.get(querySales, [`${today}%`, `${month}%`, `${today}%`], (err, sales) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Sales raw result:", sales);
    const mapped = {
        dailySales: sales.daily_sales || 0,
        monthlySales: sales.monthly_sales || 0,
        dailyOrders: sales.daily_orders || 0
    };
    console.log("Mapped result:", mapped);
    console.log("JSON stringify:", JSON.stringify(mapped));
    db.close();
});
