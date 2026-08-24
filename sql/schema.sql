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
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(r) <> 'object' THEN FALSE
    ELSE (SELECT count(*) FROM jsonb_object_keys(r)) = 15
      AND r ?& ARRAY['q1','q2','q3','q4','q5','q6','q7','q8',
                     'q9','q10','q11','q12','q13','q14','q15']
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each(r) AS e(chave, valor)
        WHERE jsonb_typeof(valor) <> 'number'
           OR CASE
                WHEN jsonb_typeof(valor) = 'number'
                THEN (valor #>> '{}')::NUMERIC NOT BETWEEN 1 AND 10
                  OR (valor #>> '{}')::NUMERIC <> TRUNC((valor #>> '{}')::NUMERIC)
                ELSE TRUE
              END
      )
  END;
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
  CONSTRAINT dados_contato_validos CHECK (
    char_length(btrim(nome)) BETWEEN 2 AND 200 AND
    char_length(btrim(email)) BETWEEN 3 AND 320 AND
    position('@' IN email) > 1 AND
    char_length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) BETWEEN 8 AND 15 AND
    (instagram IS NULL OR char_length(instagram) <= 200) AND
    (site      IS NULL OR char_length(site)      <= 500) AND
    (cidade    IS NULL OR char_length(cidade)    <= 120) AND
    (area      IS NULL OR char_length(area)      <= 120) AND
    (proxima_acao IS NULL OR char_length(proxima_acao) <= 1000) AND
    (observacoes  IS NULL OR char_length(observacoes)  <= 10000)
  ),
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

DO $$
DECLARE invalidos INTEGER;
BEGIN
  SELECT count(*) INTO invalidos
  FROM diagnosticos
  WHERE NOT (
    char_length(btrim(nome)) BETWEEN 2 AND 200 AND
    char_length(btrim(email)) BETWEEN 3 AND 320 AND
    position('@' IN email) > 1 AND
    char_length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) BETWEEN 8 AND 15 AND
    (instagram IS NULL OR char_length(instagram) <= 200) AND
    (site      IS NULL OR char_length(site)      <= 500) AND
    (cidade    IS NULL OR char_length(cidade)    <= 120) AND
    (area      IS NULL OR char_length(area)      <= 120) AND
    (proxima_acao IS NULL OR char_length(proxima_acao) <= 1000) AND
    (observacoes  IS NULL OR char_length(observacoes)  <= 10000)
  );

  IF invalidos > 0 THEN
    RAISE EXCEPTION
      'Migracao interrompida: % diagnostico(s) possuem dados de contato invalidos',
      invalidos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dados_contato_validos'
      AND conrelid = 'public.diagnosticos'::regclass
  ) THEN
    ALTER TABLE diagnosticos ADD CONSTRAINT dados_contato_validos CHECK (
      char_length(btrim(nome)) BETWEEN 2 AND 200 AND
      char_length(btrim(email)) BETWEEN 3 AND 320 AND
      position('@' IN email) > 1 AND
      char_length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) BETWEEN 8 AND 15 AND
      (instagram IS NULL OR char_length(instagram) <= 200) AND
      (site      IS NULL OR char_length(site)      <= 500) AND
      (cidade    IS NULL OR char_length(cidade)    <= 120) AND
      (area      IS NULL OR char_length(area)      <= 120) AND
      (proxima_acao IS NULL OR char_length(proxima_acao) <= 1000) AND
      (observacoes  IS NULL OR char_length(observacoes)  <= 10000)
    );
  END IF;
END $$;

DO $$
DECLARE invalidos INTEGER;
BEGIN
  SELECT count(*) INTO invalidos
  FROM diagnosticos
  WHERE NOT (
    (cac_investimento_mensal IS NULL OR cac_investimento_mensal >= 0) AND
    (cac_novos_clientes      IS NULL OR cac_novos_clientes      >= 0) AND
    (cac_ticket_medio        IS NULL OR cac_ticket_medio        >= 0) AND
    (cac_margem              IS NULL OR cac_margem BETWEEN 0 AND 1) AND
    (cac_casos_por_cliente   IS NULL OR cac_casos_por_cliente > 0)
  );

  IF invalidos > 0 THEN
    RAISE EXCEPTION
      'Migracao interrompida: % diagnostico(s) possuem entradas CAC invalidas',
      invalidos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cac_valores_positivos'
      AND conrelid = 'public.diagnosticos'::regclass
  ) THEN
    ALTER TABLE diagnosticos ADD CONSTRAINT cac_valores_positivos CHECK (
      (cac_investimento_mensal IS NULL OR cac_investimento_mensal >= 0) AND
      (cac_novos_clientes      IS NULL OR cac_novos_clientes      >= 0) AND
      (cac_ticket_medio        IS NULL OR cac_ticket_medio        >= 0) AND
      (cac_margem              IS NULL OR cac_margem BETWEEN 0 AND 1) AND
      (cac_casos_por_cliente   IS NULL OR cac_casos_por_cliente > 0)
    );
  END IF;
END $$;

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
-- CÁLCULO DO DIAGNÓSTICO NO BANCO
--
-- nota_geral e gargalo_principal são derivados de respostas_json por trigger,
-- nunca aceitos do cliente. Sem isso, um visitante que fale direto com a API
-- poderia enviar respostas ruins com nota 10, ou um gargalo que não bate com
-- o que respondeu.
--
-- Espelha lib/diagnosis.ts exatamente:
--   - pilar  = média das suas 3 perguntas
--   - nota   = média dos 5 pilares crus, arredondada uma única vez
--   - gargalo= menor pilar JÁ ARREDONDADO; empate resolve pela ordem do funil
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aplicar_diagnostico()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  r  JSONB := NEW.respostas_json;
  aq NUMERIC; tr NUMERIC; cv NUMERIC; cr NUMERIC; ge NUMERIC;
  menor NUMERIC;
