## Context

O ecossistema Allan Workbench utiliza Supabase PostgreSQL como backend centralizado. O Registry — composto pelas tabelas `profiles`, `applications` e `user_applications` — é o catálogo que governa quais ferramentas cada usuário pode acessar. O schema está documentado em `docs/ARCHITECTURE.md` (seção 3) e `docs/PRD.md` (seção 5). Este change implementa a criação física dessas tabelas via script SQL versionado.

**Constraints (from AGENTS.md):**
- Row Level Security obrigatório em todas as tabelas
- Prefixação de tabelas não se aplica ao portal (só às ferramentas filhas)
- Chave anônima pública (`anon_key`) para frontend, nunca `service_role_key`

## Goals / Non-Goals

**Goals:**
- Criar as 3 tabelas do Registry com tipos, constraints e índices corretos
- Implementar trigger de auto-criação de perfil no primeiro login (`auth.users` → `public.profiles`)
- Ativar RLS com políticas que validam acesso via `user_applications`
- Gerar um script SQL único e versionado (`sql/001_registry.sql`)

**Non-Goals:**
- Não popula dados de exemplo (aplicações e permissões são inseridas separadamente)
- Não implementa lógica de aplicação (pertence ao change `implement-portal`)
- Não configura autenticação Supabase (assume-se projeto já existente)

## Decisions

### D1: Trigger de auto-criação de perfil
**Escolha:** Função `handle_new_user()` disparada por `AFTER INSERT ON auth.users` que insere registro em `public.profiles`.
**Alternativa considerada:** Criar perfil via lógica de aplicação após login. Rejeitada porque exigiria que todo ponto de entrada (portal, bridge, tools) tivesse essa lógica duplicada.
**Rationale:** Centraliza a criação de perfil no banco — qualquer novo usuário ganha perfil automaticamente, independente de qual tool ele acessa primeiro.

### D2: Política RLS — EXISTS pattern (dois formatos distintos)
**Escolha:** Políticas de **leitura** usam subquery EXISTS sobre `user_applications`. Há dois formatos distintos que NÃO devem ser confundidos:

1. **Tabelas do próprio Registry (`applications`):** a política faz `EXISTS (SELECT 1 FROM user_applications ua WHERE ua.user_id = auth.uid() AND ua.application_id = applications.id AND ua.application_id IN (SELECT id FROM applications WHERE is_active = true))` — join por `application_id` + `is_active = true`, **sem** filtro de slug.
2. **Tabelas de ferramentas filhas (ex.: `nac_items` em repositórios isolados):** a política faz `EXISTS (SELECT 1 FROM user_applications ua JOIN applications app ON app.id = ua.application_id WHERE ua.user_id = auth.uid() AND app.slug = 'slug_da_ferramenta' AND app.is_active = true AND ...)` — aqui o filtro por `app.slug = '...'` é necessário porque a tabela filha não tem FK direta para validar o vínculo.

**Alternativa considerada:** Políticas com `auth.uid() = user_id` simples. Rejeitada porque não valida se a aplicação está ativa nem se o usuário realmente tem acesso àquela ferramenta específica.
**Rationale:** Padrão definido no `docs/AGENTS.md` seção 5. Copiar o formato (2) com filtro de slug para a tabela `applications` do Registry produz uma política incorreta (filtra a um único slug hardcoded); copiar o formato (1) para uma tabela filha não valida o vínculo correto. Por isso a distinção é explícita.

### D5: Política RLS de escrita — deny by default + profile self-update
**Escolha:** `applications` e `user_applications` não recebem políticas `WITH INSERT/UPDATE/DELETE` para o papel `authenticated`/`anon` — apenas `service_role` (que bypassa RLS) pode populá-las no bootstrap/manutenção. Em `profiles`, uma política `WITH UPDATE` permite ao usuário atualizar apenas `name` na sua própria linha; `role` fica sem política de escrita, logo imodificável via `anon_key`.
**Alternativa considerada:** Permitir que usuários façam INSERT em `user_applications` para si mesmos. Rejeitada porque abre auto-concessão de acesso a qualquer ferramenta (falha de segurança).
**Rationale:** Garante que o catálogo e as permissões só sejam alterados por operação server-side com `service_role`, alinhado ao `AGENTS.md` (frontend usa apenas `anon_key`).

### D6: Bootstrap e promoção de admin
**Escolha:** Procedimento operacional manual (fora do script versionado, executado uma única vez via Supabase SQL Editor com `service_role`):
1. Após aplicar `sql/001_registry.sql`, registrar o primeiro `application` (slug, name, url, icon, category, is_active=true) via INSERT com `service_role`.
2. Promover o primeiro admin: `UPDATE profiles SET role = 'admin' WHERE id = '<uuid-do-primeiro-user>';` executado no SQL Editor (bypass de RLS).
3. Conceder acesso: `INSERT INTO user_applications (user_id, application_id) VALUES (...)` via `service_role`.

**Alternativa considerada:** Seed automático no script `001_registry.sql`. Rejeitada porque dados de exemplo são Non-Goal e o `auth.users` do projeto alvo é desconhecido até o deploy.
**Rationale:** O trigger `handle_new_user()` cria todo perfil como `role='user'`; sem este procedimento não há como tornar o sistema utilizável. Documentado aqui para que o change downstream `implement-portal` saiba que o estado pós-Apply é "vazio mas funcional" (empty state do launcher cobre a ausência de aplicações).

### D3: Script SQL único
**Escolha:** Um arquivo `sql/001_registry.sql` com todas as DDLs.
**Alternativa considerada:** Múltiplos arquivos (`001_profiles.sql`, `002_applications.sql`, etc.). Rejeitada por over-engineering para um schema de 3 tabelas.
**Rationale:** Simplicidade — execução de um único script no Supabase SQL Editor.

### D4: Tipos de dados
**Escolha:** UUID para PKs (compatível com `auth.users`), TEXT para campos flexíveis, BOOLEAN para flags, TIMESTAMPTZ com default `now()`.
**Rationale:** Alinhado com defaults do Supabase e boas práticas PostgreSQL.

## Risks / Trade-offs

- [Cascata na deleção de usuário] → O trigger de perfil não cobre deleção. Se um usuário for removido de `auth.users`, o registro em `profiles` fica órfão. Mitigação: adicionar `ON DELETE CASCADE` na FK `profiles.id → auth.users.id` (se o Supabase permitir). Fora do escopo deste change, mas documentado.

- [Política RLS muito permissiva no início] → Como não há dados em `user_applications` ainda, as políticas bloqueariam tudo. Isso é intencional — acesso é liberado ao popular a tabela `user_applications` via `service_role` (ver D6 — Bootstrap e promoção de admin).

- [Execução manual do SQL] → O script precisa ser executado manualmente no Supabase SQL Editor. Automatizar isso exigiria CI/CD com `service_role_key`, o que viola AGENTS.md seção 4.4.

- [Sem políticas de escrita para `anon`] → `applications` e `user_applications` são deny-by-default para `anon`/`authenticated` (D5). Isso é desejável (impede auto-concessão), mas significa que todo cadastro de ferramenta/permissão depende do SQL Editor com `service_role`.

## Migration Plan

1. Abrir Supabase SQL Editor no projeto alvo
2. Copiar e executar `sql/001_registry.sql`
3. Verificar criação das tabelas com `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`
4. Verificar RLS com `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
5. Rollback: `DROP TABLE IF EXISTS public.user_applications, public.applications, public.profiles CASCADE`

## Open Questions

- Nenhuma — schema definido em ARCHITECTURE.md e PRD.md, sem ambiguidades.
