## 1. Profiles

- [x] 1.1 Criar tabela `public.profiles` com FK para `auth.users` e constraints
- [x] 1.2 Criar função `handle_new_user()` e trigger `on_auth_user_created` para auto-criação de perfil

## 2. Applications

- [x] 2.1 Criar tabela `public.applications` com slug UNIQUE NOT NULL e is_active default true

## 3. User Applications

- [x] 3.1 Criar tabela `public.user_applications` com PK composta e FKs com ON DELETE CASCADE

## 4. Row Level Security

- [x] 4.1 Ativar RLS nas três tabelas (`profiles`, `applications`, `user_applications`)
- [x] 4.2 Criar política RLS em `profiles` — usuário lê apenas o próprio perfil
- [x] 4.3 Criar política RLS em `applications` — apenas aplicações vinculadas e ativas (EXISTS join por `application_id` + `is_active = true`, **sem** filtro de slug)
- [x] 4.4 Criar política RLS em `user_applications` — usuário vê apenas seus próprios vínculos
- [x] 4.5 Criar políticas RLS `WITH WRITE` deny-by-default em `applications` (sem INSERT/UPDATE/DELETE via `anon_key`) — apenas `service_role` bypass escreve
- [x] 4.6 Criar políticas RLS `WITH WRITE` deny-by-default em `user_applications` (sem INSERT/UPDATE/DELETE via `anon_key`) — impede auto-concessão de acesso a ferramentas
- [x] 4.7 Criar política RLS `WITH UPDATE` em `profiles` permitindo ao usuário atualizar apenas a coluna `name` do próprio registro (bloqueia `role` para evitar escalação de privilégio)

## 5. Triggers Complementares

- [x] 5.1 Criar função `handle_updated_at()` e trigger `BEFORE UPDATE` em `profiles` para auto-atualizar `updated_at`

## 6. Script Final

- [x] 6.1 Consolidar todas as DDLs em `sql/001_registry.sql` com cabeçalho documentando propósito, instruções de execução e **premissa**: exige projeto Supabase já existente com `auth.users` (Auth habilitado)
