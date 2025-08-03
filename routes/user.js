const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    const db = getDatabase();
    
    try {
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
                [req.user.userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!user) {
            db.close();
            return res.status(404).json({ error: 'User not found' });
        }
        
        db.close();
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            createdAt: user.created_at
        });
    } catch (error) {
        db.close();
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// WATCHLIST ENDPOINTS

// Get user watchlist
router.get('/watchlist', authenticateToken, async (req, res) => {
    const db = getDatabase();
    
    try {
        const watchlist = await new Promise((resolve, reject) => {
            db.all(
                'SELECT symbol, name, added_at FROM user_watchlists WHERE user_id = ? ORDER BY added_at DESC',
                [req.user.userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        db.close();
        res.json(watchlist);
    } catch (error) {
        db.close();
        console.error('Watchlist fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch watchlist' });
    }
});

// Add stock to watchlist
router.post('/watchlist', authenticateToken, async (req, res) => {
    const { symbol, name } = req.body;
    
    if (!symbol || !name) {
        return res.status(400).json({ error: 'Symbol and name are required' });
    }
    
    const db = getDatabase();
    
    try {
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT OR REPLACE INTO user_watchlists (user_id, symbol, name) VALUES (?, ?, ?)',
                [req.user.userId, symbol.toUpperCase(), name],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        db.close();
        res.status(201).json({ message: 'Stock added to watchlist' });
    } catch (error) {
        db.close();
        console.error('Watchlist add error:', error);
        res.status(500).json({ error: 'Failed to add stock to watchlist' });
    }
});

// Remove stock from watchlist
router.delete('/watchlist/:symbol', authenticateToken, async (req, res) => {
    const { symbol } = req.params;
    const db = getDatabase();
    
    try {
        const result = await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM user_watchlists WHERE user_id = ? AND symbol = ?',
                [req.user.userId, symbol.toUpperCase()],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
        
        db.close();
        
        if (result === 0) {
            return res.status(404).json({ error: 'Stock not found in watchlist' });
        }
        
        res.json({ message: 'Stock removed from watchlist' });
    } catch (error) {
        db.close();
        console.error('Watchlist remove error:', error);
        res.status(500).json({ error: 'Failed to remove stock from watchlist' });
    }
});

// PORTFOLIO ENDPOINTS

// Get user portfolio
router.get('/portfolio', authenticateToken, async (req, res) => {
    const db = getDatabase();
    
    try {
        // Get portfolio summary
        const portfolio = await new Promise((resolve, reject) => {
            db.get(
                'SELECT cash_balance, total_value, updated_at FROM user_portfolios WHERE user_id = ?',
                [req.user.userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        // Get holdings
        const holdings = await new Promise((resolve, reject) => {
            db.all(
                'SELECT symbol, name, shares, average_cost, current_price, last_updated FROM user_holdings WHERE user_id = ? AND shares > 0',
                [req.user.userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        // Calculate portfolio metrics
        let totalHoldingsValue = 0;
        const processedHoldings = holdings.map(holding => {
            const marketValue = holding.shares * holding.current_price;
            const costBasis = holding.shares * holding.average_cost;
            const unrealizedPnL = marketValue - costBasis;
            const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
            
            totalHoldingsValue += marketValue;
            
            return {
                ...holding,
                marketValue: parseFloat(marketValue.toFixed(2)),
                costBasis: parseFloat(costBasis.toFixed(2)),
                unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
                unrealizedPnLPercent: parseFloat(unrealizedPnLPercent.toFixed(2))
            };
        });
        
        const totalPortfolioValue = portfolio.cash_balance + totalHoldingsValue;
        const totalPnL = totalPortfolioValue - 10000; // Initial balance was $10,000
        const totalPnLPercent = (totalPnL / 10000) * 100;
        
        db.close();
        
        res.json({
            cashBalance: parseFloat(portfolio.cash_balance),
            totalValue: parseFloat(totalPortfolioValue.toFixed(2)),
            holdingsValue: parseFloat(totalHoldingsValue.toFixed(2)),
            totalPnL: parseFloat(totalPnL.toFixed(2)),
            totalPnLPercent: parseFloat(totalPnLPercent.toFixed(2)),
            positionsCount: holdings.length,
            holdings: processedHoldings,
            updatedAt: portfolio.updated_at
        });
    } catch (error) {
        db.close();
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Execute trade (buy/sell)
router.post('/portfolio/trade', authenticateToken, async (req, res) => {
    const { symbol, name, type, shares, price } = req.body;
    
    // Validation
    if (!symbol || !name || !type || !shares || !price) {
        return res.status(400).json({ error: 'All trade parameters are required' });
    }
    
    if (!['buy', 'sell'].includes(type)) {
        return res.status(400).json({ error: 'Trade type must be buy or sell' });
    }
    
    if (shares <= 0 || price <= 0) {
        return res.status(400).json({ error: 'Shares and price must be positive numbers' });
    }
    
    const db = getDatabase();
    
    try {
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Get current portfolio
        const portfolio = await new Promise((resolve, reject) => {
            db.get(
                'SELECT cash_balance FROM user_portfolios WHERE user_id = ?',
                [req.user.userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        const totalCost = shares * price;
        
        if (type === 'buy') {
            // Check if user has enough cash
            if (portfolio.cash_balance < totalCost) {
                await new Promise((resolve, reject) => {
                    db.run('ROLLBACK', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                db.close();
                return res.status(400).json({ error: 'Insufficient cash balance' });
            }
            
            // Update or create holding
            const existingHolding = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT shares, average_cost FROM user_holdings WHERE user_id = ? AND symbol = ?',
                    [req.user.userId, symbol.toUpperCase()],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (existingHolding) {
                // Update existing holding (weighted average cost)
                const totalShares = existingHolding.shares + shares;
                const totalCostBasis = (existingHolding.shares * existingHolding.average_cost) + totalCost;
                const newAverageCost = totalCostBasis / totalShares;
                
                await new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE user_holdings SET shares = ?, average_cost = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ? AND symbol = ?',
                        [totalShares, newAverageCost, price, req.user.userId, symbol.toUpperCase()],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            } else {
                // Create new holding
                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO user_holdings (user_id, symbol, name, shares, average_cost, current_price) VALUES (?, ?, ?, ?, ?, ?)',
                        [req.user.userId, symbol.toUpperCase(), name, shares, price, price],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            
            // Update cash balance
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE user_portfolios SET cash_balance = cash_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                    [totalCost, req.user.userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
        } else { // sell
            // Check if user has enough shares
            const existingHolding = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT shares, average_cost FROM user_holdings WHERE user_id = ? AND symbol = ?',
                    [req.user.userId, symbol.toUpperCase()],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (!existingHolding || existingHolding.shares < shares) {
                await new Promise((resolve, reject) => {
                    db.run('ROLLBACK', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                db.close();
                return res.status(400).json({ error: 'Insufficient shares to sell' });
            }
            
            // Update holding
            const remainingShares = existingHolding.shares - shares;
            
            if (remainingShares > 0) {
                await new Promise((resolve, reject) => {
                    db.run(
                        'UPDATE user_holdings SET shares = ?, current_price = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ? AND symbol = ?',
                        [remainingShares, price, req.user.userId, symbol.toUpperCase()],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            } else {
                // Remove holding if all shares sold
                await new Promise((resolve, reject) => {
                    db.run(
                        'DELETE FROM user_holdings WHERE user_id = ? AND symbol = ?',
                        [req.user.userId, symbol.toUpperCase()],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            
            // Update cash balance
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE user_portfolios SET cash_balance = cash_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                    [totalCost, req.user.userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        // Record transaction
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO transactions (user_id, symbol, name, type, shares, price, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.userId, symbol.toUpperCase(), name, type, shares, price, totalCost],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        db.close();
        
        res.json({
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} order executed successfully`,
            trade: {
                symbol: symbol.toUpperCase(),
                name,
                type,
                shares,
                price,
                totalAmount: totalCost
            }
        });
        
    } catch (error) {
        // Rollback on error
        try {
            await new Promise((resolve, reject) => {
                db.run('ROLLBACK', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }
        
        db.close();
        console.error('Trade execution error:', error);
        res.status(500).json({ error: 'Failed to execute trade' });
    }
});

// Reset portfolio
router.post('/portfolio/reset', authenticateToken, async (req, res) => {
    const db = getDatabase();
    
    try {
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Clear all holdings
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM user_holdings WHERE user_id = ?',
                [req.user.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Clear all transactions
        await new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM transactions WHERE user_id = ?',
                [req.user.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Reset portfolio
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE user_portfolios SET cash_balance = 10000.00, total_value = 10000.00, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [req.user.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        db.close();
        res.json({ message: 'Portfolio reset successfully' });
    } catch (error) {
        try {
            await new Promise((resolve, reject) => {
                db.run('ROLLBACK', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }
        
        db.close();
        console.error('Portfolio reset error:', error);
        res.status(500).json({ error: 'Failed to reset portfolio' });
    }
});

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
    const db = getDatabase();
    
    try {
        const transactions = await new Promise((resolve, reject) => {
            db.all(
                'SELECT symbol, name, type, shares, price, total_amount, fees, executed_at FROM transactions WHERE user_id = ? ORDER BY executed_at DESC LIMIT 50',
                [req.user.userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        db.close();
        res.json(transactions);
    } catch (error) {
        db.close();
        console.error('Transactions fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

module.exports = router;