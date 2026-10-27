// Service worker mínimo: hace que Chrome ofrezca instalar el panel como app.
// No guarda nada en caché a propósito, para que siempre se vea la versión más nueva.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
