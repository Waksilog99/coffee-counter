import app from './app.js';
import db from './db/index.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        if (db.init) {
            console.log('Initializing database...');
            await db.init();
            console.log('Database initialized successfully.');
        }

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
};

startServer();
