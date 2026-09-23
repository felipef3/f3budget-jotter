// O service worker do jotter: guarda a página e a biblioteca no aparelho, para
// ela abrir SEM REDE. Troque VERSAO a cada publicação.
//
// A página (navegação) vem da REDE quando há rede, e do guardado quando não há
// ou quando a rede demora: assim uma publicação nova chega na primeira abertura.
// A versão 2 guardava primeiro e servia o guardado — e, pior, enchia o guardado
// pelo cache HTTP do navegador, que ainda tinha a página velha (23/09/2026).
// Por isso tudo aqui é buscado com `cache: 'reload'`, que passa por cima dele.
const VERSAO = 'jotter-2026-09-23-3'
const ARQUIVOS = ['./', './index.html', './nostr-tools-2.25.2.js', './manifest.webmanifest', './icone-180.png']
const PRAZO_REDE = 3000

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO)
    .then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()))
})

function daRede(req) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('rede lenta')), PRAZO_REDE)
    fetch(req, { cache: 'reload' }).then(r => {
      clearTimeout(t)
      if (!r.ok) return falha(new Error('status ' + r.status))
      const copia = r.clone()
      caches.open(VERSAO).then(c => c.put(req, copia))
      ok(r)
    }, e => { clearTimeout(t); falha(e) })
  })
}

// Os relays (wss://) não passam por aqui — service worker não intercepta WebSocket.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.mode === 'navigate') {
    e.respondWith(daRede(e.request).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))))
    return
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)))
})
