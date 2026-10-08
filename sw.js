// ============================================================
//  VERSÃO DO APP — a cada publicação, aumente o número e
//  descreva as mudanças. É isso que faz os aparelhos mostrarem
//  o aviso "Nova versão disponível".
// ============================================================
const VERSION = '1.6.0';
const CHANGES = [
  'Histórico de preços na lista de compras: variação em 12 meses, menor e maior preço e gráfico',
  'Nova navegação por abas: Início, Lançar, Compras, Investir e Mais',
  'Contas a pagar no Início, com botão para marcar como paga',
  'Lista de compras: catálogo de itens, quantidade, valor pago e último preço',
  'Finalizar compra lança o total como despesa do mês',
  'Aportes e resgates nos investimentos, com histórico',
  'Opção de lançar aportes e resgates no mês',
  'Card de patrimônio total (saldo + investimentos)',
  'Investimentos: cadastre poupança, CDB, ações e outros, e acompanhe o rendimento',
  'Novo logo do app',
  'Despesas pagas e a pagar: marque com um toque, veja o total a pagar e as atrasadas',
];

// Service worker: guarda uma cópia desta versão do app no aparelho.
// O app sempre abre a versão guardada (funciona sem internet); uma versão
// nova só entra em uso quando o usuário toca em "Atualizar".
const CACHE = 'financas-' + VERSION;
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest',
  'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

// bibliotecas do Firebase (mesma versão usada no index.html)
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const SDK_FILES = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => SDK + f);

self.addEventListener('install', e => {
  // cache: 'reload' ignora o cache HTTP para baixar mesmo os arquivos novos
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    await c.addAll(SDK_FILES).catch(() => {}); // se falhar, guarda no primeiro uso
  }));
  // sem skipWaiting aqui: a versão nova espera o usuário aceitar
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('financas-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data === 'GET_VERSION' && e.ports[0]) e.ports[0].postMessage({ version: VERSION, changes: CHANGES });
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // bibliotecas do Firebase: guarda na primeira vez e depois usa a cópia (os arquivos não mudam)
  if (req.url.startsWith(SDK)) {
    e.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(req)) || fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; })));
    return;
  }
  // só arquivos do próprio app; o banco e o login do Google passam direto
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('index.html') : null);
    return hit || fetch(req);
  }));
});
