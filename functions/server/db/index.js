import 'dotenv/config';
import sqliteAdapter from './sqlite.js';

import firestoreAdapter from './firestore.js';

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

console.log(`Using Database Adapter: ${DB_TYPE}`);

let db;

if (DB_TYPE === 'firestore') {
    db = firestoreAdapter;
} else {
    db = sqliteAdapter;
}

export default db;
