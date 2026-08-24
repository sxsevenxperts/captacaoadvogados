/**
 * Calculadora de CAC / LTV.
 *
 * Fórmulas padrão de mercado:
 *   CAC   = investimento total de aquisição ÷ novos clientes no período
 *   LTV   = ticket médio × margem de contribuição × casos por cliente
 *   Razão = LTV ÷ CAC   (referência saudável: 3:1)
 *
 * Referências:
 *   https://www.paddle.com/resources/cac-ltv-ratio
 *   https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/
 *   https://www.chargebee.com/resources/glossaries/ltv-cac-ratio/
 */

/** Razão LTV:CAC considerada saudável pelo mercado. */
export const RAZAO_ALVO = 3

export type CacInputs = {
  /** Soma mensal de marketing + comercial: mídia, equipe, ferramentas, agência. */
  investimentoMensal: number
  /** Novos clientes fechados no mesmo período do investimento. */
  novosClientes: number
  /** Honorário médio total por cliente (não mensal). */
  ticketMedio: number
  /** Margem de contribuição, de 0 a 1. Serviços jurídicos: tipicamente 0,5–0,7. */
  margem: number
  /** Casos por cliente ao longo da relação. 1 = sem recorrência. */
  casosPorCliente: number
}

export type CacResultado = {
  cac: number
  ltv: number
  razao: number
  /** Lucro por cliente já descontado o custo de aquisição. */
  lucroPorCliente: number
  /** Teto de CAC que ainda mantém a razão saudável de 3:1. */
  cacMaximoSaudavel: number
  veredito: 'PREJUIZO' | 'APERTADO' | 'SAUDAVEL' | 'SUBINVESTINDO'
  mensagem: string
}

/** Arredonda para 2 casas sem os artefatos de ponto flutuante do JS. */
function duasCasas(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Retorna null quando faltam entradas ou quando um divisor é zero — o chamador
 * decide como apresentar. Nunca devolve Infinity nem NaN.
 */
export function calcularCac(inputs: Partial<CacInputs>): CacResultado | null {
  const {
    investimentoMensal,
    novosClientes,
    ticketMedio,
    margem,
    casosPorCliente,
  } = inputs

  const preenchido = [
    investimentoMensal,
    novosClientes,
    ticketMedio,
    margem,
    casosPorCliente,
  ].every((v) => typeof v === 'number' && Number.isFinite(v))

  if (!preenchido) return null
  if (novosClientes! <= 0) return null
  if (ticketMedio! <= 0 || casosPorCliente! <= 0) return null
  if (margem! <= 0 || margem! > 1) return null

  const cac = investimentoMensal! / novosClientes!
  const ltv = ticketMedio! * margem! * casosPorCliente!
  const razao = cac === 0 ? Infinity : ltv / cac
  const lucroPorCliente = ltv - cac
  const cacMaximoSaudavel = ltv / RAZAO_ALVO

  let veredito: CacResultado['veredito']
  let mensagem: string

  if (razao < 1) {
    veredito = 'PREJUIZO'
    mensagem =
      'Cada cliente custa mais do que gera de margem. A captação está destruindo caixa.'
  } else if (razao < RAZAO_ALVO) {
    veredito = 'APERTADO'
    mensagem =
      'A operação se paga, mas a margem é fina. A referência de mercado é 3:1.'
  } else if (razao <= 5) {
    veredito = 'SAUDAVEL'
    mensagem = 'Relação saudável entre custo de aquisição e valor do cliente.'
  } else {
    veredito = 'SUBINVESTINDO'
    mensagem =
      'A margem é alta e o investimento é baixo: há espaço para acelerar a captação.'
  }

  return {
    cac: duasCasas(cac),
    ltv: duasCasas(ltv),
    razao: razao === Infinity ? Infinity : duasCasas(razao),
    lucroPorCliente: duasCasas(lucroPorCliente),
    cacMaximoSaudavel: duasCasas(cacMaximoSaudavel),
    veredito,
    mensagem,
  }
}

export function formatarReal(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
