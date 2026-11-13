/*
  App Bridge do Allan Workbench. Carregado por toda ferramenta, a partir do portal.
  1. Exige sessão do Supabase; sem sessão, volta ao portal.
  2. Pergunta ao banco (wb_context) se ESTE usuário pode abrir ESTA ferramenta.
  3. Injeta o cabeçalho, o trocador rápido (Ctrl+K) e revela a página.
  Convidado (sessão anônima com convite) vê o prazo e é devolvido ao portal quando ele vence.
*/
(function () {
  'use strict';

  if (typeof CONFIG === 'undefined') {
    console.error('workbench-bridge: CONFIG not found. Load config.js before this script.');
    return;
  }

  var PORTAL = CONFIG.PORTAL_URL;
  var FONT = 'font-family:Inter,system-ui,sans-serif;';
  var BTN = 'background-color:#101010;color:#f2f2f2;' + FONT + 'font-size:14px;font-weight:600;line-height:24px;' +
    'border:1px solid #3d3a39;border-radius:6px;padding:8px 14px;cursor:pointer;';

  var client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, storageKey: 'sb-' + CONFIG.SUPABASE_PROJECT_ID + '-auth-token' }
  });

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text != null) n.textContent = text;
    return n;
  }

  // Falha de rede ou do banco: nega o acesso, mas explica em vez de deixar a tela em branco.
  function fail() {
    document.body.textContent = '';
    var box = el('div', 'max-width:420px;margin:15vh auto;padding:32px 24px;text-align:center;color:#bdbdbd;' + FONT +
      'background:#1a1a1a;border:1px solid #3d3a39;border-radius:8px;');
    box.appendChild(el('p', 'font-size:16px;line-height:26px;margin-bottom:16px;', 'Não foi possível validar seu acesso. Verifique a conexão e tente de novo.'));
    var retry = el('button', BTN, 'Tentar de novo');
    retry.addEventListener('click', function () { location.reload(); });
    var back = el('a', 'display:inline-block;margin-left:12px;color:#2fd6a1;font-size:14px;', 'Voltar ao portal');
    back.href = PORTAL;
    box.appendChild(retry); box.appendChild(back);
    document.body.appendChild(box);
    document.body.style.cssText = 'display:block;background:#101010;margin:0;';
  }

  function left(ms) {
    var m = Math.max(Math.ceil(ms / 60000), 0), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    return d ? d + ' d ' + h + ' h' : h ? h + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // Trocador rápido: Ctrl+K em qualquer ferramenta
  function palette(apps) {
    var sel = 0, shown = [];
    var ov = el('div', 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);align-items:flex-start;justify-content:center;padding:12vh 16px 0;');
    var box = el('div', 'width:100%;max-width:520px;background:#1a1a1a;border:1px solid #3d3a39;border-radius:8px;overflow:hidden;' + FONT);
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Trocar de ferramenta');
    var inp = el('input', 'width:100%;box-sizing:border-box;background:#1a1a1a;color:#fff;border:0;border-bottom:1px solid #3d3a39;padding:14px 16px;font-size:16px;outline:none;' + FONT);
    inp.placeholder = 'Ir para a ferramenta...'; inp.setAttribute('aria-label', 'Buscar ferramenta');
    var list = el('div', 'max-height:50vh;overflow:auto;padding:6px;');
    box.appendChild(inp); box.appendChild(list); ov.appendChild(box); document.body.appendChild(ov);

    function draw() {
      var q = norm(inp.value);
      shown = apps.filter(function (a) { return !q || norm(a.name + ' ' + a.category + ' ' + a.description + ' ' + a.keywords).indexOf(q) >= 0; });
      sel = Math.min(sel, Math.max(shown.length - 1, 0));
      list.textContent = '';
      if (!shown.length) { list.appendChild(el('div', 'padding:12px;color:#8b949e;font-size:14px;', 'Nenhuma ferramenta encontrada')); return; }
      shown.forEach(function (a, i) {
        var row = el('a', 'display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:6px;text-decoration:none;font-size:15px;color:#f2f2f2;' +
          (i === sel ? 'background:#00d992;color:#101010;' : ''));
        row.href = a.url;
        row.appendChild(el('span', 'font-weight:600;', a.name));
        row.appendChild(el('span', 'font-size:12px;opacity:.75;align-self:center;', a.category || ''));
        list.appendChild(row);
      });
    }
    function open() { ov.style.display = 'flex'; inp.value = ''; sel = 0; draw(); inp.focus(); }
    function close() { ov.style.display = 'none'; }
    inp.addEventListener('input', function () { sel = 0; draw(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === 'Enter' && shown[sel]) { location.href = shown[sel].url; }
      else if (e.key === 'Escape') close();
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); if (ov.style.display === 'none') open(); else close(); }
    });
    return open;
  }

  function mount(session, ctx) {
    var header = el('header', 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;' +
      'background-color:#101010;border-bottom:1px solid #3d3a39;padding:12px 32px;' + FONT);
    var logo = el('a', 'font-size:18px;font-weight:600;line-height:28px;letter-spacing:0.45px;color:#00d992;text-decoration:none;', 'Allan Workbench');
    logo.href = PORTAL;
    var right = el('div', 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;');

    var others = (ctx.apps || []).filter(function (a) { return a.status !== 'coming_soon' && a.slug !== ctx.app && /^https:\/\//.test(a.url); });
    if (others.length) {
      var sw = el('button', BTN, 'Ferramentas');
      sw.title = 'Trocar de ferramenta (Ctrl+K)';
      sw.appendChild(el('span', 'margin-left:8px;font-size:11px;font-weight:600;color:#8b949e;border:1px solid #3d3a39;border-radius:4px;padding:1px 5px;', 'Ctrl K'));
      sw.addEventListener('click', palette(others));
      right.appendChild(sw);
    }

    var who = el('span', 'font-size:14px;color:#bdbdbd;');
    var until = ctx.guest && ctx.expires_at ? new Date(ctx.expires_at).getTime() : 0;
    function tick() {
      if (!until) { who.textContent = ctx.guest ? 'Convidado' : session.user.email; return; }
      var ms = until - Date.now();
      if (ms <= 0) { location.href = PORTAL + '#expirado'; return; }
      who.textContent = 'Convidado, acesso por mais ' + left(ms);
    }
    tick();
    if (until) setInterval(tick, 30000);

    var out = el('button', BTN, 'Sair');
    out.addEventListener('click', function () {
      client.auth.signOut().catch(function (err) { console.error('Bridge logout error:', err); }).then(function () { location.href = PORTAL; });
    });

    right.appendChild(who); right.appendChild(out);
    header.appendChild(logo); header.appendChild(right);
    document.body.insertBefore(header, document.body.firstChild);

    // Revela a interface só depois de sessão e permissão confirmadas
    document.body.style.display = '';
  }

  client.auth.getSession().then(function (result) {
    if (result.error || !result.data.session) { location.href = PORTAL; return; }
    var session = result.data.session;
    return client.rpc('wb_context', { p_url: location.origin + location.pathname }).then(function (r) {
      if (r.error || !r.data) { console.error('Bridge access check failed:', r.error); fail(); return; }
      if (!r.data.allowed) { location.href = PORTAL + '#sem-acesso'; return; }
      mount(session, r.data);
    });
  }).catch(function (err) { console.error('Bridge error:', err); fail(); });
})();
