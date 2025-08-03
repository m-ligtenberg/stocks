<?php
/**
 * Lupo Trading Platform - Database Configuration
 * Professional SQLite/MySQL configuration with PDO
 */

class Database {
    private $host = 'localhost';
    private $db_name = 'lupo_trading';
    private $username = 'root';
    private $password = '';
    private $conn = null;
    
    // SQLite for development (easier setup)
    private $sqlite_path = __DIR__ . '/../data/lupo.db';
    
    public function getConnection() {
        if ($this->conn === null) {
            try {
                // Try SQLite first (easier for development)
                if (file_exists(dirname($this->sqlite_path))) {
                    $this->conn = new PDO("sqlite:" . $this->sqlite_path);
                    $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $this->conn->exec('PRAGMA foreign_keys = ON');
                } else {
                    // Fallback to MySQL for production
                    $this->conn = new PDO(
                        "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                        $this->username,
                        $this->password
                    );
                    $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                }
            } catch(PDOException $exception) {
                echo "Connection error: " . $exception->getMessage();
                die();
            }
        }
        
        return $this->conn;
    }
    
    public function initializeTables() {
        $conn = $this->getConnection();
        
        try {
            // Users table
            $conn->exec("
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
            ");
            
            // User portfolios table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS user_portfolios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    cash_balance DECIMAL(15,2) DEFAULT 10000.00,
                    total_value DECIMAL(15,2) DEFAULT 10000.00,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            ");
            
            // User watchlists table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS user_watchlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    name TEXT NOT NULL,
                    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, symbol)
                )
            ");
            
            // User holdings table
            $conn->exec("
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
            ");
            
            // Transactions table
            $conn->exec("
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
            ");
            
            // Stock cache table
            $conn->exec("
                CREATE TABLE IF NOT EXISTS stock_cache (
                    symbol TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // Create indexes
            $conn->exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            $conn->exec('CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON user_watchlists(user_id)');
            $conn->exec('CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON user_holdings(user_id)');
            $conn->exec('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
            
            return true;
        } catch (PDOException $e) {
            error_log("Database initialization error: " . $e->getMessage());
            return false;
        }
    }
    
    public function createDemoUser() {
        $conn = $this->getConnection();
        
        try {
            // Check if demo user exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute(['demo@lupo.com']);
            
            if ($stmt->fetch()) {
                return true; // Demo user already exists
            }
            
            // Create demo user
            $passwordHash = password_hash('demo123', PASSWORD_DEFAULT);
            
            $conn->beginTransaction();
            
            $stmt = $conn->prepare("
                INSERT INTO users (email, password_hash, first_name, last_name) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute(['demo@lupo.com', $passwordHash, 'Demo', 'User']);
            
            $userId = $conn->lastInsertId();
            
            // Create portfolio
            $stmt = $conn->prepare("
                INSERT INTO user_portfolios (user_id, cash_balance, total_value) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$userId, 10000.00, 10000.00]);
            
            $conn->commit();
            return true;
            
        } catch (PDOException $e) {
            $conn->rollback();
            error_log("Demo user creation error: " . $e->getMessage());
            return false;
        }
    }
}
?>