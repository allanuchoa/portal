## 1. Infraestrutura

- [x] 1.1 Criar `js/config.js` com SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PROJECT_ID, PORTAL_URL (valores reais do projeto Supabase alvo; o `anon_key` é seguro de expor no frontend estático e deve ser commitado — não há env vars no GitHub Pages)
- [x] 1.2 Criar `js/supabase.js` com inicialização do cliente (`createClient` com `persistSession: true`, `storageKey: 'sb-<SUPABASE_PROJECT_ID>-auth-token'`) e helpers: getSession(), signIn(email, password), signOut()
- [x] 1.3 Criar `css/styles.css` com reset, tokens CSS do DESIGN.md, e estilos dos componentes

## 2. Estrutura HTML

- [x] 2.1 Criar `index.html` com shell SPA: container `#view-login` e `#view-launcher`, CDNs (Supabase, Lucide, Google Fonts), scripts em ordem

## 3. Autenticação e Login

- [x] 3.1 Implementar em `js/app.js` o check de sessão ao carregar (getSession → mostra login ou launcher)
- [x] 3.2 Implementar formulário de login em `#view-login` com validação de campos vazios
- [x] 3.3 Implementar submit do login (signInWithPassword) com estados de loading, erro e sucesso
- [x] 3.4 Implementar mensagem de erro estilizada abaixo do formulário em caso de falha

## 4. Launcher Dashboard

- [x] 4.1 Criar `js/home.js` com função de query ao Registry (applications + user_applications, filtrando is_active = true)
- [x] 4.2 Implementar agrupamento de resultados por `category`
- [x] 4.3 Implementar renderização dinâmica do grid de cards por categoria (ícone Lucide, nome, botão "Acessar") com media queries responsivas (3 colunas ≥1024px, 2 colunas 768–1023px, 1 coluna <768px) e chamada a `lucide.createIcons()` após injeção dos cards no DOM
- [x] 4.4 Implementar redirecionamento nativo ao clicar em "Acessar" (window.location.href sem tokens na URL)
- [x] 4.5 Implementar estado vazio "Em desenvolvimento" para usuários sem aplicações concedidas
- [x] 4.6 Implementar header do launcher com email do usuário e botão "Sair"

## 5. User Session

- [x] 5.1 Conectar o clique do botão "Sair" a `supabase.auth.signOut()` e, ao concluir, alternar para `#view-login` (limpar grid e campos)
- [x] 5.2 Tratar erro de `signOut()`: logar no console e ainda assim redirecionar para a view de login
- [x] 5.3 Garantir persistência de sessão: cliente Supabase configurado com `persistSession: true` (task 1.2) de forma que `getSession()` retorne a sessão após reload sem re-login

## 6. App Bridge

- [x] 6.1 Criar `assets/js/workbench-bridge.js` com inicialização autônoma do Supabase e check de sessão
- [x] 6.2 Implementar injeção do header unificado no DOM da ferramenta (logo, email, sair)
- [x] 6.3 Implementar logout via bridge (signOut + redirect para portal)

## 7. Documentação

- [x] 7.1 Criar `docs/README.md` com instruções de setup local (Live Server ou python -m http.server), dependências CDN e deploy no GitHub Pages
- [x] 7.2 Criar `docs/CHANGELOG.md` com entrada inicial da versão
