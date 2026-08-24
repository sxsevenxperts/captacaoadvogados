-- ============================================================================
-- VERIFICAÇÃO DO RLS
--
-- Cole tudo no SQL Editor do Supabase e execute. O script roda dentro de uma
-- transação e faz ROLLBACK no fim: nada é gravado.
--
-- Se aparecer "TODOS OS TESTES PASSARAM", o RLS está correto.
-- Qualquer falha interrompe a execução com uma mensagem começando por FALHA.
-- ============================================================================

BEGIN;

-- Diagnóstico de referência, criado com privilégios totais (ignora RLS).
INSERT INTO diagnosticos (
  nome, email, whatsapp, respostas_json, nota_geral, gargalo_principal
) VALUES (
  'Teste RLS', 'teste-rls@example.com', '11999999999',
  '{"q1":5,"q2":5,"q3":5,"q4":5,"q5":5,"q6":5,"q7":5,"q8":5,
    "q9":5,"q10":5,"q11":5,"q12":5,"q13":5,"q14":5,"q15":5}'::jsonb,
  5.0, 'Aquisição'
);

-- ---------------------------------------------------------------------------
-- 1. Visitante anônimo NÃO pode ler diagnósticos
-- ---------------------------------------------------------------------------
SET LOCAL ROLE anon;

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM diagnosticos;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FALHA 1: anon leu % linha(s) de diagnosticos', n;
  END IF;
  RAISE NOTICE 'OK 1: anon nao le diagnosticos';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Visitante anônimo PODE inserir diagnóstico
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO diagnosticos (
    nome, email, whatsapp, respostas_json, nota_geral, gargalo_principal
  ) VALUES (
    'Lead Anonimo', 'anon@example.com', '11888888888',
    '{"q1":3,"q2":3,"q3":3,"q4":3,"q5":3,"q6":3,"q7":3,"q8":3,
      "q9":3,"q10":3,"q11":3,"q12":3,"q13":3,"q14":3,"q15":3}'::jsonb,
    3.0, 'Aquisição'
  );
  RAISE NOTICE 'OK 2: anon consegue inserir diagnostico';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'FALHA 2: anon nao conseguiu inserir (%)', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Visitante anônimo NÃO pode ler admins nem histórico
-- ---------------------------------------------------------------------------
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM admins;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA 3a: anon leu % admin(s)', n; END IF;

  SELECT count(*) INTO n FROM historico_comercial;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA 3b: anon leu % historico(s)', n; END IF;

  RAISE NOTICE 'OK 3: anon nao le admins nem historico';
EXCEPTION WHEN insufficient_privilege THEN
  -- Sem GRANT de SELECT o erro é de privilégio, o que também é aprovação.
  RAISE NOTICE 'OK 3: anon barrado por privilegio (ainda melhor que RLS)';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Autenticado que NÃO está em `admins` não enxerga nada
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM diagnosticos;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FALHA 4: usuario sem cadastro em admins leu % linha(s)', n;
  END IF;
  RAISE NOTICE 'OK 4: autenticado fora de admins nao le diagnosticos';
END $$;

-- ---------------------------------------------------------------------------
-- 5. Autenticado fora de `admins` não consegue ATUALIZAR
-- ---------------------------------------------------------------------------
DO $$
DECLARE n INT;
BEGIN
  WITH alterados AS (
    UPDATE diagnosticos SET status_comercial = 'FECHADO' RETURNING 1
  )
  SELECT count(*) INTO n FROM alterados;

  IF n <> 0 THEN
    RAISE EXCEPTION 'FALHA 5: nao-admin atualizou % linha(s)', n;
  END IF;
  RAISE NOTICE 'OK 5: autenticado fora de admins nao atualiza';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. Admin de verdade enxerga tudo
--    Só roda se já existir pelo menos um admin cadastrado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  admin_id UUID;
  n INT;
  total INT;
BEGIN
  SELECT id INTO admin_id FROM admins LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'PULADO 6: nenhum admin cadastrado ainda (rode criar-admin.sql)';
    RETURN;
  END IF;

  SELECT count(*) INTO total FROM diagnosticos;

  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO n FROM diagnosticos;

  PERFORM set_config('role', 'none', true);

  IF n <> total THEN
    RAISE EXCEPTION 'FALHA 6: admin viu % de % diagnosticos', n, total;
  END IF;
  RAISE NOTICE 'OK 6: admin le todos os % diagnosticos', n;
END $$;

-- ---------------------------------------------------------------------------
-- 7. A constraint das 15 respostas está ativa
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO diagnosticos (
    nome, email, whatsapp, respostas_json, nota_geral, gargalo_principal
  ) VALUES (
    'Incompleto', 'x@example.com', '11777777777',
    '{"q1":5,"q2":5}'::jsonb, 5.0, 'Aquisição'
  );
  RAISE EXCEPTION 'FALHA 7: aceitou diagnostico com menos de 15 respostas';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'OK 7: diagnostico incompleto foi rejeitado';
END $$;

DO $$ BEGIN
  RAISE NOTICE '=== TODOS OS TESTES PASSARAM ===';
END $$;

ROLLBACK;
