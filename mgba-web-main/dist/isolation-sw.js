// COOP/COEP for static hosts, restricted to this emulator's directory.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
  if (request.mode === 'navigate' && !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const response = await fetch(request);
    if (response.status === 0) return response;
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  })());
});
