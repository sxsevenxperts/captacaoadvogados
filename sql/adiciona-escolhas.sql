-- ============================================================================
-- Guarda QUAL opção o visitante marcou, além da nota que ela vale.
--
-- Por que existe
-- --------------
-- `respostas_json` guarda a escala de 1 a 10 de cada pergunta. Isso basta para
-- calcular pilares, nota e gargalo, mas perde a resposta em si sempre que duas
-- opções da mesma pergunta valem a mesma nota. Hoje isso acontece em cinco
-- perguntas, e o caso grave é a q15:
--
--   q15 "Qual problema parece mais urgente hoje?" — as NOVE opções valem 70,
--   porque é uma escolha de sintoma, não uma escala de maturidade. Todas caem
--   na escala 7, e o painel não tem como saber qual foi marcada.
--
-- Essa é a resposta mais útil para preparar a reunião: o lead diz, com as
-- palavras dele, o que mais dói. Igualar os pesos está certo do ponto de vista
-- do diagnóstico; o erro era descartar a escolha.
--
-- A correção NÃO é mexer nos valores — isso distorceria a metodologia. É
-- gravar o índice da opção ao lado da nota.
--
-- Segurança
-- ---------
-- Coluna nova, anulável, sem default e sem backfill: nada existente muda.
-- Linhas antigas ficam com NULL e o painel cai no comportamento anterior
-- (reencontrar a opção pela escala). Reversível com DROP COLUMN.
--
-- Como aplicar: cole no SQL Editor do Supabase e execute.
-- ============================================================================

-- Índice da opção escolhida, por pergunta: {"q1": 5, "q2": 1, ...}
-- O índice é a posição em `PERGUNTAS[n].opcoes`, contando de 0.
CREATE OR REPLACE FUNCTION public.escolhas_validas(e JSONB)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN e IS NULL THEN TRUE
    WHEN jsonb_typeof(e) <> 'object' THEN FALSE
    ELSE (SELECT count(*) FROM jsonb_object_keys(e)) = 15
      AND e ?& ARRAY['q1','q2','q3','q4','q5','q6','q7','q8',
                     'q9','q10','q11','q12','q13','q14','q15']
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each(e) AS x(chave, valor)
        WHERE jsonb_typeof(valor) <> 'number'
           OR (valor #>> '{}')::NUMERIC < 0
           OR (valor #>> '{}')::NUMERIC > 20
           OR (valor #>> '{}')::NUMERIC <> TRUNC((valor #>> '{}')::NUMERIC)
      )
  END;
$$;

ALTER TABLE public.diagnosticos
  ADD COLUMN IF NOT EXISTS escolhas_json JSONB;

-- Só valida quando a coluna vem preenchida: linhas anteriores à mudança
-- continuam válidas com NULL.
ALTER TABLE public.diagnosticos
  DROP CONSTRAINT IF EXISTS escolhas_coerentes;

ALTER TABLE public.diagnosticos
  ADD CONSTRAINT escolhas_coerentes
  CHECK (escolhas_json IS NULL OR public.escolhas_validas(escolhas_json));

-- O visitante anônimo já tem INSERT na tabela; a coluna entra no mesmo GRANT.
-- Nada a conceder além do que existe.

COMMENT ON COLUMN public.diagnosticos.escolhas_json IS
  'Índice da opção marcada em cada pergunta (posição em PERGUNTAS[n].opcoes). '
  'Complementa respostas_json, que guarda apenas a nota de 1 a 10 e não '
  'distingue opções de mesmo peso — caso da q15, com nove opções valendo 70.';
