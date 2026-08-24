-- Criar tabela de diagnósticos
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
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_comercial TEXT DEFAULT 'NOVO' NOT NULL,
  proxima_acao TEXT,
  observacoes TEXT
);

-- Criar tabela de admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'gerente' NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de histórico comercial
CREATE TABLE IF NOT EXISTS historico_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id UUID NOT NULL REFERENCES diagnosticos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  observacao TEXT,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_diagnosticos_email ON diagnosticos(email);
CREATE INDEX idx_diagnosticos_status ON diagnosticos(status_comercial);
CREATE INDEX idx_diagnosticos_criado_em ON diagnosticos(criado_em DESC);
CREATE INDEX idx_admins_email ON admins(email);

-- RLS: Enable on all tables
ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_comercial ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnosticos
-- 1. Visitantes anônimos podem INSERIR diagnósticos (sem ler os próprios)
CREATE POLICY "anon_insert_diagnostico" ON diagnosticos
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- 2. Visitantes anônimos NÃO podem ler diagnósticos
CREATE POLICY "anon_no_select_diagnostico" ON diagnosticos
  FOR SELECT
  USING (false);

-- 3. Admins autenticados podem ler todos os diagnósticos
CREATE POLICY "admin_select_diagnostico" ON diagnosticos
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
    )
  );

-- 4. Admins autenticados podem atualizar diagnósticos
CREATE POLICY "admin_update_diagnostico" ON diagnosticos
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
    )
  );

-- RLS Policies for admins
-- 1. Apenas admins com role 'admin' podem ver a lista de admins
CREATE POLICY "super_admin_select_admins" ON admins
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
      AND role = 'admin'
    )
  );

-- 2. Visitantes anônimos não podem ler admins
CREATE POLICY "anon_no_select_admins" ON admins
  FOR SELECT
  USING (false);

-- RLS Policies for historico_comercial
-- 1. Apenas admins podem inserir histórico
CREATE POLICY "admin_insert_historico" ON historico_comercial
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
    )
  );

-- 2. Apenas admins podem ver histórico
CREATE POLICY "admin_select_historico" ON historico_comercial
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.user_id()
    )
  );

-- 3. Visitantes não podem ver histórico
CREATE POLICY "anon_no_select_historico" ON historico_comercial
  FOR SELECT
  USING (false);
