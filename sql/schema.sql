-- ============================================================================
-- SEVEN XPERTS — SCHEMA COMPLETO
-- Idempotente: pode ser executado novamente com segurança.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VALIDAÇÃO DAS RESPOSTAS
-- Garante, no banco, que as 15 respostas existem e estão entre 1 e 10.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.respostas_validas(r JSONB)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT r ?& ARRAY['q1','q2','q3','q4','q5','q6','q7','q8',
                    'q9','q10','q11','q12','q13','q14','q15']
     AND NOT EXISTS (
       SELECT 1
       FROM jsonb_each_text(r) AS e(chave, valor)
       WHERE valor !~ '^[0-9]+$' OR valor::INT < 1 OR valor::INT > 10
     );
$$;

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

  -- Calculadora de CAC (etapa opcional do formulário).
  -- Guardamos apenas as ENTRADAS; CAC, LTV e razão são derivados em código,
  -- garantindo um único ponto de verdade e resultado reproduzível.
  cac_investimento_mensal NUMERIC(12,2),
  cac_novos_clientes      INTEGER,
  cac_ticket_medio        NUMERIC(12,2),
  cac_margem              NUMERIC(4,3),
  cac_casos_por_cliente   NUMERIC(5,2),

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_comercial TEXT NOT NULL DEFAULT 'NOVO',
  proxima_acao TEXT,
  observacoes TEXT,

  CONSTRAINT status_comercial_valido CHECK (status_comercial IN (
    'NOVO','CONTATO_PENDENTE','PROPOSTA_ENVIADA','NEGOCIACAO','FECHADO','REJEITADO'
  )),
  CONSTRAINT respostas_completas CHECK (public.respostas_validas(respostas_json)),
  CONSTRAINT cac_valores_positivos CHECK (
    (cac_investimento_mensal IS NULL OR cac_investimento_mensal >= 0) AND
    (cac_novos_clientes      IS NULL OR cac_novos_clientes      >= 0) AND
    (cac_ticket_medio        IS NULL OR cac_ticket_medio        >= 0) AND
    (cac_margem              IS NULL OR cac_margem BETWEEN 0 AND 1)   AND
    (cac_casos_por_cliente   IS NULL OR cac_casos_por_cliente   >  0)
  )
);

-- Migração para bases criadas antes desta versão
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS cac_investimento_mensal NUMERIC(12,2);
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS cac_novos_clientes      INTEGER;
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS cac_ticket_medio        NUMERIC(12,2);
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS cac_margem              NUMERIC(4,3);
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS cac_casos_por_cliente   NUMERIC(5,2);

-- admins.id É o id do usuário no Supabase Auth (não um UUID aleatório).
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

CREATE INDEX IF NOT EXISTS idx_diagnosticos_email     ON diagnosticos(email);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_status    ON diagnosticos(status_comercial);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_criado_em ON diagnosticos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_historico_diagnostico  ON historico_comercial(diagnostico_id);

-- ----------------------------------------------------------------------------
-- HELPER: is_admin()
-- SECURITY DEFINER evita recursão infinita de RLS (uma política em `admins`
-- que consulta `admins` estoura o erro 42P17).
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

DROP POLICY IF EXISTS "anon_insert_diagnostico"    ON diagnosticos;
DROP POLICY IF EXISTS "anon_no_select_diagnostico" ON diagnosticos;
DROP POLICY IF EXISTS "admin_select_diagnostico"   ON diagnosticos;
DROP POLICY IF EXISTS "admin_update_diagnostico"   ON diagnosticos;
DROP POLICY IF EXISTS "super_admin_select_admins"  ON admins;
DROP POLICY IF EXISTS "anon_no_select_admins"      ON admins;
DROP POLICY IF EXISTS "admin_select_own"           ON admins;
DROP POLICY IF EXISTS "admin_insert_historico"     ON historico_comercial;
DROP POLICY IF EXISTS "admin_select_historico"     ON historico_comercial;
DROP POLICY IF EXISTS "anon_no_select_historico"   ON historico_comercial;

-- DIAGNOSTICOS ---------------------------------------------------------------
-- Visitante anônimo só INSERE. Não existe política de SELECT para `anon`,
-- portanto a leitura é negada por padrão (RLS nega tudo que não é permitido).
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

-- ADMINS ---------------------------------------------------------------------
-- Cada admin autenticado lê apenas a PRÓPRIA linha — que é tudo que o login
-- precisa. Sem subconsulta em `admins`, logo sem recursão.
CREATE POLICY "admin_select_own" ON admins
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- HISTORICO ------------------------------------------------------------------
CREATE POLICY "admin_select_historico" ON historico_comercial
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_insert_historico" ON historico_comercial
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND criado_por = auth.uid());

-- ----------------------------------------------------------------------------
-- GRANTS (menor privilégio)
-- O Supabase concede ALL em public para anon/authenticated por padrão. O RLS
-- já barraria o excesso, mas retirar o privilégio na camada de baixo evita
-- depender de uma única defesa.
-- ----------------------------------------------------------------------------

REVOKE ALL ON diagnosticos        FROM anon, authenticated;
REVOKE ALL ON admins              FROM anon, authenticated;
REVOKE ALL ON historico_comercial FROM anon, authenticated;

GRANT INSERT          ON diagnosticos        TO anon;
GRANT SELECT, UPDATE  ON diagnosticos        TO authenticated;
GRANT SELECT          ON admins              TO authenticated;
GRANT SELECT, INSERT  ON historico_comercial TO authenticated;
