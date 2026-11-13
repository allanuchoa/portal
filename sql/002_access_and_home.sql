-- ============================================================================
-- 002_access_and_home.sql
-- Allan Workbench - acesso temporário por convite, preferências da home e
-- catálogo editável. Idempotente: pode reexecutar.
--
-- CONTRATO RLS DO REGISTRY (inalterado)
--   Nenhuma policy de `applications` ou `user_applications` é criada ou mudada.
--   Tudo que precisa passar por cima da RLS vive em funções SECURITY DEFINER
--   com search_path vazio e checagem explícita de quem chama.
--
-- COMO O ACESSO TEMPORÁRIO FUNCIONA
--   Um convite resgatado vira linhas em `user_applications` com `expires_at`.
--   As policies existentes (home e tabelas das ferramentas) passam a valer para
--   o convidado sem mudança. `wb_context` apaga as linhas vencidas de quem chama
--   a cada carregamento de página; revogar apaga na hora.
-- ============================================================================

BEGIN;

-- ---------- catálogo: texto para o card e para a busca ----------
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS keywords    TEXT;

-- ---------- convites ----------
CREATE TABLE IF NOT EXISTS public.access_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   TEXT NOT NULL UNIQUE,              -- sha256 do token; o token em si não é guardado
  label        TEXT NOT NULL DEFAULT '',
  app_ids      UUID[],                            -- NULL = todas as ativas no momento do resgate
  expires_at   TIMESTAMPTZ NOT NULL,
  max_uses     INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses         INT NOT NULL DEFAULT 0,
  revoked_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  invite_id    UUID NOT NULL REFERENCES public.access_invites(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (invite_id, user_id)
);

-- RLS ligada e sem policy: só as funções abaixo leem e escrevem.
ALTER TABLE public.access_invites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_applications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,   -- NULL = permanente
  ADD COLUMN IF NOT EXISTS invite_id  UUID REFERENCES public.access_invites(id) ON DELETE CASCADE;

-- ---------- preferências da home (fixadas, uso, visão) ----------
CREATE TABLE IF NOT EXISTS public.user_prefs (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(data::text) < 20000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own prefs" ON public.user_prefs;
CREATE POLICY "Read own prefs" ON public.user_prefs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Insert own prefs" ON public.user_prefs;
CREATE POLICY "Insert own prefs" ON public.user_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Update own prefs" ON public.user_prefs;
CREATE POLICY "Update own prefs" ON public.user_prefs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNÇÕES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wb_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Contexto de quem está logado: pode abrir esta URL? é convidado? quais ferramentas tem?
-- Chamada pelo portal e pelo bridge em todo carregamento de página.
CREATE OR REPLACE FUNCTION public.wb_context(p_url TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_admin   BOOLEAN;
  v_app_id  UUID;
  v_slug    TEXT;
  v_allowed BOOLEAN;
  v_exp     TIMESTAMPTZ;
  v_apps    JSONB;
  v_until   TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  DELETE FROM public.user_applications WHERE user_id = v_uid AND expires_at IS NOT NULL AND expires_at <= now();
  UPDATE public.invite_redemptions SET last_seen_at = now() WHERE user_id = v_uid;
  v_admin := public.wb_is_admin();

  SELECT a.id, a.slug INTO v_app_id, v_slug
  FROM public.applications a
  WHERE a.is_active AND left(lower(coalesce(p_url, '')), length(a.url)) = lower(a.url)
  ORDER BY length(a.url) DESC LIMIT 1;

  IF v_app_id IS NOT NULL THEN
    SELECT true, ua.expires_at INTO v_allowed, v_exp
    FROM public.user_applications ua WHERE ua.user_id = v_uid AND ua.application_id = v_app_id;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'slug', a.slug, 'name', a.name, 'url', a.url, 'icon', a.icon, 'category', a.category,
           'status', a.status, 'description', a.description, 'keywords', a.keywords,
           'created_at', a.created_at, 'expires_at', ua.expires_at) ORDER BY a.name), '[]'::jsonb),
         max(ua.expires_at)
  INTO v_apps, v_until
  FROM public.user_applications ua JOIN public.applications a ON a.id = ua.application_id
  WHERE ua.user_id = v_uid AND a.is_active;

  RETURN jsonb_build_object(
    'allowed', coalesce(v_allowed, false) OR v_admin,   -- o admin nunca fica trancado para fora
    'admin', v_admin,
    'guest', coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false),
    'expires_at', v_exp,
    'guest_until', v_until,
    'app', to_jsonb(v_slug),
    'apps', v_apps);
