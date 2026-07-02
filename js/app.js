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
  const session = await getSession();

  if (session) {
    showLauncher();
    renderLauncher(session);
  } else {
    showLogin();
  }

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      loginError.textContent = 'Preencha todos os campos';
      return;
    }

    loginError.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const { error } = await signIn(email, password);

    if (error) {
      loginError.textContent = 'Credenciais inválidas';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      return;
    }

    const newSession = await getSession();
    if (newSession) {
      showLauncher();
      renderLauncher(newSession);
    }
  });
}
