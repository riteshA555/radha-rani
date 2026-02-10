type CacheData = {
    data: any;
    timestamp: number;
    ttl?: number; // Per-key TTL override
};

type FetchFunction<T> = () => Promise<T>;

class CacheStore {
    private cache: Map<string, CacheData> = new Map();
    private DEFAULT_TTL = 1000 * 60 * 2; // 2 minutes default TTL
    private STORAGE_PREFIX = 'sf_cache_';
    private userId: string | null = null;

    constructor() {
        // Hydrate from localStorage on initialization for specific keys
        this.hydrate();

        // Handle cross-tab invalidation
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key && event.key.startsWith(this.STORAGE_PREFIX)) {
                    // Extract the un-prefixed key (e.g. 'userId_dashboard_full_bundle')
                    const fullKey = event.key.replace(this.STORAGE_PREFIX, '');
                    // Clear internal memory cache if the localStorage was changed by another tab
                    if (event.newValue === null) {
                        this.cache.delete(fullKey);
                    }
                }
            });
        }
    }

    /**
     * Set the current user ID to scope cache keys
     */
    setUserId(id: string | null) {
        if (this.userId !== id) {
            this.cache.clear(); // CRITICAL: Stop memory leakage between user sessions
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
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (storageKey?.startsWith(prefix)) {
                    const raw = localStorage.getItem(storageKey);
                    if (raw) {
                        const data = JSON.parse(raw);
                        const internalKey = storageKey.replace(this.STORAGE_PREFIX, '');
                        this.cache.set(internalKey, data);
                    }
                }
            }
        } catch (e) {
            console.warn('Cache hydration failed', e);
        }
    }

    /**
     * Get cached data if valid, otherwise return null
     */
    get(key: string) {
        const scopedKey = this.getScopedKey(key);
        const cached = this.cache.get(scopedKey);
        if (!cached) return null;

        const ttl = cached.ttl || this.DEFAULT_TTL;
        const isExpired = Date.now() - cached.timestamp > ttl;

        if (isExpired) {
            this.invalidate(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set data in cache with optional TTL override and persistence
     */
    set(key: string, data: any, ttl?: number, persist: boolean = false) {
        const scopedKey = this.getScopedKey(key);
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
            ttl
        };
        this.cache.set(scopedKey, cacheData);

        if (persist) {
            try {
                localStorage.setItem(this.STORAGE_PREFIX + scopedKey, JSON.stringify(cacheData));
            } catch (e) {
                console.warn('LocalStorage save failed', e);
            }
        }
    }

    /**
     * Invalidate a specific cache key
     */
    invalidate(key: string) {
        const scopedKey = this.getScopedKey(key);
        this.cache.delete(scopedKey);
        localStorage.removeItem(this.STORAGE_PREFIX + scopedKey);
    }

    /**
     * Invalidate all cache keys matching a pattern (for current user only)
     */
    invalidatePattern(pattern: string) {
        const keysToDelete: string[] = [];
        const userPrefix = this.userId ? `${this.userId}_` : '';

        this.cache.forEach((_, key) => {
            if (key.startsWith(userPrefix) && key.includes(pattern)) {
                // Key in map already has userPrefix, so we strip it for invalidate call
                const cleanKey = this.userId ? key.replace(`${this.userId}_`, '') : key;
                keysToDelete.push(cleanKey);
            }
        });
        keysToDelete.forEach(key => this.invalidate(key));
    }

    /**
     * Clear all cached data for current user or completely
     */
    clear(all: boolean = false) {
        if (all) {
            this.cache.clear();
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } else if (this.userId) {
            // Clear only for current user
            const userPrefix = this.getScopedKey('');
            const keysToRemove: string[] = [];

            // Collect keys from memory
            this.cache.forEach((_, key) => {
                if (key.startsWith(userPrefix)) {
                    keysToRemove.push(key.replace(userPrefix, ''));
                }
            });
            keysToRemove.forEach(k => this.invalidate(k));
        }
    }

    /**
     * Stale-while-revalidate pattern
     */
    async getOrFetch<T>(
        key: string,
        fetchFn: FetchFunction<T>,
        ttl?: number,
        persist: boolean = false
    ): Promise<T> {
        const cached = this.get(key);

        if (cached !== null) {
            // Background refresh if older than 50% of TTL
            const scopedKey = this.getScopedKey(key);
            const cacheData = this.cache.get(scopedKey);
            if (cacheData) {
                const age = Date.now() - cacheData.timestamp;
                const cacheTtl = cacheData.ttl || this.DEFAULT_TTL;

                if (age > cacheTtl * 0.5) {
                    fetchFn().then(freshData => {
                        this.set(key, freshData, ttl, persist);
                    }).catch(() => { });
                }
            }
            return cached;
        }

        const freshData = await fetchFn();
        this.set(key, freshData, ttl, persist);
        return freshData;
    }
}

export const cacheStore = new CacheStore();
