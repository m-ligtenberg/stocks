/**
 * Stock Data Service
 * Handles all stock-related API calls and data management
 */
class StockService {
    constructor(apiClient = window.lupoApiClient, config = window.lupoConfig, storage = window.lupoStorage) {
        this.apiClient = apiClient;
        this.config = config;
        this.storage = storage;
        
        this.cacheTimeout = this.config.get('market.updateInterval', 15000);
        this.batchSize = this.config.get('market.batchSize', 50);
        this.maxWatchlistSize = this.config.get('market.maxWatchlistSize', 100);
        
        this.priceCache = new Map();
        this.subscriptions = new Map();
    }

    /**
     * Fetch single stock quote
     */
    async getStockQuote(symbol) {
        try {
            symbol = symbol.toUpperCase().trim();
            
            // Check cache first
            const cached = this.getCachedPrice(symbol);
            if (cached && this.isCacheValid(cached.timestamp)) {
                return cached.data;
            }

            console.log(`📡 Fetching real-time data for ${symbol}`);
            
            const response = await this.apiClient.get(`/stocks/quote/${symbol}`);
            
            if (response.isSuccess()) {
                const stockData = response.getData();
                
                // Cache the data
                this.setCachedPrice(symbol, stockData);
                
                // Notify subscribers
                this.notifySubscribers(symbol, stockData);
                
                return stockData;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error(`❌ Error fetching data for ${symbol}:`, error.message);
            
            // Return demo data as fallback
            const demoData = this.getDemoStockData(symbol);
            this.setCachedPrice(symbol, demoData);
            return demoData;
        }
    }

    /**
     * Fetch multiple stock quotes
     */
    async getMultipleQuotes(symbols) {
        try {
            if (!Array.isArray(symbols) || symbols.length === 0) {
                throw new Error('Symbols must be a non-empty array');
            }

            if (symbols.length > this.batchSize) {
                throw new Error(`Maximum ${this.batchSize} symbols allowed per request`);
            }

            const cleanSymbols = symbols.map(s => s.toUpperCase().trim());
            
            console.log(`📡 Fetching data for ${cleanSymbols.length} symbols`);
            
            const response = await this.apiClient.post('/stocks/quotes', {
                symbols: cleanSymbols
            });
            
            if (response.isSuccess()) {
                const stocksData = response.getData();
                
                // Cache all data and notify subscribers
                stocksData.forEach(stockData => {
                    this.setCachedPrice(stockData.symbol, stockData);
                    this.notifySubscribers(stockData.symbol, stockData);
                });
                
                return stocksData;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching multiple stocks:', error.message);
            
            // Return demo data as fallback
            return symbols.map(symbol => {
                const demoData = this.getDemoStockData(symbol.toUpperCase());
                this.setCachedPrice(symbol, demoData);
                return demoData;
            });
        }
    }

    /**
     * Search for stocks
     */
    async searchStocks(query) {
        try {
            if (!query || query.trim().length === 0) {
                return [];
            }

            const response = await this.apiClient.get(`/stocks/search?q=${encodeURIComponent(query.trim())}`);
            
            if (response.isSuccess()) {
                return response.getData();
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error searching stocks:', error.message);
            return this.getLocalSearchResults(query);
        }
    }

    /**
     * Get investment opportunities
     */
    async getOpportunities() {
        try {
            const cacheKey = 'opportunities';
            const cached = this.storage.get(cacheKey);
            
            if (cached) {
                return cached;
            }

            const response = await this.apiClient.get('/stocks/opportunities');
            
            if (response.isSuccess()) {
                const opportunities = response.getData();
                
                // Cache for 1 hour
                this.storage.set(cacheKey, opportunities, { ttl: 60 * 60 * 1000 });
                
                return opportunities;
            } else {
                throw new Error(response.getError());
            }
        } catch (error) {
            console.error('❌ Error fetching opportunities:', error.message);
            return this.getDemoOpportunities();
        }
    }

    /**
     * Subscribe to price updates for a symbol
     */
    subscribe(symbol, callback) {
        symbol = symbol.toUpperCase().trim();
        
        if (!this.subscriptions.has(symbol)) {
            this.subscriptions.set(symbol, new Set());
        }
        
        this.subscriptions.get(symbol).add(callback);
        
        // Return unsubscribe function
        return () => {
            const symbolSubs = this.subscriptions.get(symbol);
            if (symbolSubs) {
                symbolSubs.delete(callback);
                if (symbolSubs.size === 0) {
                    this.subscriptions.delete(symbol);
                }
            }
        };
    }

    /**
     * Unsubscribe from price updates
     */
    unsubscribe(symbol, callback) {
        symbol = symbol.toUpperCase().trim();
        const symbolSubs = this.subscriptions.get(symbol);
        
        if (symbolSubs) {
            symbolSubs.delete(callback);
            if (symbolSubs.size === 0) {
                this.subscriptions.delete(symbol);
            }
        }
    }

    /**
     * Get cached price data
     */
    getCachedPrice(symbol) {
        return this.priceCache.get(symbol.toUpperCase());
    }

    /**
     * Set cached price data
     */
    setCachedPrice(symbol, data) {
        this.priceCache.set(symbol.toUpperCase(), {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Check if cached data is still valid
     */
    isCacheValid(timestamp) {
        return (Date.now() - timestamp) < this.cacheTimeout;
    }

    /**
     * Clear price cache
     */
    clearCache() {
        this.priceCache.clear();
    }

    /**
     * Notify subscribers of price updates
     */
    notifySubscribers(symbol, data) {
        const symbolSubs = this.subscriptions.get(symbol);
        if (symbolSubs && symbolSubs.size > 0) {
            symbolSubs.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in stock price subscriber:', error);
                }
            });
        }
    }

    /**
     * Get local search results (fallback)
     */
    getLocalSearchResults(query) {
        const popularStocks = [
            'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX',
            'NOK', 'AMD', 'INTC', 'PLTR', 'AMC', 'GME', 'RIVN', 'LCID',
            'HYSR', 'ACST', 'URG', 'TTI', 'SB', 'DSGN', 'SRNE'
        ];

        const upperQuery = query.toUpperCase();
        return popularStocks
            .filter(symbol => symbol.startsWith(upperQuery))
            .slice(0, 10);
    }

    /**
     * Generate demo stock data for fallback
     */
    getDemoStockData(symbol) {
        const demoData = {
            'AAPL': { name: 'Apple Inc', basePrice: 175.50 },
            'MSFT': { name: 'Microsoft Corp', basePrice: 378.85 },
            'NVDA': { name: 'NVIDIA Corp', basePrice: 875.28 },
            'TSLA': { name: 'Tesla Inc', basePrice: 248.50 },
            'NOK': { name: 'Nokia Corporation', basePrice: 3.92 },
            'HYSR': { name: 'SunHydrogen Inc', basePrice: 0.42 },
            'AMC': { name: 'AMC Entertainment', basePrice: 4.25 }
        };

        const stock = demoData[symbol] || { 
            name: this.getCompanyName(symbol), 
            basePrice: Math.random() * 100 + 10 
        };
        
        const change = (Math.random() - 0.5) * 10;
        const price = Math.max(0.01, stock.basePrice + change);
        
        return {
            symbol: symbol,
            name: stock.name,
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round((change / stock.basePrice) * 10000) / 100,
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            lastUpdated: new Date().toISOString().split('T')[0],
            opportunity: this.getOpportunityCategory(price)
        };
    }

    /**
     * Get demo opportunities data
     */
    getDemoOpportunities() {
        const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NOK', 'AMC', 'HYSR', 'PLTR'];
        const stockData = symbols.map(symbol => this.getDemoStockData(symbol));
        
        return {
            under1: stockData.filter(stock => stock.price < 1),
            under4: stockData.filter(stock => stock.price >= 1 && stock.price < 4),
            under5: stockData.filter(stock => stock.price >= 4)
        };
    }

    /**
     * Get opportunity category based on price
     */
    getOpportunityCategory(price) {
        if (price < 1) return "Micro-Cap Value";
        if (price < 5) return "Small-Cap Growth";
        if (price < 50) return "Mid-Cap Opportunity";
        return "Large-Cap Investment";
    }

    /**
     * Get company name for symbol
     */
    getCompanyName(symbol) {
        const companyNames = {
            'AAPL': 'Apple Inc',
            'MSFT': 'Microsoft Corp',
            'NVDA': 'NVIDIA Corp',
            'AMZN': 'Amazon.com Inc',
            'TSLA': 'Tesla Inc',
            'GOOGL': 'Alphabet Inc',
            'META': 'Meta Platforms',
            'NOK': 'Nokia Corporation',
            'AMD': 'Advanced Micro Devices',
            'INTC': 'Intel Corporation',
            'HYSR': 'SunHydrogen Inc',
            'AMC': 'AMC Entertainment Holdings',
            'GME': 'GameStop Corp',
            'PLTR': 'Palantir Technologies',
            'RIVN': 'Rivian Automotive',
            'LCID': 'Lucid Group Inc',
            'ACST': 'Acasti Pharma Inc',
            'URG': 'Ur-Energy Inc',
            'TTI': 'Tetra Technologies Inc',
            'SB': 'Safe Bulkers Inc',
            'DSGN': 'Design Therapeutics Inc',
            'SRNE': 'Sorrento Therapeutics Inc'
        };
        return companyNames[symbol] || `${symbol} Corporation`;
    }

    /**
     * Start automatic price updates
     */
    startPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            const subscribedSymbols = Array.from(this.subscriptions.keys());
            
            if (subscribedSymbols.length > 0) {
                console.log(`🔄 Updating prices for ${subscribedSymbols.length} symbols`);
                
                try {
                    await this.getMultipleQuotes(subscribedSymbols);
                } catch (error) {
                    console.error('Error updating prices:', error);
                }
            }
        }, this.cacheTimeout);
    }

    /**
     * Stop automatic price updates
     */
    stopPriceUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            cachedSymbols: this.priceCache.size,
            subscribedSymbols: this.subscriptions.size,
            cacheTimeout: this.cacheTimeout,
            batchSize: this.batchSize,
            maxWatchlistSize: this.maxWatchlistSize
        };
    }
}

// Create global instance
const lupoStocks = new StockService();

// Start automatic updates
lupoStocks.startPriceUpdates();

// Export for use
window.StockService = StockService;
window.lupoStocks = lupoStocks;