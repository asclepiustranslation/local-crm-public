// Service Worker — Asklepius CRM PWA
// Uygulamayı önbelleğe alır, offline çalışmasını sağlar

const CACHE_NAME = "asklepius-crm-v1";

// Önbelleğe alınacak dosyalar
const PRECACHE_URLS = [
  "/",
  "/index.html",
];

// Kurulum: temel dosyaları önbelleğe al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Aktivasyon: eski önbellekleri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: önce ağdan dene, başarısız olursa önbellekten sun
self.addEventListener("fetch", (event) => {
  // Gmail API isteklerini önbelleğe alma
  if (event.request.url.includes("googleapis.com")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı önbelleğe kaydet
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
