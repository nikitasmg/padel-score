/* RALLY service worker — оффлайн-кэш. У приложения нет API, всё работает на клиенте. */
const CACHE = "rally-v2";

// Маршруты-страницы, которые предзагружаем при установке, чтобы приложение
// открывалось без сети сразу после первой онлайн-загрузки.
const ROUTES = ["/", "/match", "/clicker", "/broadcast"];
const ASSETS = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Кэшируем по одному, чтобы одна ошибка не сорвала всю установку.
      await Promise.allSettled(
        [...ROUTES, ...ASSETS].map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* офлайн при установке — пропускаем */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Переходы по страницам: stale-while-revalidate.
  // Отдаём кэш мгновенно (важно для офлайна — не ждём таймаут сети),
  // а в фоне обновляем кэш из сети, чтобы следующий запуск был свежим.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = (await cache.match(req)) || (await cache.match("/"));
        const fromNetwork = fetch(req)
          .then((res) => {
            cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(fromNetwork); // обновление кэша в фоне
          return cached;
        }
        return (await fromNetwork) || Response.error();
      })(),
    );
    return;
  }

  // Статика (_next, шрифты, иконки): cache-first, иначе сеть + докэширование.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
