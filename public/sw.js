// Service Worker for PWA
const CACHE_NAME = 'radha-rani-erp-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activate new SW
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and Supabase/external API calls
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
        return;
    }

    // 1. Navigation (HTML) - Network First, fallback to cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return response;
                })
                .catch(() => {
                    return caches.match('/index.html');
                })
        );
        return;
    }

    // 2. Assets (JS, CSS, Images) - Cache First, fallback to network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Cache new assets found
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    if (event.request.url.startsWith('http') && !event.request.url.includes('supabase')) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
    );
});
