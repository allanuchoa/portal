const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'sb-' + CONFIG.SUPABASE_PROJECT_ID + '-auth-token'
  }
});

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Session check failed:', error);
    return null;
  }
  return data.session;
}

async function signIn(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function signOut() {
  return await supabaseClient.auth.signOut();
}
