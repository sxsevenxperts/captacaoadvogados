-- ============================================================================
-- DADOS DE EXEMPLO (opcional) — execute depois de schema.sql
-- ============================================================================

INSERT INTO diagnosticos (
  nome, email, whatsapp, instagram, site, cidade, area,
  respostas_json, nota_geral, gargalo_principal,
  cac_investimento_mensal, cac_novos_clientes, cac_ticket_medio,
  cac_margem, cac_casos_por_cliente,
  status_comercial, proxima_acao, observacoes
) VALUES
(
  'João Silva', 'joao@example.com', '11999991111',
  '@joao.adv', 'joao-advocacia.com.br', 'São Paulo', 'Trabalhista',
  '{"q1":4,"q2":3,"q3":5,"q4":2,"q5":3,"q6":4,"q7":6,"q8":5,
    "q9":7,"q10":2,"q11":3,"q12":2,"q13":4,"q14":5,"q15":3}'::jsonb,
  3.9, 'CRM',
  5000, 4, 8000, 0.600, 1,
  'NOVO', 'Enviar diagnóstico em 3 dias', 'Chegou por indicação. Sem CRM nenhum.'
),
(
  'Maria Santos', 'maria@example.com', '21988882222',
  '@maria.adv', 'maria-advogada.com.br', 'Rio de Janeiro', 'Imobiliário',
  '{"q1":7,"q2":8,"q3":6,"q4":5,"q5":6,"q6":7,"q7":3,"q8":4,
    "q9":3,"q10":8,"q11":7,"q12":6,"q13":6,"q14":5,"q15":4}'::jsonb,
  5.7, 'Conversão',
  12000, 3, 15000, 0.550, 2,
  'CONTATO_PENDENTE', 'Agendar call', 'Estrutura boa, converte mal.'
),
(
  'Pedro Costa', 'pedro@example.com', '31977773333',
  NULL, 'pedro-advogado.com.br', 'Belo Horizonte', 'Empresarial',
  '{"q1":8,"q2":9,"q3":8,"q4":7,"q5":8,"q6":7,"q7":8,"q8":7,
    "q9":8,"q10":6,"q11":5,"q12":4,"q13":7,"q14":6,"q15":5}'::jsonb,
  6.9, 'CRM',
  20000, 8, 25000, 0.650, 3,
  'PROPOSTA_ENVIADA', 'Follow-up sexta', 'Negociando valor.'
);

SELECT nome, nota_geral, gargalo_principal, status_comercial
FROM diagnosticos
ORDER BY criado_em DESC;
