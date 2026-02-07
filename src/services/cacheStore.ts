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

    constructor() {
        // Hydrate from localStorage on initialization for specific keys
        this.hydrate();
    }

    private hydrate() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.STORAGE_PREFIX)) {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const data = JSON.parse(raw);
                        this.cache.set(key.replace(this.STORAGE_PREFIX, ''), data);
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
        const cached = this.cache.get(key);
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
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
            ttl
        };
        this.cache.set(key, cacheData);

        if (persist) {
            try {
                localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(cacheData));
            } catch (e) {
                console.warn('LocalStorage save failed', e);
            }
        }
    }

    /**
     * Invalidate a specific cache key
     */
    invalidate(key: string) {
        this.cache.delete(key);
        localStorage.removeItem(this.STORAGE_PREFIX + key);
    }

    /**
     * Invalidate all cache keys matching a pattern
     */
    invalidatePattern(pattern: string) {
        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.invalidate(key));
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
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
            const cacheData = this.cache.get(key);
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
