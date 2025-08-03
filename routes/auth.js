const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    
    // Validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const db = getDatabase();
    
    try {
        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            db.close();
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        
        // Create user
        const userId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
                [email, passwordHash, firstName || null, lastName || null],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Create initial portfolio
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO user_portfolios (user_id, cash_balance, total_value) VALUES (?, ?, ?)',
                [userId, 10000.00, 10000.00],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Generate JWT token
        const token = jwt.sign(
            { userId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        db.close();
        
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                email,
                firstName: firstName || null,
                lastName: lastName || null
            },
            token
        });
        
    } catch (error) {
        db.close();
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const db = getDatabase();
    
    try {
        // Find user
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!user) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            db.close();
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        db.close();
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            },
            token
        });
        
    } catch (error) {
        db.close();
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// JWT verification middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        req.user = decoded;
        next();
    });
}

// Verify token endpoint
router.post('/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.userId,
            email: req.user.email
        }
    });
});

// Logout (client-side token removal, but we can blacklist tokens in the future)
router.post('/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logout successful' });
});

module.exports = { router, authenticateToken };