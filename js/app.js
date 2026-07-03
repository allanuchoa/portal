document.addEventListener('DOMContentLoaded', initApp);

const viewLogin = document.getElementById('view-login');
const viewLauncher = document.getElementById('view-launcher');

function showLogin() {
  viewLogin.classList.add('active');
  viewLauncher.classList.remove('active');
}

function showLauncher() {
  viewLogin.classList.remove('active');
  viewLauncher.classList.add('active');
}

async function initApp() {
  supabaseClient.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_OUT') {
      clearLauncher();
      showLogin();
    }
  });

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const btnLogout = document.getElementById('btn-logout');

  var logoutBound = false;

  function bindLogout() {
    if (logoutBound) return;
    logoutBound = true;
    btnLogout.addEventListener('click', async function () {
      var _a;
      var error = (_a = await signOut()) === null || _a === void 0 ? void 0 : _a.error;
      if (error) {
        console.error('Logout error:', error);
      }
      clearLauncher();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      showLogin();
    });
  }

  var session = await getSession();

  if (session) {
    showLauncher();
    bindLogout();
    renderLauncher(session);
  } else {
    showLogin();
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var email = emailInput.value.trim();
    var password = passwordInput.value.trim();

    if (!email || !password) {
      loginError.textContent = 'Preencha todos os campos';
      return;
    }

    loginError.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    var result = await signIn(email, password);

    if (result.error) {
      loginError.textContent = 'Credenciais invalidas';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      return;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';

    if (result.data.session) {
      showLauncher();
      bindLogout();
      renderLauncher(result.data.session);
    }
  });
}

function clearLauncher() {
  document.getElementById('launcher-grid').innerHTML = '';
}
