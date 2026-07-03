## Why

O Portal de Entrada do Allan Workbench é um Launcher dinâmico que consome registros de ferramentas e permissões do Supabase. Antes de implementar qualquer lógica de aplicação, o schema do banco de dados precisa existir — as tabelas `profiles`, `applications` e `user_applications` são a espinha dorsal do ecossistema, compartilhadas entre o portal e todas as ferramentas filhas via RLS.

## What Changes

- Criação da tabela `public.profiles` vinculada a `auth.users` via trigger automático
- Criação da tabela `public.applications` (Registry de ferramentas)
- Criação da tabela `public.user_applications` (junção n:n de permissões)
- Ativação de Row Level Security em todas as tabelas: políticas de **leitura** baseadas no vínculo `user_applications` (EXISTS); escrita deny-by-default em `applications`/`user_applications` (apenas `service_role`), e self-update restrito a `profiles.name`
- Script SQL versionado em `sql/001_registry.sql` pronto para execução no Supabase SQL Editor

## Capabilities

### New Capabilities
- `registry-schema`: Estrutura relacional do Registry — tabelas `profiles`, `applications`, `user_applications` com constraints (incl. `role` CHECK e `url` NOT NULL), índices e triggers (auto-criação de perfil + auto-update de `updated_at`)
- `row-level-security`: Políticas RLS de leitura (EXISTS sobre `user_applications`) e de escrita (deny-by-default para `anon`/`authenticated` em `applications`/`user_applications`; self-update de `profiles.name`); perfil auto-criado no primeiro login

### Modified Capabilities
<!-- Nenhuma — primeiro change do projeto -->

## Impact

- Supabase project: execução do script SQL no SQL Editor
- `docs/ARCHITECTURE.md`: schema já documentado, sem alterações necessárias
- Nenhum código de aplicação afetado (será consumido pelo change `implement-portal`)
