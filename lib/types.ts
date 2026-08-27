export const STATUS_COMERCIAL = [
  'NOVO',
  'CONTATO_PENDENTE',
  'PROPOSTA_ENVIADA',
  'NEGOCIACAO',
  'FECHADO',
  'REJEITADO',
] as const

export type StatusComercial = (typeof STATUS_COMERCIAL)[number]

export type DiagnosticoRespostas = {
  q1: number;  q2: number;  q3: number;  q4: number;  q5: number
  q6: number;  q7: number;  q8: number;  q9: number;  q10: number
  q11: number; q12: number; q13: number; q14: number; q15: number
}

/** Índice da opção marcada em cada pergunta. Ver sql/adiciona-escolhas.sql. */
export type DiagnosticoEscolhas = DiagnosticoRespostas

export type Diagnostico = {
  id: string
  nome: string
  email: string
  whatsapp: string
  instagram: string | null
  site: string | null
  cidade: string | null
  area: string | null
  respostas_json: DiagnosticoRespostas
  /** Nulo em diagnósticos anteriores à coluna. */
  escolhas_json: DiagnosticoEscolhas | null
  nota_geral: number
  gargalo_principal: string
  cac_investimento_mensal: number | null
  cac_novos_clientes: number | null
  cac_ticket_medio: number | null
  cac_margem: number | null
  cac_casos_por_cliente: number | null
  criado_em: string
  status_comercial: StatusComercial
  proxima_acao: string | null
  observacoes: string | null
}

export type Admin = {
  id: string
  email: string
  nome: string
  role: 'admin' | 'gerente'
  criado_em: string
}

export type HistoricoComercial = {
  id: string
  diagnostico_id: string
  status_anterior: string | null
  status_novo: string
  observacao: string | null
  criado_por: string
  criado_em: string
}

export type PillarScores = {
  aquisicao: number
  triagem: number
  conversao: number
  crm: number
  gestao: number
  media: number
}
