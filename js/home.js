// Home do portal: ferramentas do usuário, fixadas, recentes, categorias, busca e ordenação.
// Os dados vêm de wb_context (uma chamada: permissões, convidado, admin e catálogo visível).
var H = {
  session: null, ctx: null, apps: [], q: '', cat: 'all', bound: false, timer: null, saveTimer: null,
  prefs: { pin: [], use: {}, view: 'grid', sort: 'cat', closed: [], ts: 0 }
};
var NEW_DAYS = 14;

function escapeHtml(str) {
  if (str == null) return '';
  var div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function timeLeft(ms) {
  var m = Math.max(Math.ceil(ms / 60000), 0), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
  return d ? d + ' d ' + h + ' h' : h ? h + ' h ' + (m % 60) + ' min' : m + ' min';
}

function showToast(message, type) {
  var container = document.getElementById('toast-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.innerHTML = '<i data-lucide="' + (type === 'coming-soon' ? 'info' : type === 'error' ? 'alert-circle' : 'check-circle') + '" class="toast-icon"></i><span>' + escapeHtml(message) + '</span>';
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(function () { toast.remove(); }, 4000);
}

// ---------- preferências: cópia local imediata + Supabase para acompanhar entre computadores ----------
function prefsKey() { return 'wb.prefs.' + H.session.user.id; }
function cleanPrefs(p) {
  var d = { pin: [], use: {}, view: 'grid', sort: 'cat', closed: [], ts: 0 };
  if (!p || typeof p !== 'object') return d;
  if (Array.isArray(p.pin)) d.pin = p.pin.filter(function (s) { return typeof s === 'string'; }).slice(0, 50);
  if (Array.isArray(p.closed)) d.closed = p.closed.filter(function (s) { return typeof s === 'string'; }).slice(0, 50);
  if (p.use && typeof p.use === 'object') Object.keys(p.use).slice(0, 200).forEach(function (k) {
    var u = p.use[k]; if (Array.isArray(u) && isFinite(u[0]) && isFinite(u[1])) d.use[k] = [+u[0], +u[1]];
  });
  if (p.view === 'list') d.view = 'list';
  if (['cat', 'az', 'use', 'recent', 'new'].indexOf(p.sort) >= 0) d.sort = p.sort;
  d.ts = +p.ts || 0;
  return d;
}
async function loadPrefs() {
  var local = null, remote = null;
  try { local = JSON.parse(localStorage.getItem(prefsKey())); } catch (e) { local = null; }
  var r = await supabaseClient.from('user_prefs').select('data').eq('user_id', H.session.user.id).maybeSingle();
  if (!r.error && r.data) remote = r.data.data;
  local = cleanPrefs(local); remote = cleanPrefs(remote);
  H.prefs = local.ts >= remote.ts ? local : remote;      // vale a cópia mais recente
  if (local.ts > remote.ts) pushPrefs();                  // o que ficou só neste navegador sobe agora
}
function pushPrefs() {
  supabaseClient.from('user_prefs').upsert({ user_id: H.session.user.id, data: H.prefs, updated_at: new Date().toISOString() })
    .then(function (r) { if (r.error) console.error('Failed to save preferences:', r.error); });
}
function savePrefs(now) {
  H.prefs.ts = Date.now();
  try { localStorage.setItem(prefsKey(), JSON.stringify(H.prefs)); } catch (e) { /* sem armazenamento local: segue só com o Supabase */ }
  clearTimeout(H.saveTimer);
  if (now) pushPrefs(); else H.saveTimer = setTimeout(pushPrefs, 600);
}

// ---------- carga ----------
async function renderLauncher(session) {
  H.session = session;
  var grid = document.getElementById('launcher-grid');
  var sk = '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';
  grid.innerHTML = '<div class="card-grid">' + sk + sk + sk + sk + sk + sk + '</div>';

  var res = await supabaseClient.rpc('wb_context', { p_url: location.origin + location.pathname });
  if (res.error || !res.data) {
    console.error('Failed to load applications:', res.error);
    grid.innerHTML = '<div class="error-state"><div class="error-state-card"><i data-lucide="alert-circle" class="error-icon"></i>' +
      '<p>Não foi possível carregar suas ferramentas.<br>Tente novamente.</p><button class="btn-retry" id="btn-retry">Tentar novamente</button></div></div>';
    lucide.createIcons();
    document.getElementById('btn-retry').addEventListener('click', function () { renderLauncher(session); });
    return;
  }
  H.ctx = res.data;
  H.apps = (H.ctx.apps || []).filter(function (a) { return a && a.slug && a.name; });
  await loadPrefs();

  document.getElementById('btn-access').hidden = !H.ctx.admin;
  document.getElementById('btn-catalog').hidden = !H.ctx.admin;
  clearInterval(H.timer);
  tickUser();
  if (H.ctx.guest) H.timer = setInterval(tickUser, 30000);

  bindHome();
  document.getElementById('sort-select').value = H.prefs.sort;
  drawFilters();
  draw();
}

function tickUser() {
  var el = document.getElementById('user-email');
  if (!H.ctx.guest) { el.textContent = H.session.user.email || ''; return; }
  var until = H.ctx.guest_until ? new Date(H.ctx.guest_until).getTime() : 0, ms = until - Date.now();
  if (until && ms <= 0) { clearInterval(H.timer); renderLauncher(H.session); return; }   // venceu: recarrega e mostra o estado vazio
  el.textContent = until ? 'Convidado, acesso por mais ' + timeLeft(ms) : 'Convidado';
}

// ---------- desenho ----------
function useOf(a) { return H.prefs.use[a.slug] || [0, 0]; }
function isNew(a) { return a.created_at && Date.now() - new Date(a.created_at).getTime() < NEW_DAYS * 864e5; }
function byName(a, b) { return a.name.localeCompare(b.name, 'pt-BR'); }
function sorter(mode) {
  if (mode === 'use') return function (a, b) { return useOf(b)[0] - useOf(a)[0] || byName(a, b); };
  if (mode === 'recent') return function (a, b) { return useOf(b)[1] - useOf(a)[1] || byName(a, b); };
  if (mode === 'new') return function (a, b) { return new Date(b.created_at) - new Date(a.created_at) || byName(a, b); };
  return byName;
}

function card(a) {
  var soon = a.status === 'coming_soon', pinned = H.prefs.pin.indexOf(a.slug) >= 0, ok = /^https?:\/\//.test(a.url || '');
  var inner = '<i data-lucide="' + escapeHtml(a.icon || 'box') + '" class="app-icon"></i>' +
    '<span class="app-text"><span class="app-name">' + escapeHtml(a.name) + '</span>' +
    (a.description ? '<span class="app-desc">' + escapeHtml(a.description) + '</span>' : '') +
    (a.category ? '<span class="app-category">' + escapeHtml(a.category) + '</span>' : '') + '</span>';
  var badge = soon ? '<span class="app-badge coming_soon">Em breve</span>' : a.status === 'beta' ? '<span class="app-badge beta">Beta</span>' : isNew(a) ? '<span class="app-badge beta">Novo</span>' : '';
  return '<div class="app-card ' + escapeHtml(a.status || 'active') + '">' +
    (soon || !ok ? '<span class="app-link">' + inner + '</span>' : '<a class="app-link" href="' + escapeHtml(a.url) + '" data-slug="' + escapeHtml(a.slug) + '">' + inner + '</a>') +
    badge +
    (soon ? '' : '<button class="app-pin" type="button" data-pin="' + escapeHtml(a.slug) + '" aria-pressed="' + pinned + '" aria-label="' + (pinned ? 'Desafixar ' : 'Fixar ') + escapeHtml(a.name) + '" title="' + (pinned ? 'Desafixar' : 'Fixar no topo') + '"><i data-lucide="pin"></i></button>') +
    '</div>';
}
function section(title, list, key) {
  if (!list.length) return '';
  var closed = key && H.prefs.closed.indexOf(key) >= 0;
  var head = key
    ? '<button class="section-head" type="button" data-toggle="' + escapeHtml(key) + '" aria-expanded="' + !closed + '"><i data-lucide="chevron-down"></i>' + escapeHtml(title) + '<span class="count">' + list.length + '</span></button>'
    : '<div class="section-head static">' + escapeHtml(title) + '<span class="count">' + list.length + '</span></div>';
  return '<section class="category-section">' + head + (closed ? '' : '<div class="card-grid' + (H.prefs.view === 'list' ? ' list' : '') + '">' + list.map(card).join('') + '</div>') + '</section>';
}

function drawFilters() {
  var cats = [];
  H.apps.forEach(function (a) { if (a.category && a.status !== 'coming_soon' && cats.indexOf(a.category) < 0) cats.push(a.category); });
  cats.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  if (H.cat !== 'all' && cats.indexOf(H.cat) < 0) H.cat = 'all';
  document.getElementById('category-filters').innerHTML = ['all'].concat(cats).map(function (c) {
    return '<button class="category-pill' + (c === H.cat ? ' active' : '') + '" type="button" data-category="' + escapeHtml(c) + '" aria-pressed="' + (c === H.cat) + '">' + escapeHtml(c === 'all' ? 'Todas' : c) + '</button>';
  }).join('');
}

function draw() {
  var grid = document.getElementById('launcher-grid'), q = norm(H.q), mode = H.prefs.sort;
  var match = function (a) { return (H.cat === 'all' || a.category === H.cat) && (!q || norm([a.name, a.category, a.description, a.keywords].join(' ')).indexOf(q) >= 0); };
  var live = H.apps.filter(function (a) { return a.status !== 'coming_soon' && match(a); });
  var soon = H.apps.filter(function (a) { return a.status === 'coming_soon' && match(a); }).sort(byName);
  var html = '';

  if (!H.apps.length) {
    html = '<div class="empty-state"><div class="empty-state-card"><p>' + (H.ctx.guest ? 'Seu acesso temporário terminou ou ainda não foi liberado. Peça um novo link a quem enviou.' : 'Nenhuma ferramenta liberada para você ainda.') + '</p></div></div>';
  } else if (!live.length && !soon.length) {
    html = '<div class="empty-state"><div class="empty-state-card"><p>Nenhuma ferramenta encontrada</p></div></div>';
  } else if (q || H.cat !== 'all' || mode !== 'cat') {
    // busca, filtro ou ordenação própria: lista única
    html = section(q ? 'Resultados' : H.cat !== 'all' ? H.cat : 'Todas', live.sort(sorter(mode === 'cat' ? 'az' : mode)), '') + section('Em breve', soon, '');
  } else {
    var pins = H.prefs.pin.map(function (s) { return live.filter(function (a) { return a.slug === s; })[0]; }).filter(Boolean);
    var recent = live.filter(function (a) { return useOf(a)[1] && pins.indexOf(a) < 0; }).sort(sorter('recent')).slice(0, 4);
    html = section('Fixadas', pins, '') + section('Usadas por último', recent, '');
    var cats = {};
    live.forEach(function (a) { (cats[a.category || 'Outras'] = cats[a.category || 'Outras'] || []).push(a); });
    Object.keys(cats).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).forEach(function (c) { html += section(c, cats[c].sort(byName), c); });
    html += section('Em breve', soon, 'Em breve');
  }
  grid.innerHTML = html;
  document.getElementById('view-toggle').innerHTML = '<i data-lucide="' + (H.prefs.view === 'list' ? 'layout-grid' : 'list') + '"></i>';
  lucide.createIcons();
}

// ---------- eventos (ligados uma vez; o conteúdo é redesenhado) ----------
function bindHome() {
  if (H.bound) return;
  H.bound = true;
  var grid = document.getElementById('launcher-grid'), search = document.getElementById('search-input');
  var links = function () { return Array.prototype.slice.call(grid.querySelectorAll('a.app-link')); };

  grid.addEventListener('click', function (e) {
    var pin = e.target.closest('[data-pin]'), tog = e.target.closest('[data-toggle]'), link = e.target.closest('a.app-link');
    if (pin) {
      var s = pin.dataset.pin, i = H.prefs.pin.indexOf(s);
      if (i >= 0) H.prefs.pin.splice(i, 1); else H.prefs.pin.push(s);
      savePrefs(); draw();
    } else if (tog) {
      var k = tog.dataset.toggle, j = H.prefs.closed.indexOf(k);
      if (j >= 0) H.prefs.closed.splice(j, 1); else H.prefs.closed.push(k);
      savePrefs(); draw();
    } else if (link) {
      var u = H.prefs.use[link.dataset.slug] || [0, 0];
      H.prefs.use[link.dataset.slug] = [u[0] + 1, Date.now()];
      savePrefs(true);   // a navegação pode cortar o envio; a cópia local sobe na próxima visita
    }
  });
  grid.addEventListener('keydown', function (e) {
    if (!e.target.matches || !e.target.matches('a.app-link')) return;
    var all = links(), i = all.indexOf(e.target);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); (all[i + 1] || all[i]).focus(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); (all[i - 1] || search).focus(); }
  });

  document.getElementById('category-filters').addEventListener('click', function (e) {
    var p = e.target.closest('[data-category]'); if (!p) return;
    H.cat = p.dataset.category; drawFilters(); draw();
  });
  document.getElementById('sort-select').addEventListener('change', function () { H.prefs.sort = this.value; savePrefs(); draw(); });
  document.getElementById('view-toggle').addEventListener('click', function () { H.prefs.view = H.prefs.view === 'list' ? 'grid' : 'list'; savePrefs(); draw(); });

  search.addEventListener('input', function () { H.q = this.value.trim(); draw(); });
  search.addEventListener('keydown', function (e) {
    var all = links();
    if (e.key === 'Escape') { search.value = ''; H.q = ''; search.blur(); draw(); }
    else if (e.key === 'Enter' && all[0]) all[0].click();
    else if (e.key === 'ArrowDown' && all[0]) { e.preventDefault(); all[0].focus(); }
  });
  window.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    if (e.key === '/' && !typing && document.getElementById('view-launcher').classList.contains('active') && !document.querySelector('dialog[open]')) {
      e.preventDefault(); search.focus(); search.select();
    }
  });
}

function clearLauncher() {
  clearInterval(H.timer);
  H.ctx = null; H.apps = []; H.q = ''; H.cat = 'all';
  document.getElementById('launcher-grid').innerHTML = '';
  document.getElementById('search-input').value = '';
  document.getElementById('btn-access').hidden = true;
  document.getElementById('btn-catalog').hidden = true;
}
