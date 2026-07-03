var allApps = [];
var currentCategory = 'all';
var currentSearch = '';

async function renderLauncher(session) {
  document.getElementById('user-email').textContent = session.user.email;

  var grid = document.getElementById('launcher-grid');

  // Render skeletons inside the compact grid
  grid.innerHTML =
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>' +
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>' +
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>' +
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>' +
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>' +
    '<div class="skeleton-card"><div class="skeleton-icon"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';

  var _a = await supabaseClient
      .from('applications')
      .select('id, name, url, icon, category, status, user_applications!inner(user_id)')
      .eq('is_active', true)
      .eq('user_applications.user_id', session.user.id),
    apps = _a.data,
    error = _a.error;

  if (error) {
    console.error('Failed to load applications:', error);
    grid.innerHTML =
      '<div class="error-state">' +
      '<div class="error-state-card">' +
      '<i data-lucide="alert-circle" class="error-icon"></i>' +
      '<p>Não foi possível carregar suas ferramentas.<br>Tente novamente.</p>' +
      '<button class="btn-retry" id="btn-retry">Tentar novamente</button>' +
      '</div></div>';
    lucide.createIcons();
    document.getElementById('btn-retry').addEventListener('click', function () {
      renderLauncher(session);
    });
    return;
  }

  allApps = apps || [];
  
  // Render filters and first grid load
  setupFilters();
  setupKeyboardShortcuts();
  applyFilters();
}

function setupFilters() {
  var filtersContainer = document.getElementById('category-filters');
  if (!filtersContainer) return;

  // Extract unique categories
  var categories = new Set();
  for (var i = 0; i < allApps.length; i++) {
    if (allApps[i].category) {
      categories.add(allApps[i].category);
    }
  }

  var html = '<button class="category-pill active" data-category="all">Todas</button>';
  categories.forEach(function (cat) {
    html += '<button class="category-pill" data-category="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
  });

  filtersContainer.innerHTML = html;

  // Add click handlers
  document.querySelectorAll('.category-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.category-pill').forEach(function (p) {
        p.classList.remove('active');
      });
      this.classList.add('active');
      currentCategory = this.dataset.category;
      applyFilters();
    });
  });

  // Setup search input listener
  var searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      currentSearch = this.value.trim().toLowerCase();
      applyFilters();
    });
  }
}

function applyFilters() {
  var grid = document.getElementById('launcher-grid');
  if (!grid) return;

  var filtered = allApps.filter(function (app) {
    var matchesCategory = (currentCategory === 'all' || app.category === currentCategory);
    var matchesSearch = (!currentSearch || 
      (app.name && app.name.toLowerCase().includes(currentSearch)) || 
      (app.category && app.category.toLowerCase().includes(currentSearch))
    );
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column: span 6;"><div class="empty-state-card"><p>Nenhuma ferramenta encontrada</p></div></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var app = filtered[i];
    var statusClass = app.status || 'active';
    var isComingSoon = statusClass === 'coming_soon';
    
    html += '<div class="app-card ' + statusClass + '" data-url="' + escapeHtml(app.url) + '" data-status="' + statusClass + '">';
    
    // Status Badge
    if (statusClass === 'beta') {
      html += '<span class="app-badge beta">Beta</span>';
    } else if (isComingSoon) {
      html += '<span class="app-badge coming-soon">Em breve</span>';
    }

    html += '<i data-lucide="' + escapeHtml(app.icon || 'box') + '" class="app-icon"></i>';
    html += '<div class="app-name">' + escapeHtml(app.name) + '</div>';
    if (app.category) {
      html += '<div class="app-category">' + escapeHtml(app.category) + '</div>';
    }
    html += '</div>';
  }

  grid.innerHTML = html;
  lucide.createIcons();

  // Add click handlers on entire cards
  document.querySelectorAll('.app-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var url = this.dataset.url;
      var status = this.dataset.status;

      if (status === 'coming_soon') {
        showToast('Esta ferramenta está em desenvolvimento.', 'coming-soon');
        return;
      }

      if (/^https?:\/\//.test(url)) {
        window.location.href = url;
      }
    });
  });
}

function setupKeyboardShortcuts() {
  var searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  // Prevent duplicate events
  if (window.keyboardShortcutsBound) return;
  window.keyboardShortcutsBound = true;

  window.addEventListener('keydown', function (e) {
    // '/' focuses search
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      currentSearch = '';
      searchInput.blur();
      applyFilters();
    } else if (e.key === 'Enter') {
      // Enter opens the first visible tool
      var visibleCards = document.querySelectorAll('.app-card');
      if (visibleCards.length > 0) {
        var firstCard = visibleCards[0];
        firstCard.click();
      }
    }
  });
}

function showToast(message, type) {
  var container = document.getElementById('toast-container');
  if (!container) return;

  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  
  var iconName = type === 'coming-soon' ? 'construction' : 'check-circle';
  toast.innerHTML = 
    '<i data-lucide="' + iconName + '" class="toast-icon"></i>' +
    '<span>' + escapeHtml(message) + '</span>';

  container.appendChild(toast);
  lucide.createIcons();

  // Remove toast after 3 seconds
  setTimeout(function () {
    toast.remove();
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
