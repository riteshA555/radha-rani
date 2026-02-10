type CacheData = {
    data: any;
    timestamp: number;
    ttl?: number; // Per-key TTL override
};

type FetchFunction<T> = () => Promise<T>;

class CacheStore {
    private cache: Map<string, CacheData> = new Map();
    private rawCache: Map<string, string> = new Map(); // Store unparsed JSON strings
    private DEFAULT_TTL = 1000 * 60 * 2; // 2 minutes default TTL
    private STORAGE_PREFIX = 'sf_cache_';
    private userId: string | null = null;

    constructor() {
        this.hydrate();

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith(this.STORAGE_PREFIX)) {
                    const fullKey = event.key.replace(this.STORAGE_PREFIX, '');
                    if (event.newValue === null) {
                        this.cache.delete(fullKey);
                        this.rawCache.delete(fullKey);
                    } else {
                        // Mark as raw for lazy parsing
                        this.rawCache.set(fullKey, event.newValue);
                        this.cache.delete(fullKey);
                    }
                }
            });
        }
    }

    setUserId(id: string | null) {
        if (this.userId !== id) {
            this.cache.clear();
            this.rawCache.clear();
            this.userId = id;
            if (id) {
                this.hydrate();
            }
        }
    }

    private getScopedKey(key: string): string {
        if (!this.userId) return key;
        return `${this.userId}_${key}`;
    }

    private hydrate() {
        try {
            const prefix = this.userId ? `${this.STORAGE_PREFIX}${this.userId}_` : this.STORAGE_PREFIX;

            // Hydrate from localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (storageKey?.startsWith(prefix)) {
                    const raw = localStorage.getItem(storageKey);
                    if (raw) {
                        const internalKey = storageKey.replace(this.STORAGE_PREFIX, '');
                        this.rawCache.set(internalKey, raw);
                    }
                }
            }

            // Also hydrate from sessionStorage (for high-speed session-only data)
            for (let i = 0; i < sessionStorage.length; i++) {
                const storageKey = sessionStorage.key(i);
                if (storageKey?.startsWith(prefix)) {
                    const raw = sessionStorage.getItem(storageKey);
                    if (raw) {
                        const internalKey = storageKey.replace(this.STORAGE_PREFIX, '');
                        this.rawCache.set(internalKey, raw);
                    }
                }
            }
        } catch (e) {
            console.warn('Cache hydration failed', e);
        }
    }

    get(key: string) {
        const scopedKey = this.getScopedKey(key);

        // Check memory cache first
        let cached = this.cache.get(scopedKey);

        // If not in memory but in raw cache, parse it now (Lazy Parsing)
        if (!cached && this.rawCache.has(scopedKey)) {
            try {
                const raw = this.rawCache.get(scopedKey);
                if (raw) {
                    cached = JSON.parse(raw);
                    if (cached) this.cache.set(scopedKey, cached);
                }
            } catch (e) {
                this.rawCache.delete(scopedKey);
                return null;
            }
        }

        if (!cached) return null;

        const ttl = cached.ttl || this.DEFAULT_TTL;
        const isExpired = Date.now() - cached.timestamp > ttl;

        if (isExpired) {
            this.invalidate(key);
            return null;
        }

        return cached.data;
    }

    set(key: string, data: any, ttl?: number, persist: 'local' | 'session' | false = false) {
        const scopedKey = this.getScopedKey(key);
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
            ttl
        };
        this.cache.set(scopedKey, cacheData);

        if (persist) {
            try {
                const serialized = JSON.stringify(cacheData);
                this.rawCache.set(scopedKey, serialized);
                if (persist === 'local') {
                    localStorage.setItem(this.STORAGE_PREFIX + scopedKey, serialized);
                } else if (persist === 'session') {
                    sessionStorage.setItem(this.STORAGE_PREFIX + scopedKey, serialized);
                }
            } catch (e) {
                console.warn('Cache save failed', e);
            }
        }
    }

    invalidate(key: string) {
        const scopedKey = this.getScopedKey(key);
        this.cache.delete(scopedKey);
        this.rawCache.delete(scopedKey);
        localStorage.removeItem(this.STORAGE_PREFIX + scopedKey);
        sessionStorage.removeItem(this.STORAGE_PREFIX + scopedKey);
    }

    invalidatePattern(pattern: string) {
        const keysToDelete: string[] = [];
        const userPrefix = this.userId ? `${this.userId}_` : '';

        // Check both caches
        const allKeys = new Set([...this.cache.keys(), ...this.rawCache.keys()]);

        allKeys.forEach(key => {
            if (key.startsWith(userPrefix) && key.includes(pattern)) {
                const cleanKey = this.userId ? key.replace(`${this.userId}_`, '') : key;
                keysToDelete.push(cleanKey);
            }
        });
        keysToDelete.forEach(key => this.invalidate(key));
    }

    clear(all: boolean = false) {
        if (all) {
            this.cache.clear();
            this.rawCache.clear();
            const keysToRemove: string[] = [];
            // Clear local
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX)) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            // Clear session
            const sKeys: string[] = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX)) sKeys.push(key);
            }
            sKeys.forEach(k => sessionStorage.removeItem(k));

        } else if (this.userId) {
            const userPrefix = this.getScopedKey('');
            const keysToRemove: string[] = [];

            const allKeys = new Set([...this.cache.keys(), ...this.rawCache.keys()]);
            allKeys.forEach(key => {
                if (key.startsWith(userPrefix)) {
                    keysToRemove.push(key.replace(userPrefix, ''));
                }
            });
            keysToRemove.forEach(k => this.invalidate(k));
        }
    }

    async getOrFetch<T>(
        key: string,
        fetchFn: FetchFunction<T>,
        ttl?: number,
        persist: 'local' | 'session' | boolean = false
    ): Promise<T> {
        const cached = this.get(key);
        // Normalize persist boolean to 'local' for backward compatibility
        const storageMode = persist === true ? 'local' : persist;

        if (cached !== null) {
            const scopedKey = this.getScopedKey(key);
            const cacheData = this.cache.get(scopedKey);
            if (cacheData) {
                const age = Date.now() - cacheData.timestamp;
                const cacheTtl = cacheData.ttl || this.DEFAULT_TTL;

                if (age > cacheTtl * 0.5) {
                    fetchFn().then(freshData => {
                        this.set(key, freshData, ttl, storageMode as any);
                    }).catch(() => { });
                }
            }
            return cached;
        }

        const freshData = await fetchFn();
        this.set(key, freshData, ttl, storageMode as any);
        return freshData;
    }
}

export const cacheStore = new CacheStore();
