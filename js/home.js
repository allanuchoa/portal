async function renderLauncher(session) {
  document.getElementById('user-email').textContent = session.user.email;

  var grid = document.getElementById('launcher-grid');

  var _a = await supabaseClient
      .from('applications')
      .select('id, name, url, icon, category, user_applications!inner(user_id)')
      .eq('is_active', true)
      .eq('user_applications.user_id', session.user.id),
    apps = _a.data,
    error = _a.error;

  if (error) {
    console.error('Failed to load applications:', error);
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-card"><p>Em desenvolvimento</p></div></div>';
    return;
  }

  if (!apps || apps.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-card"><p>Em desenvolvimento</p></div></div>';
    return;
  }

  var grouped = {};
  for (var i = 0; i < apps.length; i++) {
    var app = apps[i];
    var cat = app.category || 'Outros';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(app);
  }

  var html = '';
  var categories = Object.keys(grouped);
  for (var c = 0; c < categories.length; c++) {
    var category = categories[c];
    var items = grouped[category];

    html += '<div class="category-section">';
    html += '<div class="category-label">' + escapeHtml(category) + '</div>';
    html += '<div class="card-grid">';

    for (var j = 0; j < items.length; j++) {
      var app = items[j];
      html += '<div class="app-card">';
      html += '<i data-lucide="' + escapeHtml(app.icon || 'box') + '" class="app-icon"></i>';
      html += '<div class="app-name">' + escapeHtml(app.name) + '</div>';
      html += '<button class="btn-access" data-url="' + escapeHtml(app.url) + '">Acessar</button>';
      html += '</div>';
    }

    html += '</div></div>';
  }

  grid.innerHTML = html;
  lucide.createIcons();

  document.querySelectorAll('.btn-access').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = this.dataset.url;
      if (/^https?:\/\//.test(url)) {
        window.location.href = url;
      }
    });
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
