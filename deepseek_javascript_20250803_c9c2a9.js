// Enhanced Lupo Trading Platform JavaScript
class LupoTradingPlatform {
    constructor() {
        this.stockData = {
            "under4": [
                {
                    "symbol": "TTI",
                    "name": "TETRA Technologies",
                    "price": 3.24,
                    "basePrice": 3.24,
                    "priceRange": "$2.50 - $3.54",
                    "change": 0.12,
                    "changePercent": 3.85,
                    "sector": "Oil Services",
                    "description": "Oil services company benefiting from energy sector recovery",
                    "sentiment": 0.65
                },
                {
                    "symbol": "SB",
                    "name": "Safe Bulkers",
                    "price": 3.53,
                    "basePrice": 3.53,
                    "priceRange": "$3.30 - $3.77",
                    "change": -0.08,
                    "changePercent": -2.22,
                    "sector": "Shipping",
                    "description": "Dry bulk shipping positioned for global trade recovery",
                    "sentiment": 0.45
                },
                {
                    "symbol": "TUYA",
                    "name": "Tuya Inc",
                    "price": 2.37,
                    "basePrice": 2.37,
                    "priceRange": "$1.95 - $2.79",
                    "change": 0.15,
                    "changePercent": 6.76,
                    "sector": "IoT Technology",
                    "description": "Smart home IoT platform with growth potential",
                    "sentiment": 0.75
                },
                {
                    "symbol": "NOK",
                    "name": "Nokia Corporation",
                    "price": 3.92,
                    "basePrice": 3.92,
                    "priceRange": "~$4.97 (dips under $4)",
                    "change": -0.23,
                    "changePercent": -5.54,
                    "sector": "Telecom Equipment",
                    "description": "5G infrastructure buildout beneficiary",
                    "sentiment": 0.55
                },
                {
                    "symbol": "FSI",
                    "name": "Flexible Solutions International",
                    "price": 4.16,
                    "basePrice": 4.16,
                    "priceRange": "$3.78 - $4.55",
                    "change": 0.08,
                    "changePercent": 1.96,
                    "sector": "Specialty Chemicals",
                    "description": "Niche specialty chemicals with agricultural applications",
                    "sentiment": 0.60
                }
            ],
            "highPotential": [
                {
                    "symbol": "DSGN",
                    "name": "Design Therapeutics",
                    "price": 4.52,
                    "basePrice": 4.52,
                    "priceRange": "$4.20 - $4.85",
                    "change": 0.27,
                    "changePercent": 6.35,
                    "sector": "Biotechnology",
                    "description": "Gene therapy platform with multiple pipeline programs",
                    "potential": "High growth biotech with breakthrough gene therapy",
                    "sentiment": 0.80
                },
                {
                    "symbol": "SRNE",
                    "name": "Sorrento Therapeutics",
                    "price": 3.81,
                    "basePrice": 3.81,
                    "priceRange": "$2.95 - $4.65",
                    "change": 0.19,
                    "changePercent": 5.25,
                    "sector": "Biopharmaceuticals",
                    "description": "Diverse pipeline in oncology and pain management",
                    "potential": "Multiple FDA approvals expected in 2025",
                    "sentiment": 0.70
                }
            ]
        };

        this.settings = {
            notificationTime: "08:00",
            notificationsEnabled: false,
            stocksEnabled: {
                "TTI": true, "SB": true, "TUYA": true, "NOK": true, 
                "FSI": true, "DSGN": true, "SRNE": true
            }
        };

        this.watchlist = new Set();
        this.notifications = [];
        this.gestureState = new Map(); // Track gesture states per element
        this.manipulationAlerts = []; // Initialize manipulation alerts array

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderStocks();
        this.startAmsterdamClock();
        this.startSentimentAnimation();
        this.startPriceSimulation();
        this.loadSettings();
        this.startManipulationDetection(); // Start manipulation detection
    }

