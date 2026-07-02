async function renderLauncher(session) {
  const userEmail = document.getElementById('user-email');
  userEmail.textContent = session.user.email;

  const btnLogout = document.getElementById('btn-logout');
  btnLogout.addEventListener('click', async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    const grid = document.getElementById('launcher-grid');
    grid.innerHTML = '';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').textContent = '';
    showLogin();
  });

  const grid = document.getElementById('launcher-grid');

  const { data: apps, error } = await supabaseClient
    .from('applications')
    .select('id, name, url, icon, category, is_active')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to load applications:', error);
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-card"><p>Em desenvolvimento</p></div></div>';
    return;
  }

  if (!apps || apps.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-card"><p>Em desenvolvimento</p></div></div>';
    return;
  }

  const grouped = {};
  for (const app of apps) {
    const cat = app.category || 'Outros';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(app);
  }

  let html = '';
  for (const [category, items] of Object.entries(grouped)) {
    html += '<div class="category-section">';
    html += '<div class="category-label">' + escapeHtml(category) + '</div>';
    html += '<div class="card-grid">';

    for (const app of items) {
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

  document.querySelectorAll('.btn-access').forEach(btn => {
    btn.addEventListener('click', function () {
      window.location.href = this.dataset.url;
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showLogin() {
  document.getElementById('view-login').classList.add('active');
  document.getElementById('view-launcher').classList.remove('active');
}
