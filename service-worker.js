// Service Worker untuk PWA - Laporan Keuangan
// Memungkinkan aplikasi berjalan secara offline

const CACHE_NAME = 'laporan-keuangan-v2.5';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install service worker dan cache semua file
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate service worker dan hapus cache lama
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker: Activated successfully');
      return self.clients.claim();
    })
  );
});

// Intercept fetch requests - Network First Strategy untuk HTML/CSS/JS
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Untuk file HTML, CSS, JS - gunakan Network First
  if (url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js') ||
      url.pathname === '/' || 
      url.pathname === './') {
    
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Update cache dengan versi terbaru
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(function() {
          // Jika offline, gunakan cache
          return caches.match(event.request);
        })
    );
  } else {
    // Untuk resource lain (gambar, dll) - gunakan Cache First
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          return response || fetch(event.request);
        })
    );
  }
});

// Background sync untuk future enhancement (optional)
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync triggered');
  // Bisa digunakan untuk sync data di masa depan
});

// Push notifications untuk future enhancement (optional)
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push notification received');
  // Bisa digunakan untuk notifikasi di masa depan
});
