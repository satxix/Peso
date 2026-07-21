const CACHE_NAME = 'pesotrack-1-0-gold-master-v257';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './storage.js',
  './logos.js',
  './transactions.js',
  './dashboard.js',
  './accounts.js',
  './bills.js',
  './search.js',
  './reports.js',
  './settings.js',
  './app.js',
  './ui.js',
  './manifest.json',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-192.png',
  './icon-384.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './logos/aub-clean.png',
  './logos/BDO.svg',
  './logos/bdo-app-v2.png',
  './logos/bdo-clean-local.png',
  './logos/BPI.svg',
  './logos/bpi-app-v2.png',
  './logos/bpi-clean.png',
  './logos/bpi-clean-local.png',
  './logos/chinabank.svg',
  './logos/cimb.svg',
  './logos/cimb-clean.png',
  './logos/eastwest-clean.png',
  './logos/GCash.svg',
  './logos/gcash-clean.png',
  './logos/generic-bank.svg',
  './logos/generic-bills.svg',
  './logos/generic-card.svg',
  './logos/generic-credit.svg',
  './logos/generic-investment.svg',
  './logos/generic-payroll.svg',
  './logos/generic-salary.svg',
  './logos/generic-wallet.svg',
  './logos/gotyme.svg',
  './logos/gotyme-clean.png',
  './logos/hsbc.svg',
  './logos/hsbc-clean.png',
  './logos/landbank-clean.png',
  './logos/maribank.svg',
  './logos/maribank-clean.png',
  './logos/maya-clean.png',
  './logos/metrobank.svg',
  './logos/metrobank-app-v2.png',
  './logos/metrobank-clean.png',
  './logos/ownbank-clean.png',
  './logos/PNB.svg',
  './logos/pnb-app-v2.png',
  './logos/pnb-clean.png',
  './logos/pnb-fit.png',
  './logos/rcbc-clean.png',
  './logos/robinsonsbank-clean.png',
  './logos/securitybank-clean.png',
  './logos/standardchartered-clean.png',
  './logos/tonik-clean.png',
  './logos/unionbank.svg',
  './logos/unionbank-app-v2.png',
  './logos/unionbank-clean.png',
  './logos/unionbank-fit.png',
  './logos/bpibanko.svg',
  './logos/spay.svg',
  './logos/unobank.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(ASSETS.map(asset => fetch(asset).then(response => {
        if (response.ok) return cache.put(asset, response);
      }).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppShell = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const update = fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || update;
    })
  );
});
