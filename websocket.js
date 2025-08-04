class RealTimeService {
  constructor() {
    this.socket = null;
    this.subscriptions = new Set();
  }

  connect() {
    this.socket = new WebSocket('wss://market-data.lupo.uno');

    this.socket.onopen = () => {
      console.log('📡 Real-time connection established');
      // Resubscribe to existing symbols
      this.subscriptions.forEach(symbol => {
        this.subscribe(symbol);
      });
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleDataUpdate(data);
    };

    this.socket.onclose = () => {
      console.log('Connection closed. Reconnecting...');
      setTimeout(() => this.connect(), 3000);
    };
  }

  subscribe(symbol) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'subscribe', symbol }));
      this.subscriptions.add(symbol);
    }
  }

  unsubscribe(symbol) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: 'unsubscribe', symbol }));
      this.subscriptions.delete(symbol);
    }
  }

  handleDataUpdate(data) {
    // Update prices in UI
    window.lupoPlatform.updateStockPrices(data);
  }
}

// In LupoPlatform class
constructor() {
  // ... existing code ...
  this.realtimeService = new RealTimeService();
  this.realtimeService.connect();
}

updateStockPrices(data) {
  data.forEach(stock => {
    // Update watchlist
    const watchlistItem = this.watchlist.find(item => item.symbol === stock.symbol);
    if (watchlistItem) {
      Object.assign(watchlistItem, stock);
    }
    
    // Update retail opportunities
    Object.keys(this.marketData.retailOpportunities).forEach(category => {
      const index = this.marketData.retailOpportunities[category]
        .findIndex(s => s.symbol === stock.symbol);
      if (index !== -1) {
        Object.assign(this.marketData.retailOpportunities[category][index], stock);
      }
    });
    
    // Update portfolio
    if (this.portfolio[stock.symbol]) {
      this.portfolio[stock.symbol].price = stock.price;
      this.calculatePortfolioValue();
    }
  });
  
  this.renderWatchlist();
  this.renderRetailOpportunities();
  this.updatePortfolioDisplay();
}
