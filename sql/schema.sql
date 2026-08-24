-- ============================================================================
-- SEVEN XPERTS - SCHEMA COMPLETO (idempotente: pode rodar mais de uma vez)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS diagnosticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  site TEXT,
  cidade TEXT,
  area TEXT,
  respostas_json JSONB NOT NULL,
  nota_geral NUMERIC(3,1) NOT NULL,
  gargalo_principal TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_comercial TEXT NOT NULL DEFAULT 'NOVO',
  proxima_acao TEXT,
  observacoes TEXT,
  CONSTRAINT status_comercial_valido CHECK (status_comercial IN (
    'NOVO','CONTATO_PENDENTE','PROPOSTA_ENVIADA','NEGOCIACAO','FECHADO','REJEITADO'
  ))
);

-- admins.id É o id do usuário no Supabase Auth (não um UUID aleatório)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'gerente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_valido CHECK (role IN ('admin','gerente'))
);

CREATE TABLE IF NOT EXISTS historico_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id UUID NOT NULL REFERENCES diagnosticos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_email ON diagnosticos(email);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_status ON diagnosticos(status_comercial);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_criado_em ON diagnosticos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_historico_diagnostico ON historico_comercial(diagnostico_id);

-- ----------------------------------------------------------------------------
-- HELPER: is_admin()
-- SECURITY DEFINER evita recursão infinita de RLS (política em `admins`
-- que consulta `admins`). Sem isso o Postgres estoura erro 42P17.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE diagnosticos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_comercial ENABLE ROW LEVEL SECURITY;

-- Limpa políticas antigas (permite re-execução após erro)
DROP POLICY IF EXISTS "anon_insert_diagnostico"      ON diagnosticos;
DROP POLICY IF EXISTS "anon_no_select_diagnostico"   ON diagnosticos;
DROP POLICY IF EXISTS "admin_select_diagnostico"     ON diagnosticos;
DROP POLICY IF EXISTS "admin_update_diagnostico"     ON diagnosticos;
DROP POLICY IF EXISTS "super_admin_select_admins"    ON admins;
DROP POLICY IF EXISTS "anon_no_select_admins"        ON admins;
DROP POLICY IF EXISTS "admin_select_own"             ON admins;
DROP POLICY IF EXISTS "admin_insert_historico"       ON historico_comercial;
DROP POLICY IF EXISTS "admin_select_historico"       ON historico_comercial;
DROP POLICY IF EXISTS "anon_no_select_historico"     ON historico_comercial;

-- DIAGNOSTICOS -------------------------------------------------------------
-- Visitante anônimo só INSERE. Não há política de SELECT para anon,
-- portanto leitura é negada por padrão (RLS nega o que não é permitido).
CREATE POLICY "anon_insert_diagnostico" ON diagnosticos
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "admin_select_diagnostico" ON diagnosticos
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_update_diagnostico" ON diagnosticos
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ADMINS -------------------------------------------------------------------
-- Cada admin autenticado lê apenas a PRÓPRIA linha (é o que o login precisa).
-- Sem subconsulta em `admins` => sem recursão.
CREATE POLICY "admin_select_own" ON admins
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- HISTORICO ----------------------------------------------------------------
CREATE POLICY "admin_select_historico" ON historico_comercial
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_insert_historico" ON historico_comercial
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND criado_por = auth.uid());
