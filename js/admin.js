// Telas de admin: acessos temporários (convites) e catálogo de ferramentas.
// Os botões só aparecem para admin, mas quem garante é o banco: toda função wb_* de admin confere o papel.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var rpc = function (fn, args) { return supabaseClient.rpc(fn, args || {}); };
  var catalog = [];   // todas as ferramentas, inclusive ocultas
  var invites = [];

  function fail(r, what) {
    if (!r.error) return false;
    console.error(what, r.error);
    showToast(what + ': ' + (r.error.message || 'erro'), 'error');
    return true;
  }
  function when(iso) { return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nunca'; }
  function open(id) { $(id).showModal(); lucide.createIcons(); }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) c.closest('dialog').close();
  });

  // ============================ ACESSOS ============================
  function status(i) {
    if (i.revoked_at) return ['off', '✕ Revogado'];
    if (new Date(i.expires_at) <= new Date()) return ['off', '○ Expirado'];
    return ['on', '● Ativo'];
  }
  function drawInvites() {
    if (!invites.length) { $('inv-list').innerHTML = '<p class="hint">Nenhum convite criado ainda.</p>'; return; }
    $('inv-list').innerHTML = '<table class="tbl"><thead><tr><th>Para quem</th><th>Ferramentas</th><th>Situação</th><th>Vale até</th><th>Usos</th><th>Visto por último</th><th>Ações</th></tr></thead><tbody>' +
      invites.map(function (i) {
        var st = status(i), live = st[0] === 'on';
        return '<tr><td>' + escapeHtml(i.label || 'sem rótulo') + '</td>' +
          '<td>' + (i.app_ids ? escapeHtml((i.apps || []).join(', ') || 'removidas') : 'Todas') + '</td>' +
          '<td><span class="badge ' + st[0] + '">' + st[1] + '</span></td>' +
          '<td>' + when(i.expires_at) + (live ? '<br><small>mais ' + timeLeft(new Date(i.expires_at) - Date.now()) + '</small>' : '') + '</td>' +
          '<td>' + i.uses + ' de ' + i.max_uses + '</td><td>' + when(i.last_seen_at) + '</td>' +
          '<td class="actions">' +
          (live ? '<button type="button" data-inv="extend" data-id="' + i.id + '">+24 h</button><button type="button" data-inv="revoke" data-id="' + i.id + '">Revogar</button>' : '') +
          '<button type="button" data-inv="copy" data-id="' + i.id + '">Duplicar</button><button type="button" data-inv="delete" data-id="' + i.id + '">Excluir</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  async function loadInvites() {
    var r = await rpc('wb_invite_list');
    if (fail(r, 'Não consegui listar os convites')) return;
    invites = r.data || []; drawInvites();
  }
  function drawInviteApps(checked) {
    var all = !checked;
    $('inv-all').checked = all;
    $('inv-apps').innerHTML = catalog.filter(function (a) { return a.is_active && a.status !== 'coming_soon'; }).map(function (a) {
      return '<label class="chk"><input type="checkbox" value="' + a.id + '"' + (!all && checked.indexOf(a.id) >= 0 ? ' checked' : '') + (all ? ' disabled' : '') + '> ' + escapeHtml(a.name) + '</label>';
    }).join('');
  }
  async function loadCatalog() {
    var r = await rpc('wb_app_list');
    if (fail(r, 'Não consegui ler o catálogo')) return false;
    catalog = r.data || []; return true;
  }

  $('btn-access').addEventListener('click', async function () {
    if (!await loadCatalog()) return;
    $('inv-result').hidden = true; $('inv-form').reset(); $('inv-until-wrap').hidden = true;
    drawInviteApps([]); $('inv-all').checked = false;
    open('dlg-access'); loadInvites();
  });
  $('inv-all').addEventListener('change', function () {
    var on = this.checked;
    Array.prototype.forEach.call($('inv-apps').querySelectorAll('input'), function (c) { c.disabled = on; });
  });
  $('inv-dur').addEventListener('change', function () { $('inv-until-wrap').hidden = this.value !== 'custom'; });

  $('inv-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var ids = $('inv-all').checked ? null : Array.prototype.map.call($('inv-apps').querySelectorAll('input:checked'), function (c) { return c.value; });
    if (ids && !ids.length) return showToast('Escolha ao menos uma ferramenta.', 'error');
    var dur = $('inv-dur').value, until = dur === 'custom' ? new Date($('inv-until').value) : new Date(Date.now() + dur * 36e5);
    if (isNaN(until) || until <= new Date()) return showToast('Escolha uma data de validade no futuro.', 'error');
    var r = await rpc('wb_invite_create', { p_label: $('inv-label').value.trim(), p_app_ids: ids, p_expires_at: until.toISOString(), p_max_uses: +$('inv-uses').value || 1 });
    if (fail(r, 'Não consegui criar o convite')) return;
    $('inv-link').value = CONFIG.PORTAL_URL + '#convite=' + r.data.token;
    $('inv-result').hidden = false; $('inv-link').select();
    loadInvites();
  });
  $('inv-copy').addEventListener('click', function () {
    navigator.clipboard.writeText($('inv-link').value).then(function () { showToast('Link copiado.'); }, function () { showToast('Selecione o link e copie com Ctrl+C.', 'error'); });
  });

  $('inv-list').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-inv]'); if (!b) return;
    var i = invites.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!i) return;
    var act = b.dataset.inv, r;
    if (act === 'copy') {
      $('inv-label').value = i.label; $('inv-uses').value = i.max_uses; drawInviteApps(i.app_ids);
      $('inv-result').hidden = true; $('inv-label').focus();
      return showToast('Dados copiados para o formulário. Ajuste e gere um link novo.');
    }
    if (act === 'extend') r = await rpc('wb_invite_extend', { p_id: i.id, p_expires_at: new Date(new Date(i.expires_at).getTime() + 864e5).toISOString() });
    else if (act === 'revoke') { if (!confirm('Revogar o acesso de "' + (i.label || 'sem rótulo') + '"? Quem estiver usando perde o acesso no próximo carregamento.')) return; r = await rpc('wb_invite_revoke', { p_id: i.id }); }
    else if (act === 'delete') { if (!confirm('Excluir o convite "' + (i.label || 'sem rótulo') + '"? O acesso é cortado e o registro some da lista.')) return; r = await rpc('wb_invite_delete', { p_id: i.id }); }
    if (r && !fail(r, 'A ação não foi concluída')) loadInvites();
  });

  // ============================ CATÁLOGO ============================
  var SITUACAO = { active: 'Ativa', beta: 'Beta', coming_soon: 'Em breve' };
  var FIELDS = ['name', 'slug', 'url', 'category', 'icon', 'description', 'keywords', 'status'];

  function drawCatalog() {
    $('app-list').innerHTML = '<table class="tbl"><thead><tr><th>Ferramenta</th><th>Categoria</th><th>Situação</th><th>No portal</th><th>Ações</th></tr></thead><tbody>' +
      catalog.map(function (a) {
        return '<tr><td><i data-lucide="' + escapeHtml(a.icon || 'box') + '" class="tbl-icon"></i> <strong>' + escapeHtml(a.name) + '</strong><br><small>' + escapeHtml(a.slug) + '</small></td>' +
          '<td>' + escapeHtml(a.category || '') + '</td><td>' + (SITUACAO[a.status] || escapeHtml(a.status)) + '</td>' +
          '<td><span class="badge ' + (a.is_active ? 'on">● Aparece' : 'off">○ Oculta') + '</span></td>' +
          '<td class="actions"><button type="button" data-app="' + a.id + '">Editar</button></td></tr>';
      }).join('') + '</tbody></table>';
    var cats = []; catalog.forEach(function (a) { if (a.category && cats.indexOf(a.category) < 0) cats.push(a.category); });
    $('app-cats').innerHTML = cats.map(function (c) { return '<option value="' + escapeHtml(c) + '">'; }).join('');
    lucide.createIcons();
  }
  function editApp(a) {
    $('app-id').value = a ? a.id : '';
    FIELDS.forEach(function (f) { $('app-' + f).value = a && a[f] != null ? a[f] : f === 'status' ? 'active' : ''; });
    $('app-active').checked = a ? !!a.is_active : true;
    $('app-delete').hidden = !a;
    $('app-form').hidden = false; $('app-list-wrap').hidden = true;
    $('app-name').focus();
  }
  function closeForm() { $('app-form').hidden = true; $('app-list-wrap').hidden = false; }

  $('btn-catalog').addEventListener('click', async function () {
    if (!await loadCatalog()) return;
    closeForm(); drawCatalog(); open('dlg-catalog');
  });
  $('app-new').addEventListener('click', function () { editApp(null); });
  $('app-cancel').addEventListener('click', closeForm);
  $('app-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-app]'); if (!b) return;
    editApp(catalog.filter(function (a) { return a.id === b.dataset.app; })[0]);
  });
  // slug sugerido a partir do nome, só em ferramenta nova e enquanto o slug não foi mexido
  $('app-name').addEventListener('input', function () {
    if ($('app-id').value || $('app-slug').dataset.touched) return;
    $('app-slug').value = this.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
  $('app-slug').addEventListener('input', function () { this.dataset.touched = '1'; });

  async function afterChange(msg) {
    showToast(msg);
    if (await loadCatalog()) { closeForm(); drawCatalog(); }
    renderLauncher(H.session);   // a home reflete a mudança na hora
  }
  $('app-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var p = { id: $('app-id').value, is_active: $('app-active').checked };
    FIELDS.forEach(function (f) { p[f] = $('app-' + f).value.trim(); });
    var r = await rpc('wb_app_save', { p: p });
    if (fail(r, 'Não consegui salvar')) return;
    delete $('app-slug').dataset.touched;
    afterChange('Ferramenta salva.');
  });
  $('app-delete').addEventListener('click', async function () {
    var name = $('app-name').value;
    if (!confirm('Excluir "' + name + '" do catálogo? As permissões dessa ferramenta são apagadas junto. Para só esconder, desmarque "Aparece no portal".')) return;
    var r = await rpc('wb_app_delete', { p_id: $('app-id').value });
    if (fail(r, 'Não consegui excluir')) return;
    afterChange('Ferramenta excluída.');
  });
})();
