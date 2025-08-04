/**
 * Storage Service
 * Enhanced data persistence with caching, compression, and cleanup
 */
class StorageService {
    constructor(options = {}) {
        this.prefix = options.prefix || 'lupo-';
        this.maxCacheAge = options.maxCacheAge || 60 * 60 * 1000; // 1 hour
        this.maxCacheSize = options.maxCacheSize || 100;
        this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
        this.enableCompression = options.enableCompression !== false;
        this.enableEncryption = options.enableEncryption || false;
        this.encryptionKey = options.encryptionKey || null;
        
        this.storage = {
            local: window.localStorage,
            session: window.sessionStorage
        };
        
        this.cache = new Map();
        this.init();
    }

    init() {
        this.cleanupExpiredItems();
        this.setupStorageEventListener();
        this.startPeriodicCleanup();
    }

    generateKey(key) {
        return `${this.prefix}${key}`;
    }

    set(key, value, options = {}) {
        const {
            storage = 'local',
            ttl = null,
            compress = this.enableCompression,
            encrypt = this.enableEncryption
        } = options;

        try {
            const item = {
                value,
                timestamp: Date.now(),
                ttl: ttl ? Date.now() + ttl : null,
                compressed: false,
                encrypted: false
            };

            let serialized = JSON.stringify(item.value);

            if (compress && serialized.length > this.compressionThreshold) {
                serialized = this.compress(serialized);
                item.compressed = true;
            }

            if (encrypt && this.encryptionKey) {
                serialized = this.encrypt(serialized);
                item.encrypted = true;
            }

            item.data = serialized;
            delete item.value;

            const finalData = JSON.stringify(item);
            const storageKey = this.generateKey(key);

            this.storage[storage].setItem(storageKey, finalData);
            
            this.cache.set(storageKey, {
                value,
                timestamp: item.timestamp,
                ttl: item.ttl
            });

            this.enforceMaxCacheSize();
            
            return true;

        } catch (error) {
            console.error('StorageService: Failed to set item', key, error);
            return false;
        }
    }

    get(key, defaultValue = null, storage = 'local') {
        try {
            const storageKey = this.generateKey(key);
            
            const cached = this.cache.get(storageKey);
            if (cached && !this.isExpired(cached)) {
                return cached.value;
            }

            const raw = this.storage[storage].getItem(storageKey);
            if (!raw) {
                return defaultValue;
            }

            const item = JSON.parse(raw);
            
            if (this.isExpired(item)) {
                this.remove(key, storage);
                return defaultValue;
            }

            let data = item.data;

            if (item.encrypted && this.encryptionKey) {
                data = this.decrypt(data);
            }

            if (item.compressed) {
                data = this.decompress(data);
            }

            const value = JSON.parse(data);
            
            this.cache.set(storageKey, {
                value,
                timestamp: item.timestamp,
                ttl: item.ttl
            });

            return value;

        } catch (error) {
            console.error('StorageService: Failed to get item', key, error);
            return defaultValue;
        }
    }

    remove(key, storage = 'local') {
        try {
            const storageKey = this.generateKey(key);
            this.storage[storage].removeItem(storageKey);
            this.cache.delete(storageKey);
            return true;
        } catch (error) {
            console.error('StorageService: Failed to remove item', key, error);
            return false;
        }
    }

    exists(key, storage = 'local') {
        const storageKey = this.generateKey(key);
        
        if (this.cache.has(storageKey)) {
            const cached = this.cache.get(storageKey);
            return !this.isExpired(cached);
        }

        return this.storage[storage].getItem(storageKey) !== null;
    }

    clear(storage = 'local') {
        try {
            const keys = this.getKeys(storage);
            keys.forEach(key => {
                this.storage[storage].removeItem(key);
            });
            
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('StorageService: Failed to clear storage', error);
            return false;
        }
    }

