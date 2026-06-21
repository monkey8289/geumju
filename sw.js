/* 금주 다이어리 서비스 워커 — HTML은 네트워크 우선(업데이트 즉시 반영), 정적파일은 캐시 우선 */
const CACHE = "geumju-cache-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return;   // 파이어베이스 등 외부는 그대로 네트워크

  const isHTML = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if (isHTML) {
    // 네트워크 우선 → 실패 시 캐시
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
  } else {
    // 캐시 우선 → 없으면 네트워크 후 저장
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }))
    );
  }
});
