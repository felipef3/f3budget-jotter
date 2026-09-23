// O service worker do jotter: guarda a página e a biblioteca no aparelho, para
// ela abrir SEM REDE. Troque VERSAO a cada publicação: o aparelho baixa a nova
// na próxima abertura com rede, e apaga a antiga.
const VERSAO = 'jotter-2026-09-23-1'
const ARQUIVOS = ['./', './index.html', './nostr-tools-2.25.2.js', './manifest.webmanifest', './icone-180.png']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()))
})

// Guardado primeiro: abre na hora, com ou sem rede. Os relays (wss://) não
// passam por aqui — service worker não intercepta WebSocket.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)))
})