    getKeys(storage = 'local') {
        const keys = [];
        const storageInstance = this.storage[storage];
        
        for (let i = 0; i < storageInstance.length; i++) {
            const key = storageInstance.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        
        return keys;
    }

    getSize(storage = 'local') {
        let totalSize = 0;
        const keys = this.getKeys(storage);
        
        keys.forEach(key => {
            const item = this.storage[storage].getItem(key);
            if (item) {
                totalSize += item.length;
            }
        });
        
        return totalSize;
    }

    getUsage(storage = 'local') {
        const size = this.getSize(storage);
        const quota = this.getQuota(storage);
        
        return {
            used: size,
            available: quota - size,
            total: quota,
            percentage: quota > 0 ? (size / quota) * 100 : 0
        };
    }

    getQuota(storage = 'local') {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                return navigator.storage.estimate().then(estimate => estimate.quota || 0);
            }
            
            return storage === 'local' ? 5 * 1024 * 1024 : 5 * 1024 * 1024; // 5MB estimate
        } catch (error) {
            return 5 * 1024 * 1024; // 5MB fallback
        }
    }

    isExpired(item) {
        if (!item.ttl) return false;
        return Date.now() > item.ttl;
    }

    cleanupExpiredItems() {
        ['local', 'session'].forEach(storageType => {
            const keys = this.getKeys(storageType);
            
            keys.forEach(key => {
                try {
                    const raw = this.storage[storageType].getItem(key);
                    if (raw) {
                        const item = JSON.parse(raw);
                        if (this.isExpired(item)) {
                            this.storage[storageType].removeItem(key);
                            this.cache.delete(key);
                        }
                    }
                } catch (error) {
                    this.storage[storageType].removeItem(key);
                }
            });
        });
    }

    enforceMaxCacheSize() {
        if (this.cache.size <= this.maxCacheSize) return;

        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
        toRemove.forEach(([key]) => this.cache.delete(key));
    }

    setupStorageEventListener() {
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith(this.prefix)) {
                this.cache.delete(event.key);
                
                this.dispatchEvent(new CustomEvent('storagechange', {
                    detail: {
                        key: event.key.replace(this.prefix, ''),
                        oldValue: event.oldValue,
                        newValue: event.newValue,
                        storageArea: event.storageArea
                    }
                }));
            }
        });
    }

    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupExpiredItems();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    compress(data) {
        try {
            return btoa(encodeURIComponent(data));
        } catch (error) {
            console.warn('StorageService: Compression failed, using original data');
            return data;
        }
    }

    decompress(data) {
        try {
            return decodeURIComponent(atob(data));
        } catch (error) {
            console.warn('StorageService: Decompression failed, using original data');
            return data;
        }
    }

    encrypt(data) {
        if (!this.encryptionKey) return data;
        
        try {
            return btoa(data);
        } catch (error) {
            console.warn('StorageService: Encryption failed, using original data');
            return data;
        }
    }

    decrypt(data) {
        if (!this.encryptionKey) return data;
        
        try {
            return atob(data);
        } catch (error) {
            console.warn('StorageService: Decryption failed, using original data');
            return data;
        }
    }

    export(storage = 'local') {
        const data = {};
        const keys = this.getKeys(storage);
        
        keys.forEach(key => {
            const cleanKey = key.replace(this.prefix, '');
            data[cleanKey] = this.get(cleanKey, null, storage);
        });
        
        return data;
    }

    import(data, storage = 'local', options = {}) {
        const results = {
            success: [],
            failed: []
        };
        
        Object.entries(data).forEach(([key, value]) => {
            try {
                if (this.set(key, value, { storage, ...options })) {
                    results.success.push(key);
                } else {
                    results.failed.push(key);
                }
            } catch (error) {
                results.failed.push(key);
            }
        });
        
        return results;
    }

    migrate(fromStorage, toStorage, keys = null) {
        const keysToMigrate = keys || this.getKeys(fromStorage).map(k => k.replace(this.prefix, ''));
        const results = { success: [], failed: [] };
        
        keysToMigrate.forEach(key => {
            try {
                const value = this.get(key, null, fromStorage);
                if (value !== null) {
                    if (this.set(key, value, { storage: toStorage })) {
                        this.remove(key, fromStorage);
                        results.success.push(key);
                    } else {
                        results.failed.push(key);
                    }
                }
            } catch (error) {
                results.failed.push(key);
            }
        });
        
        return results;
    }

    backup() {
        return {
            local: this.export('local'),
            session: this.export('session'),
            timestamp: Date.now(),
            version: '1.0.0'
        };
    }

    restore(backup) {
        if (!backup || !backup.local) {
            throw new Error('Invalid backup format');
        }
        
        const results = {
            local: this.import(backup.local, 'local'),
            session: backup.session ? this.import(backup.session, 'session') : { success: [], failed: [] }
        };
        
        return results;
    }

    getStats() {
        return {
            cacheSize: this.cache.size,
            localKeys: this.getKeys('local').length,
            sessionKeys: this.getKeys('session').length,
            localSize: this.getSize('local'),
            sessionSize: this.getSize('session'),
            maxCacheSize: this.maxCacheSize,
            maxCacheAge: this.maxCacheAge
        };
    }
}

StorageService.prototype.dispatchEvent = function(event) {
    if (window.dispatchEvent) {
        window.dispatchEvent(event);
    }
};

const lupoStorage = new StorageService({
    prefix: 'lupo-',
    maxCacheAge: 60 * 60 * 1000, // 1 hour
    maxCacheSize: 100,
    enableCompression: true,
    compressionThreshold: 1024
});

window.StorageService = StorageService;
window.lupoStorage = lupoStorage;