END;
$$;

-- Resgata um convite para o usuário logado (normalmente uma sessão anônima).
CREATE OR REPLACE FUNCTION public.wb_redeem(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_inv  public.access_invites%ROWTYPE;
  v_seen BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth');
  END IF;

  SELECT * INTO v_inv FROM public.access_invites
  WHERE token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
  FOR UPDATE;

  IF v_inv.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid'); END IF;
  IF v_inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'revoked'); END IF;
  IF v_inv.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'expired'); END IF;

  SELECT EXISTS (SELECT 1 FROM public.invite_redemptions WHERE invite_id = v_inv.id AND user_id = v_uid) INTO v_seen;
  IF NOT v_seen THEN
    IF v_inv.uses >= v_inv.max_uses THEN RETURN jsonb_build_object('ok', false, 'reason', 'used'); END IF;
    INSERT INTO public.profiles (id) VALUES (v_uid) ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.invite_redemptions (invite_id, user_id, last_seen_at) VALUES (v_inv.id, v_uid, now());
    UPDATE public.access_invites SET uses = uses + 1, last_used_at = now() WHERE id = v_inv.id;
  END IF;

  -- nunca rebaixa uma permissão permanente nem encurta uma temporária mais longa
  INSERT INTO public.user_applications (user_id, application_id, expires_at, invite_id)
  SELECT v_uid, a.id, v_inv.expires_at, v_inv.id
  FROM public.applications a
  WHERE a.is_active AND a.status <> 'coming_soon' AND (v_inv.app_ids IS NULL OR a.id = ANY (v_inv.app_ids))
  ON CONFLICT (user_id, application_id) DO UPDATE
    SET expires_at = EXCLUDED.expires_at, invite_id = EXCLUDED.invite_id
    WHERE public.user_applications.expires_at IS NOT NULL
      AND public.user_applications.expires_at < EXCLUDED.expires_at;

  RETURN jsonb_build_object('ok', true, 'expires_at', v_inv.expires_at);
END;
$$;

-- ---------- admin: convites ----------
CREATE OR REPLACE FUNCTION public.wb_invite_create(p_label TEXT, p_app_ids UUID[], p_expires_at TIMESTAMPTZ, p_max_uses INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_token TEXT := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id    UUID;
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'validade fora do intervalo (até 90 dias)' USING ERRCODE = '22023';
  END IF;
  IF p_app_ids IS NOT NULL AND cardinality(p_app_ids) = 0 THEN
    RAISE EXCEPTION 'escolha ao menos uma ferramenta' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.access_invites (token_hash, label, app_ids, expires_at, max_uses, created_by)
  VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), left(coalesce(p_label, ''), 120), p_app_ids, p_expires_at,
          least(greatest(coalesce(p_max_uses, 1), 1), 100), auth.uid())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'token', v_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.wb_invite_list()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'label', i.label, 'app_ids', i.app_ids, 'expires_at', i.expires_at, 'max_uses', i.max_uses, 'uses', i.uses,
      'revoked_at', i.revoked_at, 'created_at', i.created_at,
      'last_seen_at', (SELECT max(r.last_seen_at) FROM public.invite_redemptions r WHERE r.invite_id = i.id),
      'apps', (SELECT coalesce(jsonb_agg(a.name ORDER BY a.name), '[]'::jsonb) FROM public.applications a WHERE a.id = ANY (i.app_ids))
    ) ORDER BY i.created_at DESC), '[]'::jsonb)
    FROM public.access_invites i);
END;
$$;

CREATE OR REPLACE FUNCTION public.wb_invite_revoke(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE public.access_invites SET revoked_at = now() WHERE id = p_id AND revoked_at IS NULL;
  DELETE FROM public.user_applications WHERE invite_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wb_invite_extend(p_id UUID, p_expires_at TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'validade fora do intervalo (até 90 dias)' USING ERRCODE = '22023';
  END IF;
  UPDATE public.access_invites SET expires_at = p_expires_at WHERE id = p_id AND revoked_at IS NULL;
  UPDATE public.user_applications SET expires_at = p_expires_at WHERE invite_id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wb_invite_delete(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.access_invites WHERE id = p_id;   -- cascata apaga permissões e resgates
END;
$$;

-- ---------- admin: catálogo ----------
CREATE OR REPLACE FUNCTION public.wb_app_list()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.name), '[]'::jsonb) FROM public.applications a);
END;
$$;

