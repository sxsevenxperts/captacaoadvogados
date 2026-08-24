export type Diagnostico = {
  id: string
  nome: string
  email: string
  whatsapp: string
  instagram?: string
  site?: string
  cidade?: string
  area?: string
  respostas_json: Record<string, number>
  nota_geral: number
  gargalo_principal: string
  criado_em: string
  status_comercial: 'NOVO' | 'CONTATO_PENDENTE' | 'PROPOSTA_ENVIADA' | 'NEGOCIACAO' | 'FECHADO' | 'REJEITADO'
  proxima_acao?: string
  observacoes?: string
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
  status_anterior: string
  status_novo: string
  observacao?: string
  criado_por: string
  criado_em: string
}

export type DiagnosticoRespostas = {
  q1: number
  q2: number
  q3: number
  q4: number
  q5: number
  q6: number
  q7: number
  q8: number
  q9: number
  q10: number
  q11: number
  q12: number
  q13: number
}

export type PillarScores = {
  aquisicao: number
  triagem: number
  conversao: number
  crm: number
  gestao: number
  media: number
}
