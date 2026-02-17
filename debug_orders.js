import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    console.log("--- ORDERS ---");
    db.all("SELECT * FROM orders", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });

    console.log("--- ORDER ITEMS ---");
    db.all("SELECT * FROM order_items", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});