    setupEventListeners() {
        // Settings modal
        const settingsFab = document.getElementById('settings-fab');
        const modalClose = document.getElementById('modal-close');
        const modalBackdrop = document.getElementById('modal-backdrop');
        const saveSettings = document.getElementById('save-settings');
        const cancelSettings = document.getElementById('cancel-settings');

        if (settingsFab) settingsFab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSettings();
        });
        
        if (modalClose) modalClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSettings();
        });
        
        if (modalBackdrop) modalBackdrop.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSettings();
        });
        
        if (saveSettings) saveSettings.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveSettings();
        });
        
        if (cancelSettings) cancelSettings.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSettings();
        });

        // Stock details modal
        const stockDetailsClose = document.getElementById('stock-details-close');
        if (stockDetailsClose) {
            stockDetailsClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeStockDetails();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // ... (All existing methods remain the same) ...

    startManipulationDetection() {
        // Generate initial alerts
        this.generateManipulationAlert();
        this.generateManipulationAlert();
        
        // Generate new alerts every 5 minutes
        setInterval(() => {
            if (Math.random() > 0.3) { // 70% chance to generate an alert
                this.generateManipulationAlert();
            }
        }, 300000); // 5 minutes
        
        // Clear alerts button
        document.getElementById('clear-alerts')?.addEventListener('click', () => {
            this.manipulationAlerts = [];
            this.renderManipulationAlerts();
        });
    }

    generateManipulationAlert() {
        const alertTypes = [
            {
                type: "Short-Ladder Attack Alerts",
                severity: "High",
                description: "Heavy coordinated sell orders at market open on heavily-shorted tickers",
                getExample: () => {
                    const tickers = ['GME', 'AMC', 'BBBY', 'KOSS'];
                    return `Detected on ${tickers[Math.floor(Math.random() * tickers.length)]}`;
                }
            },
            {
                type: "Media FUD Campaign Detection",
                severity: "Medium",
                description: "Sentiment shift across financial news outlets",
                getExample: () => {
                    const outlets = ['CNBC', 'Bloomberg', 'MarketWatch', 'Seeking Alpha'];
                    return `Multiple negative headlines from ${outlets[Math.floor(Math.random() * outlets.length)]}`;
                }
            },
            {
                type: "Dark-Pool Abuse Warnings",
                severity: "High",
                description: "High % volume routed through off-exchange venues",
                getExample: () => {
                    const percent = Math.floor(Math.random() * 10) + 90; // 90-99%
                    return `${percent}% of trades via dark pools`;
                }
            },
            {
                type: "Options-Wall (Put-Wall) Manipulation",
                severity: "Medium",
                description: "Unusually large open interest on sell-side options",
                getExample: () => {
                    const tickers = ['GME', 'AMC', 'BBBY'];
                    const ticker = tickers[Math.floor(Math.random() * tickers.length)];
                    const strike = (Math.floor(Math.random() * 20) + 5) * 5; // 25, 30, ... 120
                    return `${ticker} $${strike} put wall`;
                }
            }
        ];

        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const alert = {
            type: alertType.type,
            severity: alertType.severity,
            description: alertType.description,
            example: alertType.getExample(),
            timestamp: new Date()
        };

        this.manipulationAlerts.unshift(alert); // Add to beginning
        this.renderManipulationAlerts();
        
        // Show notification
        this.showNotification(`🚨 ${alertType.type} detected!`, 'error');
    }

    renderManipulationAlerts() {
        const container = document.getElementById('manipulation-alerts');
        if (!container) return;

        container.innerHTML = '';

        this.manipulationAlerts.slice(0, 8).forEach(alert => { // Show last 8 alerts
            const alertElement = document.createElement('div');
            alertElement.className = `manipulation-alert ${alert.severity.toLowerCase()}-severity`;
            
            // Format the relative time
            const timeAgo = this.formatTimeAgo(alert.timestamp);
            
            alertElement.innerHTML = `
                <div class="alert-header">
                    <span class="alert-icon">🚨</span>
                    <span class="alert-title">${alert.type} – ${alert.severity}</span>
                </div>
                <div class="alert-description">${alert.description} (${alert.example})</div>
                <div class="alert-timestamp">⏰ ${timeAgo}</div>
            `;
            
            container.appendChild(alertElement);
        });
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const seconds = Math.floor((now - timestamp) / 1000);
        
        if (seconds < 60) {
            return `${seconds} seconds ago`;
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        }
        
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.lupoApp = new LupoTradingPlatform();
    
    // PWA Manifest setup
    const manifest = {
        name: "Lupo Trading Platform",
        short_name: "Lupo",
        description: "Enhanced trading platform with copper & forest design",
        start_url: "/",
        display: "standalone",
        background_color: "#F8F6F0",
        theme_color: "#B87333",
        icons: [
            {
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Ccircle cx='256' cy='256' r='256' fill='%23B87333'/%3E%3Ctext x='256' y='320' font-family='Arial' font-size='200' fill='white' text-anchor='middle'%3EL%3C/text%3E%3C/svg%3E",
                sizes: "512x512",
                type: "image/svg+xml"
            }
        ]
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    const manifestLink = document.getElementById('pwa-manifest');
    if (manifestLink) {
        manifestLink.href = manifestURL;
    }
    
    console.log('🚀 Lupo Enhanced Trading Platform initialized successfully!');
    console.log('📱 Features loaded: Real-time prices, Enhanced gesture controls, Sentiment analysis, PWA support');
    console.log('🎯 Gestures: Double-click = Quick Buy, ALT+click = Watchlist, Long-press = Details');
});