const CACHE = "medigo-shell-v4";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./src/state.js", "./src/utils.js", "./src/qrcode-generator.js", "./src/pages/landing.js", "./src/pages/onboarding.js", "./src/pages/home.js", "./src/pages/tracking.js", "./src/pages/care-team.js", "./src/pages/medications.js", "./src/pages/analytics.js", "./src/pages/report.js", "./src/pages/settings.js", "./src/styles/foundation.css", "./src/styles/landing.css", "./src/styles/app.css"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("medigo-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
