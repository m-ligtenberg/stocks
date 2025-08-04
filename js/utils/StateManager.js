/**
 * State Manager
 * Centralized state management with reactive updates and persistence
 */
class StateManager extends EventTarget {
    constructor(initialState = {}) {
        super();
        this.state = { ...initialState };
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistorySize = 50;
        this.persistenceKey = 'lupo-app-state';
        
        this.loadPersistedState();
    }

    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    removeMiddleware(middleware) {
        const index = this.middleware.indexOf(middleware);
        if (index > -1) {
            this.middleware.splice(index, 1);
        }
    }

    getState(path = null) {
        if (!path) return { ...this.state };
        
        return this.getNestedValue(this.state, path);
    }

    setState(updates, options = {}) {
        const { notify = true, persist = true, source = 'unknown' } = options;
        
        const prevState = { ...this.state };
        const newState = { ...this.state };
        
        if (typeof updates === 'function') {
            Object.assign(newState, updates(prevState));
        } else {
            Object.assign(newState, updates);
        }

        const action = {
            type: 'SET_STATE',
            payload: updates,
            source,
            timestamp: Date.now()
        };

        for (const middleware of this.middleware) {
            const result = middleware(action, prevState, newState);
            if (result === false) {
                console.warn('State update cancelled by middleware');
                return false;
            }
        }

        this.state = newState;
        
        this.addToHistory(action, prevState, newState);
        
        if (notify) {
            this.notifySubscribers(prevState, newState, action);
        }
        
        if (persist) {
            this.persistState();
        }
        
        return true;
    }

    setNestedState(path, value, options = {}) {
        const updates = this.createNestedUpdate(path, value);
        return this.setState(updates, options);
    }

    subscribe(path, callback) {
        if (typeof path === 'function') {
            callback = path;
            path = null;
        }

        const subscription = {
            path,
            callback,
            id: this.generateId()
        };

        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, []);
        }
        
        this.subscribers.get(path).push(subscription);
        
        return () => this.unsubscribe(subscription.id);
    }

    unsubscribe(subscriptionId) {
        for (const [path, subscriptions] of this.subscribers.entries()) {
            const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
            if (index > -1) {
                subscriptions.splice(index, 1);
                if (subscriptions.length === 0) {
                    this.subscribers.delete(path);
                }
                return true;
            }
        }
        return false;
    }

    notifySubscribers(prevState, newState, action) {
        for (const [path, subscriptions] of this.subscribers.entries()) {
            for (const subscription of subscriptions) {
                try {
                    if (!path) {
                        subscription.callback(newState, prevState, action);
                    } else {
                        const prevValue = this.getNestedValue(prevState, path);
                        const newValue = this.getNestedValue(newState, path);
                        
                        if (prevValue !== newValue) {
                            subscription.callback(newValue, prevValue, action);
                        }
                    }
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            }
        }

        this.dispatchEvent(new CustomEvent('statechange', {
            detail: { prevState, newState, action }
        }));
    }

    getNestedValue(obj, path) {
        if (!path) return obj;
        
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[key];
        }
        
        return value;
    }

    createNestedUpdate(path, value) {
        const keys = path.split('.');
        const updates = {};
        let current = updates;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        return updates;
    }

    addToHistory(action, prevState, newState) {
        this.history.push({
            action,
            prevState: { ...prevState },
            newState: { ...newState },
            timestamp: Date.now()
        });

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
    }

    persistState() {
        try {
            const persistableState = this.getPersistableState();
            localStorage.setItem(this.persistenceKey, JSON.stringify({
                state: persistableState,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to persist state:', error);
        }
    }

    loadPersistedState() {
        try {
            const persisted = localStorage.getItem(this.persistenceKey);
            if (persisted) {
                const { state, timestamp } = JSON.parse(persisted);
                
                const maxAge = 24 * 60 * 60 * 1000;
                if (Date.now() - timestamp < maxAge) {
                    Object.assign(this.state, state);
                } else {
                    localStorage.removeItem(this.persistenceKey);
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted state:', error);
            localStorage.removeItem(this.persistenceKey);
        }
    }

    getPersistableState() {
        const { 
            // Exclude non-persistable data
            tempData,
            realTimeData,
            websocketConnection,
            ...persistableState 
        } = this.state;
        
        return persistableState;
    }

    clearPersistedState() {
        localStorage.removeItem(this.persistenceKey);
    }

    reset(newState = {}) {
        const action = {
            type: 'RESET_STATE',
            payload: newState,
            source: 'stateManager',
            timestamp: Date.now()
        };

        const prevState = { ...this.state };
        this.state = { ...newState };
        
        this.addToHistory(action, prevState, this.state);
        this.notifySubscribers(prevState, this.state, action);
        this.persistState();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    createSelector(selectorFn) {
        let lastResult;
        let lastState;
        
        return (state = this.state) => {
            if (state === lastState) {
                return lastResult;
            }
            
            lastState = state;
            lastResult = selectorFn(state);
            return lastResult;
        };
    }

    batch(updates) {
        const actions = [];
        const prevState = { ...this.state };
        
        for (const update of updates) {
            if (typeof update === 'function') {
                this.state = { ...this.state, ...update(this.state) };
            } else {
                Object.assign(this.state, update);
            }
            
            actions.push({
                type: 'BATCH_UPDATE',
                payload: update,
                timestamp: Date.now()
            });
        }
        
        const batchAction = {
            type: 'BATCH',
            payload: actions,
            source: 'batch',
            timestamp: Date.now()
        };
        
        this.addToHistory(batchAction, prevState, this.state);
        this.notifySubscribers(prevState, this.state, batchAction);
        this.persistState();
    }
}

const createLupoStateManager = () => {
    const initialState = {
        user: {
            isAuthenticated: false,
            profile: null,
            preferences: {
                theme: 'dark',
                notifications: true,
                autoRefresh: true
            }
        },
        market: {
            currentPrices: {},
            watchlist: [],
            opportunities: {
                under1: [],
                under4: [],
                under5: []
            },
            lastUpdated: null
        },
        portfolio: {
            holdings: [],
            transactions: [],
            totalValue: 0,
            cashBalance: 0,
            performance: {
                dailyChange: 0,
                totalGainLoss: 0,
                totalGainLossPercent: 0
            }
        },
        ui: {
            activeTab: 'market-intel',
            selectedStock: null,
            modals: {
                trade: { isOpen: false, data: null },
                analysis: { isOpen: false, data: null },
                profile: { isOpen: false }
            },
            notifications: [],
            loading: {
                portfolio: false,
                market: false,
                trades: false
            }
        },
        app: {
            version: '1.0.0',
            lastActivity: Date.now(),
            connectionStatus: 'online'
        }
    };

    const stateManager = new StateManager(initialState);

    stateManager.addMiddleware((action, prevState, newState) => {
        if (action.type.includes('AUTH') && newState.user.isAuthenticated !== prevState.user.isAuthenticated) {
            console.log('Authentication state changed:', newState.user.isAuthenticated);
        }
        
        if (action.type.includes('ERROR')) {
            console.error('State error action:', action);
        }
        
        return true;
    });

    stateManager.addMiddleware((action, prevState, newState) => {
        newState.app.lastActivity = Date.now();
        return true;
    });

    return stateManager;
};

window.StateManager = StateManager;
window.lupoState = createLupoStateManager();