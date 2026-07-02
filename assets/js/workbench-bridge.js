(function () {
  'use strict';

  if (typeof CONFIG === 'undefined') {
    console.error('workbench-bridge: CONFIG not found. Load config.js before this script.');
    return;
  }

  var client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storageKey: 'sb-' + CONFIG.SUPABASE_PROJECT_ID + '-auth-token'
    }
  });

  client.auth.getSession().then(function (result) {
    if (result.error || !result.data.session) {
      window.location.href = CONFIG.PORTAL_URL;
      return;
    }

    var session = result.data.session;
    var email = session.user.email;
    var portalUrl = CONFIG.PORTAL_URL;

    var header = document.createElement('header');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;' +
      'background-color:#101010;border-bottom:1px solid #3d3a39;' +
      'padding:12px 32px;font-family:Inter,system-ui,sans-serif;';

    var logo = document.createElement('a');
    logo.href = portalUrl;
    logo.textContent = 'Allan Workbench';
    logo.style.cssText =
      'font-size:18px;font-weight:600;line-height:28px;letter-spacing:0.45px;' +
      'color:#00d992;text-decoration:none;';

    var userInfo = document.createElement('div');
    userInfo.style.cssText = 'display:flex;align-items:center;gap:16px;';

    var emailSpan = document.createElement('span');
    emailSpan.textContent = email;
    emailSpan.style.cssText = 'font-size:14px;color:#bdbdbd;';

    var logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Sair';
    logoutBtn.style.cssText =
      'background-color:#101010;color:#f2f2f2;font-family:Inter,system-ui,sans-serif;' +
      'font-size:16px;font-weight:600;line-height:24px;border:1px solid #3d3a39;' +
      'border-radius:6px;padding:12px 16px;cursor:pointer;';

    logoutBtn.addEventListener('click', function () {
      client.auth.signOut().then(function () {
        window.location.href = portalUrl;
      });
    });

    userInfo.appendChild(emailSpan);
    userInfo.appendChild(logoutBtn);
    header.appendChild(logo);
    header.appendChild(userInfo);

    document.body.insertBefore(header, document.body.firstChild);
  });
})();
