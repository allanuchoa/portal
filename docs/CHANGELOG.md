# Changelog — Portal de Entrada

## [2.0.0] - 2026-11-12

### Adicionado
- Acesso temporário por link: convites com validade, limite de usos e escolha de ferramentas; sessão anônima do Supabase resgata o convite (`wb_redeem`) — Agente de IA (Claude Fable 5.2)
- Tela "Acessos" (admin): criar, estender, revogar, duplicar e excluir convites — Agente de IA (Claude Fable 5.2)
- Tela "Catálogo" (admin): cadastrar e editar ferramentas sem SQL — Agente de IA (Claude Fable 5.2)
- Home: fixadas, usadas por último, seções por categoria recolhíveis, ordenação, visão em lista, descrição nos cards, selo "Novo", busca por descrição e palavras-chave, navegação por setas — Agente de IA (Claude Fable 5.2)
- Preferências da home salvas em `user_prefs` (acompanham o usuário entre computadores) — Agente de IA (Claude Fable 5.2)
- Bridge: trocador rápido de ferramenta com Ctrl+K e prazo do convidado no cabeçalho — Agente de IA (Claude Fable 5.2)
- Migração `sql/002_access_and_home.sql` — Agente de IA (Claude Fable 5.2)

### Alterado
- Bridge passa a checar no banco (`wb_context`) se o usuário tem permissão para a ferramenta aberta; antes bastava ter sessão — Agente de IA (Claude Fable 5.2)
- Cards viraram links de verdade (foco por teclado, abrir em nova aba) — Agente de IA (Claude Fable 5.2)
- Categorias em português; card de teste e "Portal de Entrada" ocultos — Agente de IA (Claude Fable 5.2)

## [1.0.0] - 2026-07-02

### Adicionado
- Tela de login com Supabase Auth (email/senha) — Agente de IA (DeepSeek-v4)
- Dashboard launcher com grid de cards agrupados por categoria — Agente de IA (DeepSeek-v4)
- Consulta dinâmica ao Registry Supabase (applications + user_applications) — Agente de IA (DeepSeek-v4)
- Ícones Lucide nos cards de ferramentas — Agente de IA (DeepSeek-v4)
- Estado vazio "Em desenvolvimento" para usuários sem aplicações — Agente de IA (DeepSeek-v4)
- Header do launcher com email do usuário e botão Sair — Agente de IA (DeepSeek-v4)
- Logout com limpeza de sessão — Agente de IA (DeepSeek-v4)
- App Bridge (`workbench-bridge.js`) para injeção de header em ferramentas filhas — Agente de IA (DeepSeek-v4)
- Schema do Registry (`sql/001_registry.sql`): profiles, applications, user_applications, RLS, triggers — Agente de IA (DeepSeek-v4)
- Deploy via GitHub Pages — Agente de IA (DeepSeek-v4)
- Design visual seguindo DESIGN.md (dark canvas, electric green, hairlines, Inter + SF Mono) — Agente de IA (DeepSeek-v4)
