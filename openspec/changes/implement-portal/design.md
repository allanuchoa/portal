## Context

O Portal de Entrada é uma aplicação web estática (HTML/CSS/JS vanilla) que serve como ponto único de autenticação e navegação do ecossistema Allan Workbench. Ele consome o Registry Supabase (criado no change `setup-database`) para renderizar dinamicamente as ferramentas que o usuário pode acessar. O design visual segue estritamente `docs/DESIGN.md` — dark canvas (`#101010`), electric green (`#00d992`), hairlines, Inter + SF Mono.

**Constraints (AGENTS.md):**
- Zero frameworks, zero bundlers, zero transpilers
- Supabase SDK via CDN (`@supabase/supabase-js@2`)
- Sem Tailwind, Bootstrap ou qualquer framework CSS
- RLS obrigatório (já implementado no `setup-database`)
- `anon_key` apenas no frontend, nunca `service_role_key`

## Goals / Non-Goals

**Goals:**
- Tela de login funcional com Supabase Auth (email/senha)
- Dashboard launcher que consulta o Registry e renderiza grid por categoria
- Redirecionamento nativo (sem tokens na URL) para ferramentas filhas
- Logout com limpeza de sessão e redirect para login
- `workbench-bridge.js` autocontido para ferramentas consumirem
- Documentação (`README.md`, `CHANGELOG.md`)

**Non-Goals:**
- Cadastro de usuários (sign-up) — fora do escopo, usuários são criados via Supabase dashboard
- Recuperação de senha — delegado ao Supabase
- Administração de ferramentas (CRUD de applications) — será feature futura
- Tema claro — DESIGN.md define dark-canvas only
- Animações complexas — design flat com hairlines, sem transições pesadas
- O portal **NÃO** carrega `workbench-bridge.js` em si mesmo (ele apenas publica o arquivo canônico para tools filhas) — ver D2

## Decisions

### D1: SPA com view toggling (não multi-page)
**Escolha:** `index.html` único com duas views (login e launcher) alternadas via JS.
**Alternativa considerada:** `login.html` + `home.html` com redirects. Rejeitada porque fragmenta o CSS/JS compartilhado e força reloads desnecessários.
**Rationale:** Com HTML vanilla, view toggling via `display:none/block` em containers é mais simples e performático que navegação entre páginas. Evita duplicação de `<head>`, CSS e inicialização do Supabase.

```
┌─────────────────────────────────────┐
│           index.html                │
│  ┌──────────────────────────────┐  │
│  │ <div id="view-login">        │  │
│  │   (form login)               │  │
│  │ </div>                       │  │
│  │                              │  │
│  │ <div id="view-launcher">     │  │
│  │   (header + grid)            │  │
│  │ </div>                       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### D2: workbench-bridge.js autocontido e distribuição por cópia
**Escolha:** O bridge importa `config.js` e inicializa seu próprio cliente Supabase, não depende da ferramenta hospedeira. **Modelo de distribuição: COPY** — cada ferramenta filha copia `assets/js/workbench-bridge.js` (e `config.js`) para o seu próprio repositório Git isolado, conforme `ARCHITECTURE.md` (tools vivem em repositórios separados). O path de `config.js` no bridge é relativo à raiz da tool (não ao portal).
**Alternativa considerada:** (a) Bridge usar `window.supabase` da ferramenta hospedeira — rejeitada porque cria acoplamento implícito. (b) Carregar o bridge via URL absoluta do GitHub Pages do portal — rejeitada porque quebra o isolamento de contexto entre repositórios e acopla tools à disponibilidade do portal.
**Rationale:** Cada tool já tem `config.js` com as mesmas credenciais. O bridge fazer `supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)` é redundante mas seguro e desacoplado. O modelo COPY preserva o isolamento pregado no `ARCHITECTURE.md`.

> **Nota importante (portal NÃO carrega o bridge):** O portal (este change) é o launcher e possui seu próprio header nativo renderizado por `js/home.js` (task 4.6). O portal **NÃO** carrega `workbench-bridge.js` em `index.html` — ele apenas publica o arquivo canônico em `assets/js/` para que as tools filhas o copiem. A instrução do `AGENTS.md` §4.3 ("ao criar/editar o arquivo principal de uma ferramenta, carregar o bridge") aplica-se às **ferramentas filhas**, não ao portal. Carregar o bridge no próprio portal injetaria um segundo header por cima do header do launcher.

### D3: Consulta do launcher via Supabase client v2 (não REST)
**Escolha:** Query relacional via SDK supabase-js **v2**, carregado via CDN (`@supabase/supabase-js@2`). O usuário autenticado é obtido com `supabase.auth.getUser()` (v2 — `supabase.auth.user()` foi removido na v2). A query do launcher usa a sintaxe v2 de filtro aninhado com `!inner`:

```js
const { data: { user } } = await supabase.auth.getUser();
const { data, error } = await supabase
  .from('applications')
  .select('id, slug, name, url, icon, category, user_applications!inner(user_id)')
  .eq('is_active', true)
  .eq('user_applications.user_id', user.id);
```

**Alternativa considerada:** REST API manual com `fetch`. Rejeitada — o SDK já lida com auth headers, RLS e tipagem.
**Rationale:** Consistência com o ecossistema; o SDK é carregado de qualquer forma para auth. **Atenção:** o exemplo de código em `docs/ARCHITECTURE.md` §3 está em sintaxe v1 (`supabase.auth.user()`, `.innerJoin(...)`) e não funciona na v2 — usar o snippet acima como referência canônica.

### D4: Agrupamento por categoria no frontend
**Escolha:** Query retorna todas as aplicações do usuário; `home.js` agrupa por `category` no client-side.
**Alternativa considerada:** Duas queries separadas por categoria. Rejeitada — categorias são dinâmicas (vêm do banco).
**Rationale:** O agrupamento é trivial (poucas ferramentas por usuário) e evita N+1 queries.

### D5: CSS organizado por seção
**Escolha:** Arquivo único `styles.css` com seções comentadas: tokens, reset, login, header, launcher, cards, empty-state.
**Alternativa considerada:** CSS Modules ou múltiplos arquivos. Rejeitada por violar a restrição de zero build tools.
**Rationale:** Com CSS vanilla, um arquivo bem organizado com comentários é mais prático que múltiplos `<link>` tags.

## Risks / Trade-offs

- [CDN offline] → Se o CDN do Supabase ou Lucide cair, o portal não carrega. Mitigação: GitHub Pages + CDNs são infraestrutura de alta disponibilidade. Sem fallback prático no modelo sem build.

- [Sem TypeScript] → Erros de tipagem só são capturados em runtime. Mitigação: validações defensivas nos handlers (ex: verificar se `session.user` existe antes de acessar `.email`).

- [View toggling via display] → Ambas as views existem no DOM simultaneamente. Risco de vazamento de estado entre views. Mitigação: limpar campos do formulário ao alternar para login; resetar grid ao fazer logout.

- [Bridge carrega seu próprio Supabase client] → Duas instâncias do SDK na mesma página (tool + bridge). Risco de conflito de localStorage. Mitigação: usar o mesmo `storageKey` configurado em `config.js`.

## Open Questions

- Nenhuma — todos os aspectos foram cobertos nas discussões do explore mode e nos docs de arquitetura.
