import type { DiagnosticoRespostas, PillarScores } from './types'

export function calcularScores(respostas: DiagnosticoRespostas): PillarScores {
  // Pilar 1: Aquisição (Q1, Q2, Q3)
  const aquisicao = (respostas.q1 + respostas.q2 + respostas.q3) / 3

  // Pilar 2: Triagem (Q4, Q5, Q6)
  const triagem = (respostas.q4 + respostas.q5 + respostas.q6) / 3

  // Pilar 3: Conversão (Q7, Q8, Q9)
  const conversao = (respostas.q7 + respostas.q8 + respostas.q9) / 3

  // Pilar 4: CRM (Q10, Q11)
  const crm = (respostas.q10 + respostas.q11) / 2

  // Pilar 5: Gestão (Q12, Q13)
  const gestao = (respostas.q12 + respostas.q13) / 2

  const media = (aquisicao + triagem + conversao + crm + gestao) / 5

  return {
    aquisicao: Math.round(aquisicao * 10) / 10,
    triagem: Math.round(triagem * 10) / 10,
    conversao: Math.round(conversao * 10) / 10,
    crm: Math.round(crm * 10) / 10,
    gestao: Math.round(gestao * 10) / 10,
    media: Math.round(media * 10) / 10,
  }
}

export function identificarGargalo(scores: PillarScores): string {
  const pilares = [
    { nome: 'Aquisição', valor: scores.aquisicao },
    { nome: 'Triagem', valor: scores.triagem },
    { nome: 'Conversão', valor: scores.conversao },
    { nome: 'CRM', valor: scores.crm },
    { nome: 'Gestão', valor: scores.gestao },
  ]

  const gargalo = pilares.reduce((min, current) =>
    current.valor < min.valor ? current : min
  )

  return gargalo.nome
}

export function gerarRecomendacoes(scores: PillarScores, gargalo: string): string[] {
  const recomendacoes: string[] = []

  if (scores.aquisicao < 5) {
    recomendacoes.push('Implementar estratégia de marketing digital estruturada')
    recomendacoes.push('Aumentar presença em redes sociais e Google Meu Negócio')
  }

  if (scores.triagem < 5) {
    recomendacoes.push('Criar fluxo de qualificação de leads automatizado')
    recomendacoes.push('Estabelecer critérios claros de aceite de clientes')
  }

  if (scores.conversao < 5) {
    recomendacoes.push('Otimizar processo de apresentação de propostas')
    recomendacoes.push('Treinar equipe em técnicas de fechamento')
  }

  if (scores.crm < 5) {
    recomendacoes.push('Implementar CRM especializado para advocacia')
    recomendacoes.push('Automatizar follow-ups e comunicação com clientes')
  }

  if (scores.gestao < 5) {
    recomendacoes.push('Estruturar processos administrativos')
    recomendacoes.push('Implementar gestão de tempo e ressourcing')
  }

  return recomendacoes.slice(0, 3)
}

export function calcularCAC(
  investimentoMensal: number,
  clientesAquisitos: number
): number {
  if (clientesAquisitos === 0) return investimentoMensal
  return investimentoMensal / clientesAquisitos
}

export function calcularCACIdeal(
  ticket: number,
  marginemLucro: number = 0.3
): number {
  return ticket * marginemLucro / 3
}

export function gerarMensagemWhatsapp(
  nome: string,
  gargalo: string,
  scores: PillarScores
): string {
  return `Olá ${nome}! 👋\n\nAnalisamos seu diagnóstico e identificamos que o principal gargalo é em ${gargalo}.\n\nSua nota geral: ${scores.media}/10\n\nGostaria de uma conversa com nosso time para discutir soluções?`
}
