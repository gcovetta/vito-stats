// Service worker: deja la app instalable y abre aunque no haya señal
// (muestra lo último que se vio). Los datos siempre se piden frescos a Supabase.
const CACHE = "vito-v14";
const SHELL = ["./", "./index.html", "./config.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase y CDNs van directo
  // Red primero (para que las actualizaciones lleguen enseguida), caché si no hay conexión
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

// Avisos de partido
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: "Vito", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Vito", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return clients.openWindow(e.notification.data.url || "./");
  }));
});
