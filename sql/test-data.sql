-- Dados de teste (execute APÓS o schema.sql)

-- Inserir diagnóstico de teste
INSERT INTO diagnosticos (
  nome,
  email,
  whatsapp,
  instagram,
  site,
  cidade,
  area,
  respostas_json,
  nota_geral,
  gargalo_principal,
  status_comercial,
  proxima_acao,
  observacoes
) VALUES (
  'João Silva',
  'joao@example.com',
  '+55 11 99999-1111',
  '@joao.silva',
  'www.joao-advocacia.com.br',
  'São Paulo',
  'Direito Trabalhista',
  '{
    "q1": 4,
    "q2": 3,
    "q3": 5,
    "q4": 2,
    "q5": 3,
    "q6": 4,
    "q7": 6,
    "q8": 5,
    "q9": 7,
    "q10": 2,
    "q11": 3,
    "q12": 4,
    "q13": 5
  }'::jsonb,
  4.1,
  'Triagem',
  'NOVO',
  'Enviar diagnóstico em 3 dias',
  'Lead qualificado. Chamou por referência.'
);

-- Inserir segundo diagnóstico
INSERT INTO diagnosticos (
  nome,
  email,
  whatsapp,
  instagram,
  site,
  cidade,
  area,
  respostas_json,
  nota_geral,
  gargalo_principal,
  status_comercial,
  proxima_acao,
  observacoes
) VALUES (
  'Maria Santos',
  'maria@example.com',
  '+55 21 98888-2222',
  '@maria.santos',
  'www.maria-advogada.com.br',
  'Rio de Janeiro',
  'Direito Imobiliário',
  '{
    "q1": 7,
    "q2": 8,
    "q3": 6,
    "q4": 5,
    "q5": 6,
    "q6": 7,
    "q7": 3,
    "q8": 4,
    "q9": 3,
    "q10": 8,
    "q11": 7,
    "q12": 6,
    "q13": 5
  }'::jsonb,
  5.9,
  'Conversão',
  'CONTATO_PENDENTE',
  'Agendar call para semana que vem',
  'Estrutura boa, mas precisa melhorar conversão.'
);

-- Inserir terceiro diagnóstico
INSERT INTO diagnosticos (
  nome,
  email,
  whatsapp,
  site,
  cidade,
  respostas_json,
  nota_geral,
  gargalo_principal,
  status_comercial,
  observacoes
) VALUES (
  'Pedro Costa',
  'pedro@example.com',
  '+55 31 97777-3333',
  'www.pedro-advogado.com.br',
  'Belo Horizonte',
  '{
    "q1": 8,
    "q2": 9,
    "q3": 8,
    "q4": 7,
    "q5": 8,
    "q6": 7,
    "q7": 8,
    "q8": 7,
    "q9": 8,
    "q10": 6,
    "q11": 5,
    "q12": 7,
    "q13": 6
  }'::jsonb,
  7.3,
  'CRM',
  'PROPOSTA_ENVIADA',
  'Proposta enviada. Cliente negociando preço.'
);

-- Verificar dados inseridos
SELECT id, nome, email, nota_geral, gargalo_principal, status_comercial
FROM diagnosticos
ORDER BY criado_em DESC;
