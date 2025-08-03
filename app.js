// Stock Tracker Application - Fixed Version
class StockTracker {
    constructor() {
        // In-memory storage only (no localStorage to avoid sandbox issues)
        this.stocks = {
            under1: [
                {
                    symbol: "SESN",
                    name: "Sesen Bio",
                    price: 0.83,
                    basePrice: 0.83,
                    priceRange: "$0.65 - $0.95",
                    change: 0.05,
                    changePercent: 6.41,
                    sector: "Biotechnology",
                    description: "Oncology-focused biotech with promising immunotherapy pipeline"
                },
                {
                    symbol: "INUV",
                    name: "Inuvo Inc",
                    price: 0.92,
                    basePrice: 0.92,
                    priceRange: "$0.78 - $1.12",
                    change: -0.04,
                    changePercent: -4.17,
                    sector: "Digital Marketing",
                    description: "AI-driven digital marketing and advertising technology"
                },
                {
                    symbol: "GEVO",
                    name: "Gevo Inc",
                    price: 0.67,
                    basePrice: 0.67,
                    priceRange: "$0.55 - $0.85",
                    change: 0.03,
                    changePercent: 4.69,
                    sector: "Clean Energy",
                    description: "Sustainable aviation fuel and renewable chemicals"
                },
                {
                    symbol: "TNXP",
                    name: "Tonix Pharmaceuticals",
                    price: 0.78,
                    basePrice: 0.78,
                    priceRange: "$0.60 - $0.95",
                    change: -0.02,
                    changePercent: -2.50,
                    sector: "Pharmaceuticals",
                    description: "Central nervous system disorders and infectious diseases"
                }
            ],
            under4: [
                {
                    symbol: "TTI",
                    name: "TETRA Technologies",
                    price: 3.24,
                    basePrice: 3.24,
                    priceRange: "$2.50 - $3.54",
                    change: 0.12,
                    changePercent: 3.85,
                    sector: "Oil Services",
                    description: "Oil services company benefiting from energy sector recovery"
                },
                {
                    symbol: "SB", 
                    name: "Safe Bulkers",
                    price: 3.53,
                    basePrice: 3.53,
                    priceRange: "$3.30 - $3.77",
                    change: -0.08,
                    changePercent: -2.22,
                    sector: "Shipping",
                    description: "Dry bulk shipping positioned for global trade recovery"
                },
                {
                    symbol: "TUYA",
                    name: "Tuya Inc",
                    price: 2.37,
                    basePrice: 2.37,
                    priceRange: "$1.95 - $2.79", 
                    change: 0.15,
                    changePercent: 6.76,
                    sector: "IoT Technology",
                    description: "Smart home IoT platform with growth potential"
                },
                {
                    symbol: "NOK",
                    name: "Nokia Corporation",
                    price: 3.92,
                    basePrice: 3.92,
                    priceRange: "~$4.97 (dips under $4)",
                    change: -0.23,
                    changePercent: -5.54,
                    sector: "Telecom Equipment", 
                    description: "5G infrastructure buildout beneficiary"
                },
                {
                    symbol: "FSI",
                    name: "Flexible Solutions International",
                    price: 4.16,
                    basePrice: 4.16,
                    priceRange: "$3.78 - $4.55",
                    change: 0.08,
                    changePercent: 1.96,
                    sector: "Specialty Chemicals",
                    description: "Niche specialty chemicals with agricultural applications"
                }
            ],
            highPotential: [
                {
                    symbol: "DSGN",
                    name: "Design Therapeutics",
                    price: 4.52,
                    basePrice: 4.52,
                    priceRange: "$4.20 - $4.85",
                    change: 0.27,
                    changePercent: 6.35,
                    sector: "Biotechnology",
                    description: "Gene therapy platform with multiple pipeline programs",
                    potential: "High growth biotech with breakthrough gene therapy"
                },
                {
                    symbol: "SRNE", 
                    name: "Sorrento Therapeutics",
                    price: 3.81,
                    basePrice: 3.81,
                    priceRange: "$2.95 - $4.65",
                    change: 0.19,
                    changePercent: 5.25,
                    sector: "Biopharmaceuticals",  
                    description: "Diverse pipeline in oncology and pain management",
                    potential: "Multiple FDA approvals expected in 2025"
                }
            ]
        };

        this.settings = {
            notificationTime: '08:00',
            notificationsEnabled: false,
            theme: 'light',
            stocksEnabled: {
                SESN: true, INUV: true, GEVO: true, TNXP: true,
                TTI: true, SB: true, TUYA: true, NOK: true, FSI: true, DSGN: true, SRNE: true
            }
        };

        this.notificationHistory = [];
        this.priceUpdateInterval = null;
        this.lastNotificationDate = null;
        this.morningNotificationSent = false;
        
        this.init();
    }

