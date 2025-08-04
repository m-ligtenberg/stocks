/**
 * Portfolio Management Service
 * Handles trading, portfolio tracking, and transaction management
 */
class PortfolioService {
    constructor(apiClient = window.lupoApiClient, config = window.lupoConfig, storage = window.lupoStorage) {
        this.apiClient = apiClient;
        this.config = config;
        this.storage = storage;
        
        this.maxPositionSize = this.config.get('trading.maxPositionSize', 1000000);
        this.maxShareCount = this.config.get('trading.maxShareCount', 100000);
        this.minTradeAmount = this.config.get('trading.minTradeAmount', 1);
        this.defaultCashBalance = this.config.get('trading.defaultCashBalance', 10000);
        this.paperTradingMode = this.config.get('trading.paperTradingMode', true);
        
        this.portfolioCache = null;
        this.cacheTimeout = 30000; // 30 seconds
        this.cacheTimestamp = 0;
    }

    /**
     * Get user portfolio with caching
     */
    async getPortfolio(forceRefresh = false) {
        try {
            // Check cache first
            if (!forceRefresh && this.portfolioCache && this.isCacheValid()) {
                return this.portfolioCache;
            }

            const response = await this.apiClient.get('/user/portfolio');

            if (response.isSuccess()) {
                const portfolio = response.getData();
                
                // Cache the portfolio data
                this.portfolioCache = portfolio;
                this.cacheTimestamp = Date.now();
                
                // Calculate additional metrics
                const metrics = this.calculatePortfolioMetrics(portfolio);
                portfolio.metrics = metrics;
                
                return portfolio;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching portfolio:', error.message);
            return this.getEmptyPortfolio();
        }
    }

    /**
     * Execute a trade (buy/sell)
     */
    async executeTrade(symbol, type, shares, options = {}) {
        try {
            // Validate trade parameters
            const validation = this.validateTrade(symbol, type, shares);
            if (!validation.isValid) {
                throw new ValidationError(validation.error);
            }

            console.log(`📈 Executing ${type} order: ${shares} shares of ${symbol.toUpperCase()}`);
            
            const tradeData = {
                symbol: symbol.toUpperCase().trim(),
                type: type.toLowerCase(),
                shares: parseInt(shares),
                ...options
            };

            const response = await this.apiClient.post('/user/portfolio/trade', tradeData);

            if (response.isSuccess()) {
                const result = response.getData();
                
                // Clear portfolio cache to force refresh
                this.clearCache();
                
                // Dispatch trade event
                this.dispatchTradeEvent('trade:executed', result);
                
                console.log(`✅ Trade executed: ${type} ${shares} ${symbol} at $${result.price}`);
                return result;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error executing trade:', error.message);
            throw new TradingError(`Trade failed: ${error.message}`);
        }
    }

    /**
     * Buy shares of a stock
     */
    async buyStock(symbol, shares, options = {}) {
        return this.executeTrade(symbol, 'buy', shares, options);
    }

    /**
     * Sell shares of a stock
     */
    async sellStock(symbol, shares, options = {}) {
        return this.executeTrade(symbol, 'sell', shares, options);
    }

    /**
     * Get transaction history with pagination
     */
    async getTransactionHistory(page = 1, limit = 25) {
        try {
            const response = await this.apiClient.get(`/user/transactions?page=${page}&limit=${limit}`);

            if (response.isSuccess()) {
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching transactions:', error.message);
            return { data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 } };
        }
    }

    /**
     * Get user watchlist
     */
    async getWatchlist() {
        try {
            const response = await this.apiClient.get('/user/watchlist');

            if (response.isSuccess()) {
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching watchlist:', error.message);
            return [];
        }
    }

    /**
     * Add stock to watchlist
     */
    async addToWatchlist(symbol) {
        try {
            symbol = symbol.toUpperCase().trim();
            
            const response = await this.apiClient.post('/user/watchlist', { symbol });

            if (response.isSuccess()) {
                console.log(`✅ Added ${symbol} to watchlist`);
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error adding to watchlist:', error.message);
            throw new Error(`Failed to add ${symbol} to watchlist: ${error.message}`);
        }
    }

    /**
     * Remove stock from watchlist
     */
    async removeFromWatchlist(symbol) {
        try {
            symbol = symbol.toUpperCase().trim();
            
            const response = await this.apiClient.delete(`/user/watchlist/${symbol}`);

            if (response.isSuccess()) {
                console.log(`✅ Removed ${symbol} from watchlist`);
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error removing from watchlist:', error.message);
            throw new Error(`Failed to remove ${symbol} from watchlist: ${error.message}`);
        }
    }

    /**
     * Reset portfolio to initial state
     */
    async resetPortfolio() {
        try {
            const response = await this.apiClient.post('/user/portfolio/reset');

            if (response.isSuccess()) {
                // Clear cache and notify
                this.clearCache();
                this.dispatchTradeEvent('portfolio:reset', response.getData());
                
                console.log('✅ Portfolio reset successfully');
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error resetting portfolio:', error.message);
            throw new Error(`Failed to reset portfolio: ${error.message}`);
        }
    }

    /**
     * Get user profile
     */
    async getUserProfile() {
        try {
            const response = await this.apiClient.get('/user/profile');

            if (response.isSuccess()) {
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching user profile:', error.message);
            return null;
        }
    }

    /**
     * Validate trade parameters
     */
    validateTrade(symbol, type, shares) {
        if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
            return { isValid: false, error: 'Symbol is required' };
        }

        if (!['buy', 'sell'].includes(type.toLowerCase())) {
            return { isValid: false, error: 'Type must be buy or sell' };
        }

        const numShares = parseInt(shares);
        if (isNaN(numShares) || numShares <= 0) {
            return { isValid: false, error: 'Shares must be a positive number' };
        }

        if (numShares > this.maxShareCount) {
            return { isValid: false, error: `Maximum ${this.maxShareCount} shares allowed per trade` };
        }

        return { isValid: true };
    }

    /**
     * Calculate portfolio metrics
     */
    calculatePortfolioMetrics(portfolio) {
        if (!portfolio.holdings || portfolio.holdings.length === 0) {
            return {
                totalHoldingsValue: 0,
                totalCostBasis: 0,
                totalGainLoss: 0,
                totalGainLossPercent: 0,
                totalPortfolioValue: portfolio.cash_balance || 0,
                positionCount: 0,
                diversificationScore: 0
            };
        }

        let totalHoldingsValue = 0;
        let totalCostBasis = 0;
        let maxPositionValue = 0;

        portfolio.holdings.forEach(holding => {
            const marketValue = holding.market_value || (holding.shares * holding.current_price);
            const costBasis = holding.cost_basis || (holding.shares * holding.average_cost);
            
            totalHoldingsValue += marketValue;
            totalCostBasis += costBasis;
            maxPositionValue = Math.max(maxPositionValue, marketValue);
        });

        const totalGainLoss = totalHoldingsValue - totalCostBasis;
        const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
        const totalPortfolioValue = totalHoldingsValue + (portfolio.cash_balance || 0);
        
        // Simple diversification score (lower concentration = better diversification)
        const concentrationRatio = totalPortfolioValue > 0 ? maxPositionValue / totalPortfolioValue : 0;
        const diversificationScore = Math.max(0, (1 - concentrationRatio) * 100);

        return {
            totalHoldingsValue: Math.round(totalHoldingsValue * 100) / 100,
            totalCostBasis: Math.round(totalCostBasis * 100) / 100,
            totalGainLoss: Math.round(totalGainLoss * 100) / 100,
            totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
            totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
            positionCount: portfolio.holdings.length,
            diversificationScore: Math.round(diversificationScore)
        };
    }

    /**
     * Get empty portfolio structure
     */
    getEmptyPortfolio() {
        return {
            cash_balance: this.defaultCashBalance,
            total_value: this.defaultCashBalance,
            holdings: [],
            updated_at: new Date().toISOString(),
            metrics: {
                totalHoldingsValue: 0,
                totalCostBasis: 0,
                totalGainLoss: 0,
                totalGainLossPercent: 0,
                totalPortfolioValue: this.defaultCashBalance,
                positionCount: 0,
                diversificationScore: 0
            }
        };
    }

    /**
     * Check if cache is valid
     */
    isCacheValid() {
        return (Date.now() - this.cacheTimestamp) < this.cacheTimeout;
    }

    /**
     * Clear portfolio cache
     */
    clearCache() {
        this.portfolioCache = null;
        this.cacheTimestamp = 0;
    }

    /**
     * Dispatch trade events
     */
    dispatchTradeEvent(type, data) {
        const event = new CustomEvent(type, {
            detail: { data, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get position by symbol
     */
    getPosition(portfolio, symbol) {
        if (!portfolio.holdings) return null;
        
        return portfolio.holdings.find(holding => 
            holding.symbol.toUpperCase() === symbol.toUpperCase()
        ) || null;
    }

    /**
     * Check if can afford trade
     */
    canAffordTrade(portfolio, price, shares) {
        const totalCost = price * shares;
        return portfolio.cash_balance >= totalCost;
    }

    /**
     * Check if has enough shares to sell
     */
    hasEnoughShares(portfolio, symbol, shares) {
        const position = this.getPosition(portfolio, symbol);
        return position && position.shares >= shares;
    }

    /**
     * Get portfolio summary
     */
    getPortfolioSummary(portfolio) {
        const metrics = portfolio.metrics || this.calculatePortfolioMetrics(portfolio);
        
        return {
            totalValue: metrics.totalPortfolioValue,
            cashBalance: portfolio.cash_balance,
            holdingsValue: metrics.totalHoldingsValue,
            gainLoss: metrics.totalGainLoss,
            gainLossPercent: metrics.totalGainLossPercent,
            positionCount: metrics.positionCount,
            diversificationScore: metrics.diversificationScore,
            lastUpdated: portfolio.updated_at
        };
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            cacheValid: this.isCacheValid(),
            maxPositionSize: this.maxPositionSize,
            maxShareCount: this.maxShareCount,
            minTradeAmount: this.minTradeAmount,
            paperTradingMode: this.paperTradingMode,
            cacheTimeout: this.cacheTimeout
        };
    }
}

/**
 * Trading Error Class
 */
class TradingError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'TradingError';
        this.details = details;
    }
}

// Create global instance
const lupoPortfolio = new PortfolioService();

// Export for use
window.PortfolioService = PortfolioService;
window.TradingError = TradingError;
window.lupoPortfolio = lupoPortfolio;