/**
 * Stock Data Service
 * Handles all stock-related API calls and data management
 */
class StockService {
    constructor() {
        this.BASE_URL = '/api/stocks';
        this.authToken = localStorage.getItem('lupo-auth-token');
    }

    updateAuthToken() {
        this.authToken = localStorage.getItem('lupo-auth-token');
    }

    async fetchStockQuote(symbol) {
        try {
            console.log(`📡 Fetching real-time data for ${symbol}`);
            
            const response = await fetch(`${this.BASE_URL}/quote/${symbol}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data;
            } else {
                throw new Error(result.error || 'No data returned');
            }
        } catch (error) {
            console.error(`❌ Error fetching data for ${symbol}:`, error);
            return this.getDemoStockData(symbol);
        }
    }

    async fetchMultipleStocks(symbols) {
        try {
            const response = await fetch(`${this.BASE_URL}/quotes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbols })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data;
            } else {
                throw new Error(result.error || 'No data returned');
            }
        } catch (error) {
            console.error('❌ Error fetching multiple stocks:', error);
            return symbols.map(symbol => this.getDemoStockData(symbol));
        }
    }

    async searchStocks(query) {
        try {
            const response = await fetch(`${this.BASE_URL}/search/${query}`, {
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
            console.error('❌ Error searching stocks:', error);
            return [];
        }
    }

    async getOpportunities() {
        try {
            const response = await fetch(`${this.BASE_URL}/opportunities`, {
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
            console.error('❌ Error fetching opportunities:', error);
            return null;
        }
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
            price: Math.round(price * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round((change / stock.basePrice) * 10000) / 100,
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            lastUpdated: new Date().toISOString().split('T')[0],
            retailInterest: Math.floor(Math.random() * 40 + 40),
            opportunity: this.getOpportunityCategory(price)
        };
    }

    getOpportunityCategory(price) {
        if (price < 1) return "Micro-Cap Value";
        if (price < 5) return "Small-Cap Growth";
        if (price < 50) return "Mid-Cap Opportunity";
        return "Large-Cap Investment";
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
}