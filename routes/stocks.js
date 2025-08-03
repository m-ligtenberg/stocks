const express = require('express');
const axios = require('axios');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Stock data service (server-side Alpha Vantage integration)
class StockDataService {
    constructor() {
        this.API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
        this.BASE_URL = 'https://www.alphavantage.co/query';
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    }

    async getStockQuote(symbol) {
        const db = getDatabase();
        
        try {
            // Check cache first
            const cachedData = await this.getCachedStock(db, symbol);
            if (cachedData && this.isCacheValid(cachedData.cached_at)) {
                db.close();
                return JSON.parse(cachedData.data);
            }

            // Fetch from API
            const url = `${this.BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.API_KEY}`;
            console.log(`📡 Fetching live data for ${symbol}`);
            
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;

            if (data['Global Quote']) {
                const stockData = this.parseAlphaVantageQuote(data['Global Quote'], symbol);
                
                // Cache the result
                await this.cacheStockData(db, symbol, stockData);
                
                db.close();
                return stockData;
            } else {
                db.close();
                throw new Error(`No data returned for symbol ${symbol}`);
            }
            
        } catch (error) {
            db.close();
            console.error(`❌ Error fetching ${symbol}:`, error.message);
            
            // Return demo data as fallback
            return this.getDemoStockData(symbol);
        }
    }

    async getCachedStock(db, symbol) {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT data, cached_at FROM stock_cache WHERE symbol = ?',
                [symbol],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async cacheStockData(db, symbol, data) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT OR REPLACE INTO stock_cache (symbol, data, cached_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [symbol, JSON.stringify(data)],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    isCacheValid(cachedAt) {
        const cacheTime = new Date(cachedAt).getTime();
        const now = Date.now();
        return (now - cacheTime) < this.CACHE_DURATION;
    }

    parseAlphaVantageQuote(quote, symbol) {
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        
        return {
            symbol: symbol,
            name: this.getCompanyName(symbol),
            price: price,
            change: change,
            changePercent: changePercent,
            volume: parseInt(quote['06. volume']),
            lastUpdated: quote['07. latest trading day'],
            opportunity: this.getOpportunityCategory(price)
        };
    }

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

        const stock = demoData[symbol] || { name: `${symbol} Corporation`, basePrice: Math.random() * 100 + 10 };
        const change = (Math.random() - 0.5) * 10;
        const price = Math.max(0.01, stock.basePrice + change);
        
        return {
            symbol: symbol,
            name: stock.name,
            price: price,
            change: change,
            changePercent: (change / stock.basePrice) * 100,
            volume: Math.floor(Math.random() * 10000000 + 1000000),
            lastUpdated: new Date().toISOString().split('T')[0],
            opportunity: this.getOpportunityCategory(price)
        };
    }

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
            'RIVN': 'Rivian Automotive'
        };
        return companyNames[symbol] || `${symbol} Corporation`;
    }

    getOpportunityCategory(price) {
        if (price < 1) return "Micro-Cap Value";
        if (price < 5) return "Small-Cap Growth";
        if (price < 50) return "Mid-Cap Opportunity";
        return "Large-Cap Investment";
    }
}

const stockService = new StockDataService();

// Get stock quote
router.get('/quote/:symbol', authenticateToken, async (req, res) => {
    try {
        const { symbol } = req.params;
        const stockData = await stockService.getStockQuote(symbol.toUpperCase());
        res.json(stockData);
    } catch (error) {
        console.error('Quote error:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Get multiple stock quotes
router.post('/quotes', authenticateToken, async (req, res) => {
    try {
        const { symbols } = req.body;
        
        if (!Array.isArray(symbols) || symbols.length === 0) {
            return res.status(400).json({ error: 'Symbols array is required' });
        }
        
        if (symbols.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 symbols allowed per request' });
        }
        
        const promises = symbols.map(symbol => stockService.getStockQuote(symbol.toUpperCase()));
        const stockData = await Promise.all(promises);
        
        res.json(stockData);
    } catch (error) {
        console.error('Multi-quote error:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Get popular stocks for opportunities
router.get('/opportunities', authenticateToken, async (req, res) => {
    try {
        const popularSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'NOK', 'AMC', 'HYSR', 'PLTR'];
        
        const promises = popularSymbols.map(symbol => stockService.getStockQuote(symbol));
        const stockData = await Promise.all(promises);
        
        // Categorize by price
        const opportunities = {
            under1: stockData.filter(stock => stock.price < 1),
            under4: stockData.filter(stock => stock.price >= 1 && stock.price < 4),
            under5: stockData.filter(stock => stock.price >= 4)
        };
        
        res.json(opportunities);
    } catch (error) {
        console.error('Opportunities error:', error);
        res.status(500).json({ error: 'Failed to fetch opportunity data' });
    }
});

// Search stocks (simple symbol validation)
router.get('/search/:query', authenticateToken, async (req, res) => {
    try {
        const { query } = req.params;
        
        if (!query || query.length < 1) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const popularStocks = [
            'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX',
            'NOK', 'AMD', 'INTC', 'PLTR', 'AMC', 'GME', 'RIVN', 'LCID',
            'HYSR', 'ACST', 'URG', 'TTI', 'SB', 'DSGN', 'SRNE'
        ];

        const matches = popularStocks
            .filter(symbol => symbol.startsWith(query.toUpperCase()))
            .slice(0, 10);
            
        res.json(matches);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;