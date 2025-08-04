/**
 * Configuration Service
 * Centralized application configuration management
 */
class ConfigService {
    constructor() {
        this.config = {};
        this.environment = this.detectEnvironment();
        this.loadDefaultConfig();
        this.loadEnvironmentConfig();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            return 'development';
        }
        
        if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        }
        
        return 'production';
    }

    loadDefaultConfig() {
        this.config = {
            app: {
                name: 'Lupo Trading Platform',
                version: '1.0.0',
                description: 'Transparent. Independent. Retail-Focused.',
                author: 'Lupo Development Team'
            },
            
            api: {
                baseURL: '/api',
                timeout: 30000,
                retryAttempts: 3,
                retryDelay: 1000,
                endpoints: {
                    auth: '/auth',
                    stocks: '/stocks',
                    user: '/user',
                    websocket: '/ws'
                }
            },

            auth: {
                tokenKey: 'lupo-auth-token',
                userKey: 'lupo-user',
                sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
                refreshInterval: 30 * 60 * 1000, // 30 minutes
                rememberMeKey: 'lupo-remember-email'
            },

            storage: {
                stateKey: 'lupo-app-state',
                preferencesKey: 'lupo-user-preferences',
                cachePrefix: 'lupo-cache-',
                maxCacheAge: 60 * 60 * 1000, // 1 hour
                maxCacheSize: 100 // items
            },

            ui: {
                theme: {
                    default: 'dark',
                    available: ['light', 'dark', 'auto']
                },
                notifications: {
                    timeout: 5000,
                    maxVisible: 5,
                    position: 'top-right'
                },
                charts: {
                    defaultTimeframe: '1D',
                    animationDuration: 750,
                    refreshInterval: 15000
                },
                tables: {
                    defaultPageSize: 25,
                    maxPageSize: 100
                }
            },

            trading: {
                maxPositionSize: 1000000, // $1M
                maxShareCount: 100000,
                minTradeAmount: 1,
                defaultCashBalance: 10000,
                paperTradingMode: true,
                riskManagement: {
                    maxDailyLoss: 5000,
                    maxPositionRisk: 0.1, // 10% of portfolio
                    stopLossDefault: 0.05 // 5%
                }
            },

            market: {
                updateInterval: 15000, // 15 seconds
                batchSize: 50,
                maxWatchlistSize: 100,
                tradingHours: {
                    start: '09:30',
                    end: '16:00',
                    timezone: 'America/New_York'
                },
                dataProviders: {
                    primary: 'internal',
                    fallback: 'demo',
                    available: ['internal', 'demo', 'alpha_vantage', 'iex']
                }
            },

            websocket: {
                url: null, // Will be set based on environment
                reconnectAttempts: 5,
                reconnectDelay: 2000,
                heartbeatInterval: 30000,
                maxMessageSize: 1024 * 1024 // 1MB
            },

            security: {
                enableCSP: true,
                enableXSRF: true,
                maxLoginAttempts: 5,
                lockoutDuration: 15 * 60 * 1000, // 15 minutes
                passwordMinLength: 6,
                requireHTTPS: true
            },

            logging: {
                level: 'info',
                enableConsole: true,
                enableRemote: false,
                maxLogSize: 1000,
                levels: ['error', 'warn', 'info', 'debug']
            },

            performance: {
                enableMetrics: false,
                chartDebounce: 250,
                searchDebounce: 300,
                scrollDebounce: 100,
                lazyLoadThreshold: 0.1
            },

            features: {
                realTimeData: true,
                socialTrading: false,
                advancedCharts: true,
                portfolioAnalytics: true,
                notifications: true,
                darkMode: true,
                mobileTrading: true,
                paperTrading: true,
                exportData: true
            }
        };
    }

    loadEnvironmentConfig() {
        const envConfigs = {
            development: {
                api: {
                    baseURL: '/api',
                    timeout: 60000
                },
                websocket: {
                    url: `ws://${window.location.host}/ws`
                },
                logging: {
                    level: 'debug',
                    enableConsole: true
                },
                performance: {
                    enableMetrics: true
                },
                security: {
                    requireHTTPS: false
                },
                trading: {
                    paperTradingMode: true
                }
            },

            staging: {
                api: {
                    baseURL: '/api'
                },
                websocket: {
                    url: `wss://${window.location.host}/ws`
                },
                logging: {
                    level: 'info',
                    enableRemote: true
                },
                trading: {
                    paperTradingMode: true
                }
            },

            production: {
                api: {
                    baseURL: '/api'
                },
                websocket: {
                    url: `wss://${window.location.host}/ws`
                },
                logging: {
                    level: 'warn',
                    enableConsole: false,
                    enableRemote: true
                },
                performance: {
                    enableMetrics: true
                },
                trading: {
                    paperTradingMode: false
                }
            }
        };

        const envConfig = envConfigs[this.environment] || {};
        this.mergeConfig(envConfig);
    }

    mergeConfig(newConfig) {
        this.config = this.deepMerge(this.config, newConfig);
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value === null || value === undefined || !(key in value)) {
                return defaultValue;
            }
            value = value[key];
        }
        
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getEnvironment() {
        return this.environment;
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    isProduction() {
        return this.environment === 'production';
    }

    isStaging() {
        return this.environment === 'staging';
    }

    isFeatureEnabled(feature) {
        return this.get(`features.${feature}`, false);
    }

    enableFeature(feature) {
        this.set(`features.${feature}`, true);
    }

    disableFeature(feature) {
        this.set(`features.${feature}`, false);
    }

    getApiEndpoint(endpoint) {
        const baseURL = this.get('api.baseURL');
        const endpointPath = this.get(`api.endpoints.${endpoint}`);
        
        if (!endpointPath) {
            throw new Error(`Unknown API endpoint: ${endpoint}`);
        }
        
        return baseURL + endpointPath;
    }

    getWebSocketUrl() {
        return this.get('websocket.url');
    }

    getTradingHours() {
        return this.get('market.tradingHours');
    }

    isMarketOpen() {
        const now = new Date();
        const tradingHours = this.getTradingHours();
        
        const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            timeZone: tradingHours.timezone
        }).slice(0, 5);
        
        const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
        const isInTradingHours = currentTime >= tradingHours.start && currentTime <= tradingHours.end;
        
        return isWeekday && isInTradingHours;
    }

    validateConfig() {
        const required = [
            'app.name',
            'api.baseURL',
            'auth.tokenKey',
            'storage.stateKey'
        ];
        
        const missing = required.filter(path => this.get(path) === undefined);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        return true;
    }

    export() {
        return JSON.parse(JSON.stringify(this.config));
    }

    import(config) {
        this.mergeConfig(config);
    }

    reset() {
        this.loadDefaultConfig();
        this.loadEnvironmentConfig();
    }

    log(level, message, data = {}) {
        const logLevel = this.get('logging.level');
        const enableConsole = this.get('logging.enableConsole');
        const levels = this.get('logging.levels');
        
        const levelIndex = levels.indexOf(level);
        const currentLevelIndex = levels.indexOf(logLevel);
        
        if (levelIndex <= currentLevelIndex && enableConsole) {
            console[level](`[Lupo Config] ${message}`, data);
        }
    }
}

const lupoConfig = new ConfigService();

try {
    lupoConfig.validateConfig();
    lupoConfig.log('info', 'Configuration loaded successfully', {
        environment: lupoConfig.getEnvironment(),
        features: lupoConfig.get('features')
    });
} catch (error) {
    console.error('Configuration validation failed:', error);
}

window.ConfigService = ConfigService;
window.lupoConfig = lupoConfig;