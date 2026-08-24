import type { DiagnosticoRespostas, PillarScores } from './types'

/**
 * 15 perguntas, 3 por pilar. O balanceamento importa: com um número desigual
 * de perguntas por pilar, o pilar mais curto oscila mais e distorce a escolha
 * do gargalo.
 */
export const PERGUNTAS: { id: keyof DiagnosticoRespostas; pilar: string; texto: string }[] = [
  // Aquisição
  { id: 'q1',  pilar: 'Aquisição', texto: 'Sua estratégia de aquisição de clientes é estruturada e previsível?' },
  { id: 'q2',  pilar: 'Aquisição', texto: 'Você investe de forma consistente em marketing digital?' },
  { id: 'q3',  pilar: 'Aquisição', texto: 'Sua presença online (site, Google, redes) gera contatos por conta própria?' },
  // Triagem
  { id: 'q4',  pilar: 'Triagem',   texto: 'Existe um processo definido de triagem dos contatos que chegam?' },
  { id: 'q5',  pilar: 'Triagem',   texto: 'Você qualifica o caso e o perfil do cliente antes de apresentar proposta?' },
  { id: 'q6',  pilar: 'Triagem',   texto: 'Seus critérios para recusar um caso são claros e aplicados?' },
  // Conversão
  { id: 'q7',  pilar: 'Conversão', texto: 'Seu processo de apresentação de proposta é padronizado?' },
  { id: 'q8',  pilar: 'Conversão', texto: 'Você conhece sua taxa de fechamento (propostas enviadas x contratos)?' },
  { id: 'q9',  pilar: 'Conversão', texto: 'As propostas são personalizadas para o caso de cada cliente?' },
  // CRM
  { id: 'q10', pilar: 'CRM',       texto: 'Você registra todos os contatos e oportunidades em um sistema (CRM)?' },
  { id: 'q11', pilar: 'CRM',       texto: 'Existe follow-up estruturado para quem recebeu proposta e não respondeu?' },
  { id: 'q12', pilar: 'CRM',       texto: 'Você mantém relacionamento com clientes antigos para gerar recorrência e indicação?' },
  // Gestão
  { id: 'q13', pilar: 'Gestão',    texto: 'Seus processos administrativos e financeiros são organizados?' },
  { id: 'q14', pilar: 'Gestão',    texto: 'A gestão de tempo e de prazos da equipe é previsível?' },
  { id: 'q15', pilar: 'Gestão',    texto: 'Você acompanha indicadores (custo por lead, taxa de conversão, faturamento por área)?' },
]

export const TOTAL_PERGUNTAS = PERGUNTAS.length

/** Arredonda para 1 casa sem os artefatos de ponto flutuante do JS. */
function umaCasa(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10) / 10
}

/**
 * Determinístico: as mesmas respostas produzem sempre os mesmos scores.
 * A média geral é calculada a partir das respostas brutas, não das médias já
 * arredondadas dos pilares — arredondar duas vezes acumularia erro.
 */
export function calcularScores(respostas: DiagnosticoRespostas): PillarScores {
  const aquisicao = (respostas.q1 + respostas.q2 + respostas.q3) / 3
  const triagem   = (respostas.q4 + respostas.q5 + respostas.q6) / 3
  const conversao = (respostas.q7 + respostas.q8 + respostas.q9) / 3
  const crm       = (respostas.q10 + respostas.q11 + respostas.q12) / 3
  const gestao    = (respostas.q13 + respostas.q14 + respostas.q15) / 3

  const media = (aquisicao + triagem + conversao + crm + gestao) / 5

  return {
    aquisicao: umaCasa(aquisicao),
    triagem: umaCasa(triagem),
    conversao: umaCasa(conversao),
    crm: umaCasa(crm),
    gestao: umaCasa(gestao),
    media: umaCasa(media),
  }
}

/**
 * O menor pilar é o gargalo. Em caso de empate vence o primeiro da ordem
 * do funil (Aquisição → Triagem → Conversão → CRM → Gestão): sem tráfego no
 * topo, resolver o fundo não muda o resultado.
 */
export function identificarGargalo(scores: PillarScores): string {
  const pilares = [
    { nome: 'Aquisição', valor: scores.aquisicao },
    { nome: 'Triagem',   valor: scores.triagem },
    { nome: 'Conversão', valor: scores.conversao },
    { nome: 'CRM',       valor: scores.crm },
    { nome: 'Gestão',    valor: scores.gestao },
  ]

  return pilares.reduce((menor, atual) =>
    atual.valor < menor.valor ? atual : menor
  ).nome
}

export function gerarMensagemWhatsapp(
  nome: string,
  gargalo: string,
  scores: PillarScores
): string {
  return [
    `Olá ${nome}!`,
    ``,
    `Analisamos seu diagnóstico: nota geral ${scores.media}/10.`,
    `O principal gargalo está em ${gargalo}.`,
    ``,
    `Podemos conversar sobre como resolver isso?`,
  ].join('\n')
}
