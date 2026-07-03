-- ============================================================================
-- 001_registry.sql
-- Allan Workbench — Portal Registry Schema
-- Versão: 1.0.0
--
-- PROPÓSITO:
--   Cria as tabelas do Registry (profiles, applications, user_applications),
--   triggers de auto-criação de perfil e auto-update de timestamps, e políticas
--   de Row Level Security que governam o acesso a ferramentas no ecossistema.
--
-- PREMISSA:
--   - Projeto Supabase já existente com Auth habilitado (tabela auth.users
--     disponível no schema auth)
--   - Executar este script no Supabase SQL Editor (não via cliente anon_key)
--   - O SQL Editor opera como service_role (bypass de RLS)
--
-- INSTRUÇÕES:
--   1. Abra o Supabase Dashboard > SQL Editor
--   2. Cole o conteúdo completo deste arquivo
--   3. Execute (Ctrl+Enter ou botão Run)
--   4. Verifique: SELECT tablename, rowsecurity FROM pg_tables
--      WHERE schemaname = 'public';
--
-- ROLLBACK (se necessário):
--   DROP TABLE IF EXISTS public.user_applications CASCADE;
--   DROP TABLE IF EXISTS public.applications CASCADE;
--   DROP TABLE IF EXISTS public.profiles CASCADE;
--   DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
--   DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
--   DROP FUNCTION IF EXISTS public.check_profile_update() CASCADE;
-- ============================================================================

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id),
    name       TEXT,
    role       TEXT NOT NULL DEFAULT 'user'
               CHECK (role IN ('user', 'admin')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles       IS 'Perfis de usuário vinculados a auth.users';
COMMENT ON COLUMN public.profiles.id    IS 'UUID do usuário (FK → auth.users.id)';
COMMENT ON COLUMN public.profiles.name  IS 'Nome de exibição do usuário';
COMMENT ON COLUMN public.profiles.role  IS 'Papel do usuário: user ou admin';

-- ============================================================================
-- 2. AUTO-CRIAÇÃO DE PERFIL (TRIGGER ON auth.users)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. APPLICATIONS (REGISTRY DE FERRAMENTAS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    url        TEXT NOT NULL,
    icon       TEXT,
    category   TEXT,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.applications          IS 'Catálogo de ferramentas do ecossistema';
COMMENT ON COLUMN public.applications.slug      IS 'Identificador único da ferramenta (ex: nac)';
COMMENT ON COLUMN public.applications.url       IS 'URL de deploy da ferramenta';
COMMENT ON COLUMN public.applications.icon      IS 'Nome do ícone Lucide (ex: clipboard-list)';
COMMENT ON COLUMN public.applications.category  IS 'Categoria de agrupamento no launcher';
COMMENT ON COLUMN public.applications.is_active IS 'Se false, ferramenta oculta mesmo com vínculo ativo';

-- ============================================================================
-- 4. USER_APPLICATIONS (JUNÇÃO N:N DE PERMISSÕES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_applications (
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, application_id)
);

COMMENT ON TABLE  public.user_applications               IS 'Mapeamento de quais ferramentas cada usuário pode acessar';
COMMENT ON COLUMN public.user_applications.granted_at     IS 'Timestamp de quando o acesso foi concedido';

-- ============================================================================
-- 5. AUTO-UPDATE DE TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;

CREATE TRIGGER before_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY — ATIVAÇÃO
-- ============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS — POLÍTICAS DE LEITURA (SELECT)
-- ============================================================================

-- 7.1 Profiles: usuário lê apenas o próprio perfil
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
CREATE POLICY "Read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 7.2 Applications: apenas ferramentas com vínculo ativo em user_applications
DROP POLICY IF EXISTS "Read granted applications" ON public.applications;
CREATE POLICY "Read granted applications"
    ON public.applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM user_applications ua
            WHERE ua.user_id = auth.uid()
              AND ua.application_id = applications.id
              AND ua.application_id IN (
                  SELECT id FROM applications WHERE is_active = true
              )
        )
    );

-- 7.3 User Applications: usuário vê apenas seus próprios vínculos
DROP POLICY IF EXISTS "Read own grants" ON public.user_applications;
CREATE POLICY "Read own grants"
    ON public.user_applications
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 8. RLS — POLÍTICAS DE ESCRITA (INSERT / UPDATE / DELETE)
--    Deny-by-default para anon/authenticated: sem políticas = negado.
--    Abaixo documentamos a intenção com políticas USING/WITH CHECK (false)
--    para tornar a negação explícita e visível no dashboard do Supabase.
-- ============================================================================

-- 8.1 Applications: sem INSERT via anon_key
DROP POLICY IF EXISTS "Deny insert on applications" ON public.applications;
CREATE POLICY "Deny insert on applications"
    ON public.applications
    FOR INSERT
    WITH CHECK (false);

-- 8.2 Applications: sem UPDATE via anon_key
DROP POLICY IF EXISTS "Deny update on applications" ON public.applications;
CREATE POLICY "Deny update on applications"
    ON public.applications
    FOR UPDATE
    USING (false)
    WITH CHECK (false);

-- 8.3 Applications: sem DELETE via anon_key
DROP POLICY IF EXISTS "Deny delete on applications" ON public.applications;
CREATE POLICY "Deny delete on applications"
    ON public.applications
    FOR DELETE
    USING (false);

-- 8.4 User applications: sem INSERT via anon_key (impede auto-concessão)
DROP POLICY IF EXISTS "Deny insert on user_applications" ON public.user_applications;
CREATE POLICY "Deny insert on user_applications"
    ON public.user_applications
    FOR INSERT
    WITH CHECK (false);

-- 8.5 User applications: sem UPDATE via anon_key
DROP POLICY IF EXISTS "Deny update on user_applications" ON public.user_applications;
CREATE POLICY "Deny update on user_applications"
    ON public.user_applications
    FOR UPDATE
    USING (false)
    WITH CHECK (false);

-- 8.6 User applications: sem DELETE via anon_key
DROP POLICY IF EXISTS "Deny delete on user_applications" ON public.user_applications;
CREATE POLICY "Deny delete on user_applications"
    ON public.user_applications
    FOR DELETE
    USING (false);

-- 8.7 Profiles: usuário pode atualizar a própria linha (colunas restritas por trigger abaixo)
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 9. GUARDA DE COLUNAS — IMPEDE ELEVAÇÃO DE PRIVILÉGIO
--    Trigger que bloqueia alteração de role e id no UPDATE via anon_key.
--    service_role (SQL Editor) bypassa a verificação.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.id <> NEW.id THEN
        RAISE EXCEPTION 'Não é permitido alterar o id do perfil';
    END IF;

    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Não é permitido alterar o próprio role';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_profile_update_check ON public.profiles;

CREATE TRIGGER before_profile_update_check
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_update();
