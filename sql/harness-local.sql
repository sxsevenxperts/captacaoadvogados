-- ============================================================================
-- ARNÊS LOCAL
--
-- Reproduz as primitivas do Supabase (schema auth, auth.uid(), roles anon e
-- authenticated) num Postgres comum, para validar schema.sql e
-- verificar-rls.sql sem encostar em produção.
--
-- Uso:
--   createdb sx_teste
--   psql -d sx_teste -f sql/harness-local.sql
--   psql -d sx_teste -f sql/schema.sql
--   psql -d sx_teste -f sql/verificar-rls.sql
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesma definição usada pelo Supabase.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::JSONB ->> 'sub')
  )::UUID
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::JSONB ->> 'role')
  )::TEXT
$$;

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth   TO anon, authenticated;

-- O Supabase concede ALL em public por padrão. Reproduzimos isso de propósito:
-- é o que prova que o REVOKE do nosso schema.sql realmente fecha o acesso,
-- em vez de depender de a base já estar fechada.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
