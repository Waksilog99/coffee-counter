
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Note: In production, we should use default credentials or a service account path from ENV
// For now, we'll assume GOOGLE_APPLICATION_CREDENTIALS is set or we use a placeholder
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : {};

if (Object.keys(serviceAccount).length > 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    // Fallback for local dev without creds (will fail if actually used)
    console.warn("Firestore adapter initialized without credentials!");
    initializeApp();
}

const db = getFirestore();

// Helper for 'run' style results (mimicking SQLite)
const success = (id) => ({ id, changes: 1 });

export default {
    // Users
    users: {
        findByUsername: async (username) => {
            const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        },
        findById: async (id) => {
            const doc = await db.collection('users').doc(id).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        },
        getAll: async () => {
            const snapshot = await db.collection('users').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        create: async (user) => {
            // Check for unique username
            const existing = await db.collection('users').where('username', '==', user.username).get();
            if (!existing.empty) throw new Error('UNIQUE constraint failed: users.username');

            const res = await db.collection('users').add(user);
            return success(res.id);
        },
        updatePassword: async (id, password) => {
            await db.collection('users').doc(id).update({ password });
            return success(id);
        },
        updateProfilePicture: async (id, url) => {
            await db.collection('users').doc(id).update({ profile_picture: url });
            return success(id);
        },
        delete: async (id) => {
            await db.collection('users').doc(id).delete();
            return success(id);
        }
    },

    // Products
    products: {
        getAll: async () => {
            constsnapshot = await db.collection('products').orderBy('category').orderBy('name').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        create: async (p) => {
            const res = await db.collection('products').add(p);
            return success(res.id);
        },
        update: async (id, p) => {
            await db.collection('products').doc(id).update(p);
            return success(id);
        },
        delete: async (id) => {
            await db.collection('products').doc(id).delete();
            return success(id);
        }
    },

    // Categories
    categories: {
        getAll: async () => {
            const snapshot = await db.collection('categories').orderBy('name').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        create: async (name) => {
            // Check unique
            const existing = await db.collection('categories').where('name', '==', name).get();
            if (!existing.empty) throw new Error('UNIQUE constraint failed: categories.name');

            const res = await db.collection('categories').add({ name });
            return success(res.id);
        },
        delete: async (id) => {
            await db.collection('categories').doc(id).delete();
            return success(id);
        }
    },

    // Attendance
    attendance: {
        findActiveSession: async (userId) => {
            const snapshot = await db.collection('attendance')
                .where('user_id', '==', userId)
                .where('time_out', '==', null)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        timeIn: async (userId, time) => {
            const res = await db.collection('attendance').add({
                user_id: userId,
                time_in: time,
                time_out: null,
                status: 'pending',
                date_paid: null
            });
            return success(res.id);
        },
        timeOut: async (id, time) => {
            await db.collection('attendance').doc(id).update({ time_out: time });
            return success(id);
        },
        getHistory: async (userId, limit = 30) => {
            const snapshot = await db.collection('attendance')
                .where('user_id', '==', userId)
                .orderBy('time_in', 'desc')
                .limit(limit)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
        getAll: async () => {
            // Firestore doesn't support JOINs. We must manual join or denormalize.
            // Strategy: Fetch all attendance, then fetch users. Inefficient for large scale, ok for MVP.
            const attSnap = await db.collection('attendance').orderBy('time_in', 'desc').get();
            const attendance = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fetch all users to map names
            const userSnap = await db.collection('users').get();
            const users = {};
            userSnap.docs.forEach(d => users[d.id] = d.data());

            return attendance.map(a => ({
                ...a,
                employee_name: users[a.user_id]?.name,
                role: users[a.user_id]?.role
            }));
        },
        getCompleted: async () => {
            // Same join logic
            const attSnap = await db.collection('attendance')
                .where('time_out', '!=', null)
                .orderBy('time_in', 'desc') // Requires composite index
                .get();

            const attendance = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const userSnap = await db.collection('users').get();
            const users = {};
            userSnap.docs.forEach(d => users[d.id] = d.data());

            return attendance.map(a => ({
                ...a,
                employee_name: users[a.user_id]?.name,
                role: users[a.user_id]?.role
            }));
        },
        markAsPaid: async (userId, date, status) => {
            const batch = db.batch();
            const snapshot = await db.collection('attendance')
                .where('user_id', '==', userId)
                .where('status', '==', 'pending')
                .where('time_out', '!=', null)
                .get();

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { status, date_paid: date });
            });
            await batch.commit();
            return { changes: snapshot.size };
        }
    },

    // Orders
    orders: {
        countToday: async (pattern) => {
            // Pattern like ORD-20230101-%
            // Firestore regex is hard. We'll query by date range or prefix string match.
            // Assumption: pattern derived from current date.
            const datePrefix = pattern.replace('ORD-', '').split('-')[0]; // YYYYMMDD
            // Actually 'date' field in order is ISO string. 'id' is ORD-...

            const startStr = `ORD-${datePrefix}`;
            const endStr = `ORD-${datePrefix}\uf8ff`;

            const snapshot = await db.collection('orders')
                .where('id', '>=', startStr)
                .where('id', '<=', endStr)
                .count()
                .get();

            return { count: snapshot.data().count };
        },

        create: async (order) => {
            // Transactional write
            // Denormalization: Store items INSIDE the order document
            const cleanOrder = { ...order };
            // Items are already in order.items array

            await db.collection('orders').doc(order.id).set(cleanOrder);
            return order.id;
        },

        getAll: async (date) => {
            let query = db.collection('orders');
            if (date) {
                // date is YYYY-MM-DD
                const start = `${date}T00:00:00`;
                const end = `${date}T23:59:59`;
                query = query.where('date', '>=', start).where('date', '<=', end);
            }
            query = query.orderBy('date', 'desc');

            const snapshot = await query.get();

            // Map to flatten structure expected by frontend (with items denormalized)
            // Frontend expects: { ...order, items: [...] }
            // SQLite adapter returned flat rows that we reduced.
            // Firestore returns objects with items array (if we stored it that way).
            // We just need to ensure the shape matches.

            return snapshot.docs.map(doc => {
                const data = doc.data();
                // If items are nested, we are good.
                return { id: doc.id, ...data };
            });
        },

        getStats: async (today, month) => {
            // Aggregations in Firestore are expensive (reads).
            // For MVP, fetch all orders for month and aggregate in memory.
            // Optimisation: Increment counters in a stats document on create.

            const start = `${month}-01T00:00:00`;
            const end = `${month}-31T23:59:59`;

            const snapshot = await db.collection('orders')
                .where('date', '>=', start)
                .where('date', '<=', end)
                .get();

            const orders = snapshot.docs.map(d => d.data());

            let daily_sales = 0;
            let monthly_sales = 0;
            let daily_orders = 0;
            const productCounts = {};
            const dailyMap = {};

            orders.forEach(o => {
                const total = o.total || 0;
                const isToday = o.date.startsWith(today);

                monthly_sales += total;
                if (isToday) {
                    daily_sales += total;
                    daily_orders += 1;
                }

                // Top products
                if (o.items && Array.isArray(o.items)) {
                    o.items.forEach(i => {
                        productCounts[i.name] = (productCounts[i.name] || 0) + i.quantity;
                    });
                }

                // Trend
                const day = o.date.split('T')[0];
                dailyMap[day] = (dailyMap[day] || 0) + total;
            });

            // Format Top Products
            const topProducts = Object.entries(productCounts)
                .map(([name, total_qty]) => ({ product_name: name, total_qty }))
                .sort((a, b) => b.total_qty - a.total_qty)
                .slice(0, 5);

            // Format Trend (last 7 days from today)
            // Just return all days found in month for now
            const trend = Object.entries(dailyMap)
                .map(([day, amount]) => ({ day, amount }))
                .sort((a, b) => b.day.localeCompare(a.day))
                .slice(0, 7);

            return {
                sales: { daily_sales, monthly_sales, daily_orders },
                topProducts,
                trend
            };
        }
    }
};
