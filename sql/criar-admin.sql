-- ============================================================================
-- CRIAR ADMINISTRADOR
--
-- Pré-requisito: o usuário já deve existir em Authentication → Users,
-- criado por você no painel do Supabase, com "Auto Confirm User" marcado.
--
-- Este script resolve o UUID pelo e-mail automaticamente — não é preciso
-- copiar o id à mão, que é justamente onde o erro costuma acontecer.
--
-- Troque 'seu@email.com' e 'Seu Nome' nos dois lugares abaixo.
-- ============================================================================

INSERT INTO admins (id, email, nome, role)
SELECT u.id, u.email, 'Seu Nome', 'admin'   -- role: 'admin' ou 'gerente'
FROM auth.users u
WHERE u.email = 'seu@email.com'
ON CONFLICT (id) DO UPDATE
  SET nome  = EXCLUDED.nome,
      role  = EXCLUDED.role,
      email = EXCLUDED.email;

-- Confirmação. Deve retornar exatamente 1 linha, com email_confirmed_at
-- preenchido. Se vier NULL, o login falha: confirme o e-mail no painel.
SELECT a.id, a.email, a.nome, a.role, u.email_confirmed_at
FROM admins a
JOIN auth.users u ON u.id = a.id
WHERE a.email = 'seu@email.com';

-- Se o INSERT afetou 0 linhas, o e-mail não existe em auth.users.
-- Para ver quais existem:
--   SELECT id, email, email_confirmed_at FROM auth.users ORDER BY created_at DESC;
