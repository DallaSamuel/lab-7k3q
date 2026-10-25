const CACHE = "lot-calc-v11-proto";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./config.js", "./icon-192.png", "./icon-512.png", "./fonts/poppins-400.woff", "./fonts/poppins-500.woff", "./fonts/poppins-700.woff"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(res => {
      // only keep good same-origin answers: a 404 or error page must never replace the working copy
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match("./index.html")))
  );
});
