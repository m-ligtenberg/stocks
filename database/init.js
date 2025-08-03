const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DATABASE_URL || './lupo.db';

// Create database connection
function createConnection() {
    return new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            throw err;
        }
    });
}

// Initialize database with tables
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = createConnection();
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Create tables
        db.serialize(() => {
            // Users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    avatar_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // User portfolios table
            db.run(`
                CREATE TABLE IF NOT EXISTS user_portfolios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    cash_balance DECIMAL(15,2) DEFAULT 10000.00,
                    total_value DECIMAL(15,2) DEFAULT 10000.00,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            
            // User watchlists table
            db.run(`
                CREATE TABLE IF NOT EXISTS user_watchlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    name TEXT NOT NULL,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, symbol)
                )
            `);
            
            // User holdings table
            db.run(`
                CREATE TABLE IF NOT EXISTS user_holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    name TEXT NOT NULL,
                    shares DECIMAL(10,4) NOT NULL DEFAULT 0,
                    average_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
                    current_price DECIMAL(10,4) DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, symbol)
                )
            `);
            
            // Transactions table
            db.run(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
                    shares DECIMAL(10,4) NOT NULL,
                    price DECIMAL(10,4) NOT NULL,
                    total_amount DECIMAL(15,2) NOT NULL,
                    fees DECIMAL(10,2) DEFAULT 0,
                    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `);
            
            // Stock cache table (for API rate limiting)
            db.run(`
                CREATE TABLE IF NOT EXISTS stock_cache (
                    symbol TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create indexes
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            db.run('CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON user_watchlists(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON user_holdings(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol)');
            db.run('CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol ON stock_cache(symbol)');
            
            console.log('✅ Database tables created successfully');
        });
        
        // Create demo user
        createDemoUser(db, (err) => {
            db.close((closeErr) => {
                if (closeErr) {
                    console.error('❌ Error closing database:', closeErr);
                    reject(closeErr);
                } else if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}

// Create demo user for testing
function createDemoUser(db, callback) {
    const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@lupo.com';
    const demoPassword = process.env.DEMO_USER_PASSWORD || 'demo123';
    
    // Check if demo user already exists
    db.get('SELECT id FROM users WHERE email = ?', [demoEmail], (err, row) => {
        if (err) {
            console.error('❌ Error checking for demo user:', err);
            return callback(err);
        }
        
        if (row) {
            console.log('ℹ️ Demo user already exists');
            return callback();
        }
        
        // Create demo user
        bcrypt.hash(demoPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12, (hashErr, hash) => {
            if (hashErr) {
                console.error('❌ Error hashing demo password:', hashErr);
                return callback(hashErr);
            }
            
            db.run(
                'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
                [demoEmail, hash, 'Demo', 'User'],
                function(insertErr) {
                    if (insertErr) {
                        console.error('❌ Error creating demo user:', insertErr);
                        return callback(insertErr);
                    }
                    
                    const userId = this.lastID;
                    console.log(`✅ Demo user created with ID: ${userId}`);
                    
                    // Create portfolio for demo user
                    db.run(
                        'INSERT INTO user_portfolios (user_id, cash_balance, total_value) VALUES (?, ?, ?)',
                        [userId, 10000.00, 10000.00],
                        (portfolioErr) => {
                            if (portfolioErr) {
                                console.error('❌ Error creating demo portfolio:', portfolioErr);
                                return callback(portfolioErr);
                            }
                            
                            console.log('✅ Demo user portfolio created');
                            callback();
                        }
                    );
                }
            );
        });
    });
}

// Get database connection (for use in routes)
function getDatabase() {
    return createConnection();
}

// Close database connection
function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};