-- p: {id?, slug, name, url, icon, category, description, keywords, status, is_active}
CREATE OR REPLACE FUNCTION public.wb_app_save(p JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id UUID := nullif(p ->> 'id', '')::uuid;
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF coalesce(p ->> 'slug', '') !~ '^[a-z0-9][a-z0-9-]{1,48}$' THEN RAISE EXCEPTION 'slug inválido (minúsculas, números e hífen)' USING ERRCODE = '22023'; END IF;
  IF coalesce(trim(p ->> 'name'), '') = '' THEN RAISE EXCEPTION 'nome obrigatório' USING ERRCODE = '22023'; END IF;
  IF coalesce(p ->> 'url', '') !~ '^https://' THEN RAISE EXCEPTION 'a URL precisa começar com https://' USING ERRCODE = '22023'; END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.applications (slug, name, url, icon, category, description, keywords, status, is_active)
    VALUES (p ->> 'slug', trim(p ->> 'name'), p ->> 'url', nullif(p ->> 'icon', ''), nullif(p ->> 'category', ''),
            nullif(p ->> 'description', ''), nullif(p ->> 'keywords', ''), coalesce(nullif(p ->> 'status', ''), 'active'),
            coalesce((p ->> 'is_active')::boolean, true))
    RETURNING id INTO v_id;
    -- quem cadastra já recebe acesso permanente
    INSERT INTO public.user_applications (user_id, application_id) VALUES (auth.uid(), v_id) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.applications SET
      slug = p ->> 'slug', name = trim(p ->> 'name'), url = p ->> 'url', icon = nullif(p ->> 'icon', ''),
      category = nullif(p ->> 'category', ''), description = nullif(p ->> 'description', ''), keywords = nullif(p ->> 'keywords', ''),
      status = coalesce(nullif(p ->> 'status', ''), 'active'), is_active = coalesce((p ->> 'is_active')::boolean, true)
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wb_app_delete(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.wb_is_admin() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.applications WHERE id = p_id;
END;
$$;

-- ---------- quem pode chamar: só usuário logado; nunca a chave pública sem sessão ----------
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'wb_is_admin()', 'wb_context(text)', 'wb_redeem(text)',
    'wb_invite_create(text, uuid[], timestamptz, int)', 'wb_invite_list()', 'wb_invite_revoke(uuid)',
    'wb_invite_extend(uuid, timestamptz)', 'wb_invite_delete(uuid)',
    'wb_app_list()', 'wb_app_save(jsonb)', 'wb_app_delete(uuid)']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ============================================================================
-- DADOS: limpeza do catálogo (reversível: nada é apagado)
-- ============================================================================
UPDATE public.applications SET category = 'Engenharia' WHERE category = 'Engineering';
UPDATE public.applications SET category = 'Comercial'  WHERE category = 'Commercial';
-- o portal não é uma ferramenta dele mesmo; o card de teste sai da home
UPDATE public.applications SET is_active = false WHERE slug = 'portal' OR url = 'https://google.com';

-- descrições iniciais (só onde está vazio; edite pelo Catálogo no portal)
UPDATE public.applications a SET description = d.description, keywords = d.keywords
FROM (VALUES
  ('curva-polinomial', 'Ajuste de curva polinomial por mínimos quadrados', 'mmq regressão interpolação polinômio'),
  ('importacao',       'Custo de nacionalização e impostos de uma importação', 'ncm ii ipi icms pis cofins fob câmbio nacionalização'),
  ('calculadora-bess', 'Dimensionamento e economia de sistemas de bateria', 'bateria armazenamento ponta tarifa unifilar degradação'),
  ('anydoc',           'Converte documentos entre formatos', 'pdf word markdown converter arquivo'),
  ('saving-lp',        'Economia tributária no lucro presumido', 'imposto tributo simulação regime'),
  ('visualizador-nfe', 'Abre o XML de uma NF-e e mostra os dados', 'nota fiscal xml danfe chave'),
  ('savings-ir',       'Economia de imposto de renda', 'ir imposto simulação dedução'),
  ('memoria-massa',    'Lê a memória de massa do medidor: demanda, energia, fator de potência e qualidade', 'ultrapassagem demanda curva de carga prodist medidor xlsx bess'),
  ('curvas-bess',      'Dia típico com carga, geração FV e bateria, pronto para o slide', 'gráfico apresentação peak shaving fotovoltaico despacho autoconsumo')
) AS d(slug, description, keywords)
WHERE a.slug = d.slug AND a.description IS NULL;

COMMIT;
