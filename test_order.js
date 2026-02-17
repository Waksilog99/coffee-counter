
const fetch = require('node-fetch');

async function testOrder() {
    const orderData = {
        customerName: "Test Employee",
        tableNo: "1",
        address: "",
        items: [
            { name: "Espresso", quantity: 1, price: 120 }
        ],
        total: 120,
        type: "dine-in",
        paymentMethod: "Cash",
        paymentReference: "CASH-PAY"
    };

    try {
        console.log("Sending order...", orderData);
        const res = await fetch("http://localhost:3000/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error("Failed:", res.status, txt);
        } else {
            const data = await res.json();
            console.log("Success:", data);
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testOrder();