    init() {
        console.log('Initializing Stock Tracker...');
        this.setupEventListeners();
        this.applyTheme();
        this.renderStocks();
        this.updateAmsterdamTime();
        this.checkNotificationPermission();
        this.startPriceUpdates();
        
        // Update time every second
        setInterval(() => this.updateAmsterdamTime(), 1000);
        
        console.log('Stock Tracker initialized successfully');
    }

    setupEventListeners() {
        // Notification banner
        const enableBtn = document.getElementById('enable-notifications');
        const dismissBtn = document.getElementById('dismiss-banner');
        
        if (enableBtn) {
            enableBtn.addEventListener('click', () => {
                this.requestNotificationPermission();
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                document.getElementById('notification-banner').classList.add('hidden');
            });
        }

        // Settings
        document.getElementById('test-notification').addEventListener('click', () => {
            this.sendTestNotification();
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            this.settings.notificationTime = document.getElementById('notification-time').value;
            this.showMessage('Settings saved successfully!', 'success');
            console.log('Settings saved:', this.settings);
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearNotificationHistory();
        });

        // Theme selector
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.applyTheme();
            this.showMessage(`Theme changed to ${e.target.value}`, 'info');
        });

        // Stock toggles (delegated event handling)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-switch')) {
                const symbol = e.target.dataset.symbol;
                this.toggleStock(symbol, e.target);
            }
        });
    }

    updateAmsterdamTime() {
        try {
            const now = new Date();
            
            // Create Amsterdam time using proper timezone conversion
            const amsterdamTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Amsterdam"}));
            
            const timeString = amsterdamTime.toLocaleTimeString('en-GB', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = amsterdamTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: "Europe/Amsterdam"
            });

            document.getElementById('amsterdam-time').textContent = timeString;
            document.getElementById('amsterdam-date').textContent = dateString;

            // Check for morning notifications
            this.checkMorningNotification(amsterdamTime);
        } catch (error) {
            console.error('Error updating Amsterdam time:', error);
            // Fallback to local time
            const now = new Date();
            document.getElementById('amsterdam-time').textContent = now.toLocaleTimeString('en-GB', { hour12: false });
            document.getElementById('amsterdam-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    checkMorningNotification(amsterdamTime) {
        if (!this.settings.notificationsEnabled || Notification.permission !== 'granted') {
            return;
        }

        const currentTime = amsterdamTime.toTimeString().slice(0, 5);
        const currentDate = amsterdamTime.toDateString();
        
        // Check if it's the right time and we haven't sent notification today
        if (currentTime === this.settings.notificationTime && 
            this.lastNotificationDate !== currentDate) {
            
            this.sendMorningNotifications();
            this.lastNotificationDate = currentDate;
        }
    }

    async checkNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            this.updateNotificationStatus();
            return;
        }

        const permission = Notification.permission;
        console.log('Notification permission:', permission);
        
        if (permission === 'granted') {
            this.settings.notificationsEnabled = true;
            this.updateNotificationStatus();
            document.getElementById('notification-banner').classList.add('hidden');
        } else if (permission === 'denied') {
            this.settings.notificationsEnabled = false;
            this.updateNotificationStatus();
            document.getElementById('notification-banner').classList.remove('hidden');
        } else {
            document.getElementById('notification-banner').classList.remove('hidden');
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showMessage('This browser does not support notifications', 'error');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('Notification permission result:', permission);
            
            if (permission === 'granted') {
                this.settings.notificationsEnabled = true;
                this.updateNotificationStatus();
                document.getElementById('notification-banner').classList.add('hidden');
                this.showMessage('Notifications enabled successfully!', 'success');
                return true;
            } else {
                this.settings.notificationsEnabled = false;
                this.updateNotificationStatus();
                this.showMessage('Notifications permission denied', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showMessage('Error enabling notifications', 'error');
            return false;
        }
    }

    updateNotificationStatus() {
        const statusElement = document.getElementById('notification-status-text');
        if (this.settings.notificationsEnabled && Notification.permission === 'granted') {
            statusElement.textContent = 'Enabled';
            statusElement.className = 'status status--success';
        } else {
            statusElement.textContent = 'Not Enabled';
            statusElement.className = 'status status--error';
        }
    }

    sendTestNotification() {
        if (!('Notification' in window)) {
            this.showMessage('Notifications not supported', 'error');
            return;
        }

        if (Notification.permission !== 'granted') {
            this.showMessage('Please enable notifications first', 'warning');
            return;
        }

        const enabledStocks = this.getEnabledStocks();
        if (enabledStocks.length === 0) {
            this.showMessage('No stocks enabled for notifications', 'info');
            return;
        }

        const randomStock = enabledStocks[Math.floor(Math.random() * enabledStocks.length)];
        
        try {
            const notification = new Notification('Stock Tracker - Test Alert', {
                body: `${randomStock.symbol}: $${randomStock.price.toFixed(2)} (${randomStock.changePercent > 0 ? '+' : ''}${randomStock.changePercent.toFixed(2)}%)`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2333809F"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
                tag: 'stock-test',
                requireInteraction: false
            });

            this.addToHistory('Test Notification', `Test alert for ${randomStock.symbol}: $${randomStock.price.toFixed(2)}`, 'test');
            this.showMessage('Test notification sent!', 'success');

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

        } catch (error) {
            console.error('Error sending test notification:', error);
            this.showMessage('Error sending notification', 'error');
        }
    }

    sendMorningNotifications() {
        if (Notification.permission !== 'granted') return;

        const enabledStocks = this.getEnabledStocks();
        const alertStocks = enabledStocks.filter(stock => 
            stock.price <= 4 || (stock.price <= 5 && stock.potential)
        );

        if (alertStocks.length === 0) return;

        try {
            // Send summary notification
            const notification = new Notification('Stock Tracker - Morning Alert', {
                body: `${alertStocks.length} stocks under watchlist thresholds. Click to view details.`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2333809F"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
                tag: 'morning-alert',
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            this.addToHistory(
                'Morning Alert', 
                `Watchlist summary: ${alertStocks.length} stocks under thresholds`, 
                'morning'
            );

            console.log('Morning notification sent for', alertStocks.length, 'stocks');
        } catch (error) {
            console.error('Error sending morning notification:', error);
        }
    }

    getEnabledStocks() {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        return allStocks.filter(stock => this.settings.stocksEnabled[stock.symbol]);
    }

    addToHistory(title, message, type) {
        try {
            const amsterdamTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Amsterdam"});
            const currentDate = new Date().toDateString();
            
            this.notificationHistory.unshift({
                title,
                message,
                type,
                timestamp: amsterdamTime,
                date: currentDate
            });

            // Keep only last 50 notifications
            if (this.notificationHistory.length > 50) {
                this.notificationHistory = this.notificationHistory.slice(0, 50);
            }

            this.updateNotificationHistory();
        } catch (error) {
            console.error('Error adding to notification history:', error);
        }
    }

    updateNotificationHistory() {
        const logElement = document.getElementById('notification-log');
        
        if (this.notificationHistory.length === 0) {
            logElement.innerHTML = '<p class="empty-state">No notifications sent yet</p>';
            return;
        }

        logElement.innerHTML = this.notificationHistory.map(notification => `
            <div class="notification-item">
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title}</h4>
                    <p class="notification-message">${notification.message}</p>
                </div>
                <span class="notification-time">${notification.timestamp}</span>
            </div>
        `).join('');
    }

    clearNotificationHistory() {
        this.notificationHistory = [];
        this.updateNotificationHistory();
        this.showMessage('Notification history cleared', 'info');
    }

    applyTheme() {
        const themeSelect = document.getElementById('theme-select');
        themeSelect.value = this.settings.theme;
        document.documentElement.setAttribute('data-color-scheme', this.settings.theme);
    }

    renderStocks() {
        this.renderStockGrid('stocks-under-1', this.stocks.under1, false);
        this.renderStockGrid('stocks-under-4', this.stocks.under4, false);
        this.renderStockGrid('high-potential-stocks', this.stocks.highPotential, true);
    }

    renderStockGrid(containerId, stocks, isHighPotential) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        container.innerHTML = stocks.map(stock => this.createStockCard(stock, isHighPotential)).join('');
    }

    createStockCard(stock, isHighPotential) {
        const isEnabled = this.settings.stocksEnabled[stock.symbol];
        const changeClass = stock.change >= 0 ? 'positive' : 'negative';
        const changeSign = stock.change >= 0 ? '+' : '';
        const isUltraLow = stock.price < 1;
        
        let cardClass = 'stock-card';
        if (isHighPotential) cardClass += ' stock-card--high-potential';
        if (isUltraLow) cardClass += ' stock-card--ultra-low';
        
        return `
            <div class="${cardClass}">
                <div class="stock-header">
                    <div class="stock-info">
                        <h3 class="stock-symbol">${stock.symbol}</h3>
                        <p class="stock-name">${stock.name}</p>
                    </div>
                    <div class="stock-toggle">
                        <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">Alerts</span>
                        <div class="toggle-switch ${isEnabled ? 'active' : ''}" data-symbol="${stock.symbol}"></div>
                    </div>
                </div>
                
                <div class="stock-price">
                    <span class="price-current">$${stock.price.toFixed(2)}</span>
                    <span class="price-change ${changeClass}">
                        ${changeSign}$${Math.abs(stock.change).toFixed(2)} (${changeSign}${stock.changePercent.toFixed(2)}%)
                    </span>
                </div>
                
                <div class="stock-details">
                    <div class="price-range">Range: ${stock.priceRange}</div>
                    <span class="stock-sector">${stock.sector}</span>
                    <p class="stock-description">${stock.description}</p>
                    ${stock.potential ? `<div class="stock-potential">${stock.potential}</div>` : ''}
                </div>
            </div>
        `;
    }

    toggleStock(symbol, toggleElement) {
        this.settings.stocksEnabled[symbol] = !this.settings.stocksEnabled[symbol];
        toggleElement.classList.toggle('active');
        
        const status = this.settings.stocksEnabled[symbol] ? 'enabled' : 'disabled';
        this.showMessage(`${symbol} notifications ${status}`, 'info');
        console.log(`${symbol} notifications ${status}`);
    }

    startPriceUpdates() {
        // Update prices every 15 seconds with realistic changes
        this.priceUpdateInterval = setInterval(() => {
            this.updatePrices();
        }, 15000);
        
        console.log('Price updates started');
    }

    updatePrices() {
        const allStocks = [...this.stocks.under1, ...this.stocks.under4, ...this.stocks.highPotential];
        
        allStocks.forEach(stock => {
            const oldPrice = stock.price;
            
            // Small random price change between -3% and +3%
            const changePercent = (Math.random() - 0.5) * 6;
            const priceChange = stock.basePrice * (changePercent / 100);
            
            // Keep prices within reasonable bounds (±20% of base price)
            const minPrice = stock.basePrice * 0.8;
            const maxPrice = stock.basePrice * 1.2;
            
            stock.price = Math.max(minPrice, Math.min(maxPrice, stock.basePrice + priceChange));
            stock.change = stock.price - stock.basePrice;
            stock.changePercent = ((stock.price - stock.basePrice) / stock.basePrice) * 100;
        });

        this.renderStocks();
        console.log('Prices updated');
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `status status--${type} success-message`;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // Show the message
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Stock Tracker...');
    try {
        window.stockTracker = new StockTracker();
    } catch (error) {
        console.error('Error initializing Stock Tracker:', error);
    }
});