# Allan Workbench — Portal de Entrada

Ponto único de autenticação e navegação do ecossistema Allan Workbench. Aplicação web estática (HTML/CSS/JS vanilla) com Supabase Auth + Registry.

## Stack

- HTML5, CSS3 Vanilla, JavaScript ES6+
- Supabase Auth (email/senha) via CDN
- Lucide Icons via CDN
- Inter + SF Mono (Google Fonts)
- Sem frameworks, sem bundlers, sem transpiladores

## Dependências CDN

| Recurso | URL |
|---|---|
| Supabase SDK | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` |
| Lucide Icons | `https://unpkg.com/lucide@latest` |
| Inter Font | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700` |

## Setup Local

O projeto é servido como conteúdo estático. Use qualquer servidor HTTP local:

```bash
# Python
python -m http.server 8000

# Node (npx serve)
npx serve .

# VS Code Live Server
# Clique com botão direito no index.html > Open with Live Server
```

Abra `http://localhost:8000` e faça login com suas credenciais Supabase.

## Deploy (GitHub Pages)

1. Faça push do repositório para o GitHub
2. Vá em **Settings > Pages**
3. Em **Source**, selecione **Deploy from a branch**
4. Escolha a branch `main` e pasta `/ (root)`
5. Clique **Save**

O site estará disponível em `https://<seu-usuario>.github.io/portal/`.

**Importante:** O Supabase Auth funciona cross-domain nativamente via localStorage — não requer configuração adicional de CORS ou redirect URLs no Supabase para GitHub Pages, pois o SDK usa cookies de sessão locais.

## Estrutura

```
├── index.html                     # Shell SPA (login + launcher views)
├── css/
│   └── styles.css                 # Tokens DESIGN.md + componentes
├── js/
│   ├── config.js                  # Credenciais Supabase + portal URL
│   ├── supabase.js                # Cliente Supabase + auth helpers
│   ├── app.js                     # Orquestrador: sessão + login
│   └── home.js                    # Launcher: registry query + cards
├── assets/
│   └── js/
│       └── workbench-bridge.js    # Header injetável para ferramentas filhas
├── sql/
│   └── 001_registry.sql           # DDL do Registry (já executado)
└── docs/
    ├── README.md                  # Este arquivo
    ├── PRD.md                     # Requisitos do portal
    ├── ARCHITECTURE.md            # Arquitetura do ecossistema
    ├── DESIGN.md                  # Design tokens e sistema visual
    └── CHANGELOG.md               # Histórico de versões
```

## Fluxo de Autenticação

1. Usuário acessa o portal → verifica sessão via `supabase.auth.getSession()`
2. Se sem sessão → mostra tela de login (email/senha)
3. Login com sucesso → consulta Registry (`applications` + `user_applications`)
4. Dashboard mostra cards agrupados por categoria com ícones Lucide
5. Ao clicar em "Acessar" → redirecionamento nativo (`window.location.href`) sem tokens na URL
6. Ferramenta filha carrega `workbench-bridge.js` → valida sessão → injeta header com logout
