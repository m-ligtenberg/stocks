/**
 * Portfolio Management Service
 * Handles trading, portfolio tracking, and transaction management
 */
class PortfolioService {
    constructor() {
        this.BASE_URL = '/api/user';
        this.authToken = localStorage.getItem('lupo-auth-token');
    }

    updateAuthToken() {
        this.authToken = localStorage.getItem('lupo-auth-token');
    }

    async getPortfolio() {
        try {
            const response = await fetch(`${this.BASE_URL}/portfolio`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('❌ Error fetching portfolio:', error);
            return null;
        }
    }

    async executeTrade(symbol, action, shares, price) {
        try {
            console.log(`📈 Executing ${action} order: ${shares} shares of ${symbol} at $${price}`);
            
            const response = await fetch(`${this.BASE_URL}/portfolio/trade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbol,
                    action,
                    shares: parseInt(shares),
                    price: parseFloat(price)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error executing trade:', error);
            throw error;
        }
    }

    async getTransactionHistory(limit = 50) {
        try {
            const response = await fetch(`${this.BASE_URL}/transactions?limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error fetching transactions:', error);
            return [];
        }
    }

    async getWatchlist() {
        try {
            const response = await fetch(`${this.BASE_URL}/watchlist`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error fetching watchlist:', error);
            return [];
        }
    }

    async addToWatchlist(symbol) {
        try {
            const response = await fetch(`${this.BASE_URL}/watchlist`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbol })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error adding to watchlist:', error);
            throw error;
        }
    }

    async removeFromWatchlist(symbol) {
        try {
            const response = await fetch(`${this.BASE_URL}/watchlist/${symbol}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error removing from watchlist:', error);
            throw error;
        }
    }

    async resetPortfolio() {
        try {
            const response = await fetch(`${this.BASE_URL}/portfolio/reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Error resetting portfolio:', error);
            throw error;
        }
    }

    calculatePortfolioMetrics(portfolio, holdings) {
        let totalValue = 0;
        let totalCost = 0;
        let totalGainLoss = 0;

        holdings.forEach(holding => {
            const currentValue = holding.shares * holding.current_price;
            const costBasis = holding.shares * holding.average_cost;
            
            totalValue += currentValue;
            totalCost += costBasis;
            totalGainLoss += (currentValue - costBasis);
        });

        const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

        return {
            totalValue,
            totalCost,
            totalGainLoss,
            totalGainLossPercent,
            cashBalance: portfolio.cash_balance,
            totalPortfolioValue: totalValue + portfolio.cash_balance
        };
    }
}