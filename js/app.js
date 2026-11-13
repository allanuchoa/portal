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

var INVITE_ERRORS = {
  invalid: 'Este link de acesso não é válido.',
  revoked: 'Este acesso foi revogado por quem o enviou.',
  expired: 'Este link de acesso expirou.',
  used: 'Este link já foi usado pelo número máximo de pessoas.'
};

// Abre um link de convite (#convite=TOKEN): cria uma sessão anônima, se preciso, e resgata o convite.
// Devolve { session, message }.
async function enterWithInvite(token, session) {
  var fresh = false;
  if (session) {
    var c = await supabaseClient.rpc('wb_context', { p_url: '' });
    if (c.data && c.data.admin) return { session: session, message: 'Você está logado como dono. Para testar o link, abra em uma janela anônima.' };
  } else {
    var a = await supabaseClient.auth.signInAnonymously();
    if (a.error || !a.data.session) {
      console.error('Anonymous sign-in failed:', a.error);
      return { session: null, message: 'Não foi possível abrir este link de acesso. Peça um novo a quem enviou.' };
    }
    session = a.data.session; fresh = true;
  }
  var r = await supabaseClient.rpc('wb_redeem', { p_token: token });
  if (r.error || !r.data || !r.data.ok) {
    var msg = (r.data && INVITE_ERRORS[r.data.reason]) || 'Não foi possível validar este link de acesso.';
    if (fresh) { await signOut(); return { session: null, message: msg }; }   // não deixa uma sessão anônima sem nada
    return { session: session, message: msg };
  }
  return { session: session, message: 'Acesso temporário liberado.', ok: true };
}

async function initApp() {
  supabaseClient.auth.onAuthStateChange(function (event) {
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

  document.getElementById('btn-logout').addEventListener('click', async function () {
    var r = await signOut();
    if (r && r.error) console.error('Logout error:', r.error);
    clearLauncher();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
    showLogin();
  });

  // Avisos e convite chegam pelo fragmento da URL, que é limpo em seguida (o token não fica no histórico).
  var hash = location.hash;
  var token = (hash.match(/^#convite=([A-Za-z0-9]{16,128})$/) || [])[1];
  var notice = hash === '#sem-acesso' ? 'Você não tem acesso a essa ferramenta.' : hash === '#expirado' ? 'Seu acesso temporário terminou.' : '';
  if (hash) history.replaceState(null, '', location.pathname + location.search);

  var session = await getSession();
  var ok = false;
  if (token) {
    var inv = await enterWithInvite(token, session);
    session = inv.session; notice = inv.message; ok = !!inv.ok;
  }

  if (session) {
    showLauncher();
    await renderLauncher(session);
    if (notice) showToast(notice, ok ? '' : 'coming-soon');
  } else {
    showLogin();
    loginError.textContent = notice;
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

    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';

    if (result.error) {
      loginError.textContent = 'Credenciais invalidas';
      return;
    }

    if (result.data.session) {
      passwordInput.value = '';
      showLauncher();
      renderLauncher(result.data.session);
    }
  });
}
