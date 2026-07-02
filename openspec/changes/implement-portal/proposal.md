## Why

O Portal de Entrada é a porta de acesso do ecossistema Allan Workbench. Sem ele, usuários não têm como autenticar, visualizar suas ferramentas ou navegar entre aplicações. O Registry (`setup-database`) já existe como change separado; agora é preciso construir a camada de apresentação que consome esse schema e entrega a experiência de login + launcher dinâmico.

## What Changes

- `index.html` — Página única com view toggling entre login e dashboard (SPA vanilla)
- `css/styles.css` — Estilização completa seguindo tokens do `docs/DESIGN.md` (dark canvas, Inter + SF Mono, hairlines, electric green)
- `js/config.js` — Configuração do Supabase (URL, anon_key, project_id)
- `js/supabase.js` — Inicialização do cliente Supabase, helpers de auth (getSession, signIn, signOut)
- `js/app.js` — Controller principal: verifica sessão ao carregar, alterna entre view de login e dashboard
- `js/home.js` — Lógica do Launcher: query ao Registry, agrupamento por categoria, renderização dinâmica do grid de ferramentas
- `assets/js/workbench-bridge.js` — Script injetável em ferramentas filhas para header comum + validação de auth
- `docs/README.md` — Instruções de setup local e deploy
- `docs/CHANGELOG.md` — Histórico de versões (inicial)

## Capabilities

### New Capabilities
- `auth-login`: Tela de login com formulário email/senha, validação via Supabase Auth, verificação de sessão ativa ao carregar
- `launcher-dashboard`: Grid dinâmico de ferramentas disponíveis, consultando Registry (`applications` + `user_applications`), agrupado por categoria, com redirecionamento nativo ao clicar
- `user-session`: Gerenciamento de sessão — logout (`signOut`), persistência de sessão no navegador, proteção de rota (redireciona para login se não autenticado)
- `app-bridge`: Componente `workbench-bridge.js` que ferramentas filhas carregam para injetar header unificado com navegação, identificação do usuário e botão de logout

### Modified Capabilities
<!-- Nenhuma — primeiro change de aplicação do portal -->

## Impact

- Depende de: change `setup-database` (tabelas do Registry já devem existir no Supabase)
- CDN externo: Supabase SDK (`@supabase/supabase-js@2`), Lucide Icons (`lucide@latest`), Google Fonts (Inter)
- Deploy: GitHub Pages (serve arquivos estáticos diretamente)
- Nenhuma dependência de build/transpiler/bundler
