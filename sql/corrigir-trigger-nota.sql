-- ============================================================================
-- CORREÇÃO: trigger de nota/gargalo ausente no banco em produção
-- ============================================================================
--
-- Sintoma observado no navegador ao concluir o diagnóstico:
--
--   POST /rest/v1/diagnosticos  ->  400
--   {"code":"23502","message":"null value in column \"nota_geral\" of relation
--    \"diagnosticos\" violates not-null constraint"}
--
-- Causa: nota_geral e gargalo_principal são NOT NULL e deveriam ser
-- preenchidos pelo trigger `trg_aplicar_diagnostico`. O trigger existe em
-- sql/schema.sql, mas não está instalado no banco ativo — então a coluna
-- chega nula e a constraint derruba o INSERT inteiro.
--
-- Por que não dá para resolver no front: o papel `anon` tem GRANT INSERT
-- apenas nas colunas de contato, respostas_json e cac_*. Ele não pode gravar
-- nota_geral nem gargalo_principal — e isso é proposital, senão um visitante
-- falando direto com a API se daria nota 10.
--
-- Rode este arquivo no SQL Editor do Supabase. É idempotente.
-- ============================================================================

-- Validação das 15 respostas: q1..q15, inteiros de 1 a 10.
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

-- Deriva nota_geral e gargalo_principal a partir das respostas.
-- Pilares: q1-q3 Aquisição, q4-q6 Triagem, q7-q9 Conversão,
--          q10-q12 CRM, q13-q15 Gestão.
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

REVOKE ALL ON FUNCTION public.aplicar_diagnostico() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_aplicar_diagnostico ON diagnosticos;
CREATE TRIGGER trg_aplicar_diagnostico
  BEFORE INSERT OR UPDATE OF respostas_json ON diagnosticos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_diagnostico();

-- ----------------------------------------------------------------------------
-- CONFERÊNCIA: deve retornar uma linha com o trigger instalado.
-- ----------------------------------------------------------------------------
SELECT tgname AS trigger_instalado
FROM pg_trigger
WHERE tgrelid = 'public.diagnosticos'::regclass
  AND NOT tgisinternal;