BEGIN
  IF NOT public.respostas_validas(r) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'respostas_json deve conter q1..q15 como inteiros entre 1 e 10';
  END IF;

  aq := ((r->>'q1')::NUMERIC  + (r->>'q2')::NUMERIC  + (r->>'q3')::NUMERIC)  / 3;
  tr := ((r->>'q4')::NUMERIC  + (r->>'q5')::NUMERIC  + (r->>'q6')::NUMERIC)  / 3;
  cv := ((r->>'q7')::NUMERIC  + (r->>'q8')::NUMERIC  + (r->>'q9')::NUMERIC)  / 3;
  cr := ((r->>'q10')::NUMERIC + (r->>'q11')::NUMERIC + (r->>'q12')::NUMERIC) / 3;
  ge := ((r->>'q13')::NUMERIC + (r->>'q14')::NUMERIC + (r->>'q15')::NUMERIC) / 3;

  NEW.nota_geral := ROUND((aq + tr + cv + cr + ge) / 5, 1);

  -- Compara os pilares arredondados, como o front faz.
  aq := ROUND(aq, 1); tr := ROUND(tr, 1); cv := ROUND(cv, 1);
  cr := ROUND(cr, 1); ge := ROUND(ge, 1);
  menor := LEAST(aq, tr, cv, cr, ge);

  NEW.gargalo_principal := CASE
    WHEN aq = menor THEN 'Aquisição'
    WHEN tr = menor THEN 'Triagem'
    WHEN cv = menor THEN 'Conversão'
    WHEN cr = menor THEN 'CRM'
    ELSE                   'Gestão'
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_aplicar_diagnostico ON diagnosticos;
CREATE TRIGGER trg_aplicar_diagnostico
  BEFORE INSERT OR UPDATE OF respostas_json ON diagnosticos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_diagnostico();

-- Interrompe com diagnóstico claro se dados legados não puderem ser migrados.
DO $$
DECLARE invalidos INTEGER;
BEGIN
  SELECT count(*) INTO invalidos
  FROM diagnosticos
  WHERE public.respostas_validas(respostas_json) IS NOT TRUE;

  IF invalidos > 0 THEN
    RAISE EXCEPTION
      'Migracao interrompida: % diagnostico(s) possuem respostas_json invalidas',
      invalidos;
  END IF;
END $$;

-- Recalcula registros antigos e preserva a garantia estrutural de NOT NULL.
-- O trigger é BEFORE INSERT, então o cliente pode omitir os campos derivados.
UPDATE diagnosticos SET respostas_json = respostas_json;
ALTER TABLE diagnosticos ALTER COLUMN nota_geral        SET NOT NULL;
ALTER TABLE diagnosticos ALTER COLUMN gargalo_principal SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'respostas_completas'
      AND conrelid = 'public.diagnosticos'::regclass
  ) THEN
    ALTER TABLE diagnosticos ADD CONSTRAINT respostas_completas
      CHECK (public.respostas_validas(respostas_json));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.aplicar_diagnostico() FROM PUBLIC;

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
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE admins.id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ----------------------------------------------------------------------------
-- HISTÓRICO TRANSACIONAL DE STATUS
-- A mesma transação que altera o status grava o histórico. Assim não existe
-- estado "status salvo, histórico perdido", e o cliente não fabrica eventos.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_historico_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ator UUID := (SELECT auth.uid());
BEGIN
  IF ator IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado ao historico comercial';
  END IF;

  INSERT INTO public.historico_comercial (
    diagnostico_id, status_anterior, status_novo, observacao, criado_por
  ) VALUES (
    NEW.id, OLD.status_comercial, NEW.status_comercial, NEW.observacoes, ator
  );

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.registrar_historico_status() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_registrar_historico_status ON diagnosticos;
CREATE TRIGGER trg_registrar_historico_status
  AFTER UPDATE OF status_comercial ON diagnosticos
  FOR EACH ROW
  WHEN (OLD.status_comercial IS DISTINCT FROM NEW.status_comercial)
  EXECUTE FUNCTION public.registrar_historico_status();

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
  USING (id = (SELECT auth.uid()));

-- HISTORICO ------------------------------------------------------------------
CREATE POLICY "admin_select_historico" ON historico_comercial
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- GRANTS (menor privilégio)
-- O Supabase concede ALL em public para anon/authenticated por padrão. O RLS
-- já barraria o excesso, mas retirar o privilégio na camada de baixo evita
-- depender de uma única defesa.
-- ----------------------------------------------------------------------------

REVOKE ALL ON diagnosticos        FROM anon, authenticated;
REVOKE ALL ON admins              FROM anon, authenticated;
REVOKE ALL ON historico_comercial FROM anon, authenticated;

-- Privilégio POR COLUNA. A política de INSERT do anon é WITH CHECK (true) —
-- ela autoriza a linha, não escolhe colunas. Sem esta lista, um visitante
-- falando direto com a API gravaria status_comercial='FECHADO' ou injetaria
-- texto em observacoes, que o admin lê.
GRANT INSERT (
  nome, email, whatsapp, instagram, site, cidade, area,
  respostas_json,
  cac_investimento_mensal, cac_novos_clientes, cac_ticket_medio,
  cac_margem, cac_casos_por_cliente
) ON diagnosticos TO anon;

GRANT SELECT ON diagnosticos TO authenticated;

-- O admin mexe no funil comercial, não no diagnóstico em si.
GRANT UPDATE (status_comercial, proxima_acao, observacoes)
  ON diagnosticos TO authenticated;

GRANT SELECT          ON admins              TO authenticated;
GRANT SELECT          ON historico_comercial TO authenticated;
