import type { DiagnosticoRespostas, PillarScores } from './types'

/**
 * Opção de resposta.
 *
 * `valor` é o nível de maturidade num mostrador de 0 a 100, mas o único número
 * que sai daqui é o inteiro 1..10 exigido pela constraint `respostas_validas`
 * (ver sql/schema.sql). Por isso todo `valor` do catálogo é múltiplo de 10:
 * `valorParaEscala` fica exata e duas opções só caem no mesmo balde quando têm
 * o MESMO valor — nunca por arredondamento. Antes disso, 80 e 75 viravam ambos
 * 8 e um escritório com 500 contatos pontuava igual a um com 70.
 *
 * `desconhecimento` marca a opção em que o respondente admite não saber o
 * próprio número ("Não sabemos", "Raramente sabemos"). É diferente de relatar
 * um estado ruim ("Tudo é manual", "Não existe padrão"), que é resposta honesta
 * e pontua acima. A regra que essa marca sustenta, válida nas 15 perguntas:
 * desconhecer nunca pode pontuar melhor que reportar um número ruim, senão o
 * formulário ensina a fugir da pergunta e contamina o pilar inteiro.
 *
 * `pilarAlvo` só existe na q15: liga a dor declarada ao pilar que ela aponta,
 * para ordenar o plano de ação em vez de virar nota.
 */
export type Opcao = {
  texto: string
  valor: number
  desconhecimento?: true
  pilarAlvo?: string
}

export type Pergunta = {
  id: keyof DiagnosticoRespostas
  /** Pilar do funil. Precisa casar com o trigger `aplicar_diagnostico`. */
  pilar: string
  /** Rótulo editorial exibido acima da pergunta. */
  bloco: string
  texto: string
  ajuda: string
  opcoes: Opcao[]
}

/**
 * 15 perguntas, 3 por pilar. O balanceamento importa: com um número desigual
 * de perguntas por pilar, o pilar mais curto oscila mais e distorce a escolha
 * do gargalo.
 *
 * A ordem dos ids é contratual. O trigger no Postgres soma q1..q3 como
 * Aquisição, q4..q6 como Triagem, q7..q9 como Conversão, q10..q12 como CRM e
 * q13..q15 como Gestão. Trocar um id de lugar aqui muda a nota gravada no
 * banco sem que nenhum teste de tipo reclame.
 */
export const PERGUNTAS: Pergunta[] = [
  // ---------------------------------------------------------------- Aquisição
  {
    id: 'q1',
    pilar: 'Aquisição',
    bloco: 'Aquisição',
    texto: 'De onde vêm hoje a maior parte dos novos clientes do escritório?',
    ajuda: 'Escolha a fonte predominante.',
    opcoes: [
      { texto: 'Indicações', valor: 40 },
      { texto: 'Google / busca orgânica', valor: 80 },
      { texto: 'Instagram / conteúdo', valor: 60 },
      { texto: 'Anúncios permitidos', valor: 70 },
      { texto: 'Parceiros / networking', valor: 50 },
      { texto: 'Não sabemos', valor: 20, desconhecimento: true },
    ],
  },
  {
    id: 'q2',
    pilar: 'Aquisição',
    bloco: 'Aquisição',
    texto: 'Quantos novos contatos o escritório recebe, em média, por mês?',
    ajuda: 'O objetivo é distinguir falta de demanda de vazamento operacional.',
    opcoes: [
      { texto: 'Até 10', valor: 40 },
      { texto: '11 a 30', valor: 60 },
      { texto: '31 a 60', valor: 70 },
      { texto: '61 a 100', valor: 80 },
      { texto: 'Mais de 100', valor: 90 },
      { texto: 'Não sabemos', valor: 20, desconhecimento: true },
    ],
  },
  {
    id: 'q3',
    pilar: 'Aquisição',
    bloco: 'Aquisição',
    texto: 'Você sabe qual canal está associado aos contratos, e não apenas aos contatos?',
    ajuda: 'Conectar origem a contrato evita avaliar marketing apenas por volume.',
    opcoes: [
      { texto: 'Sim', valor: 100 },
      { texto: 'Parcialmente', valor: 60 },
      { texto: 'Não', valor: 20 },
    ],
  },

  // ------------------------------------------------------------------ Triagem
  {
    id: 'q4',
    pilar: 'Triagem',
    bloco: 'Qualificação',
    texto: 'Dos contatos recebidos, quantos realmente têm aderência ao escritório?',
    ajuda: 'Aderência significa compatibilidade com área, critérios e capacidade operacional.',
    opcoes: [
      { texto: 'Mais de 70%', valor: 90 },
      { texto: '50% a 70%', valor: 80 },
      { texto: '30% a 50%', valor: 60 },
      { texto: 'Menos de 30%', valor: 30 },
      { texto: 'Não sabemos', valor: 20, desconhecimento: true },
    ],
  },
  {
    id: 'q5',
    pilar: 'Triagem',
    bloco: 'Atendimento',
    texto: 'Quem faz o primeiro atendimento?',
    ajuda:
      'Quanto mais cedo o advogado entra, maior pode ser o consumo de tempo técnico em tarefas administrativas.',
    // Recepção e Equipe específica empatavam em 90 e, com Assistente em 85, as
    // três viravam 9. Desempate: função dedicada e treinada > recepção com
    // roteiro > assistente que acumula a tarefa com outras. A ordem relativa
    // original é preservada; só a nota de Recepção e Assistente desceu um balde.
    opcoes: [
      { texto: 'Recepção / secretária com processo', valor: 80 },
      { texto: 'Assistente com processo', valor: 70 },
      { texto: 'Equipe específica', valor: 90 },
      { texto: 'O próprio advogado', valor: 40 },
      { texto: 'Depende do dia', valor: 30 },
      { texto: 'Não existe padrão', valor: 20 },
    ],
  },
  {
    id: 'q6',
    pilar: 'Triagem',
    bloco: 'Qualificação',
    texto: 'Existe um processo de triagem antes do contato chegar ao advogado?',
    ajuda: 'Triagem administrativa não substitui consulta nem análise jurídica.',
    opcoes: [
      { texto: 'Sim, estruturado', valor: 100 },
      { texto: 'Parcialmente', valor: 70 },
      { texto: 'Muito pouco', valor: 40 },
      { texto: 'Não existe', valor: 20 },
    ],
  },

  // ---------------------------------------------------------------- Conversão
  {
    id: 'q7',
    pilar: 'Conversão',
    bloco: 'Atendimento',
    texto:
      'Em horário comercial, quanto tempo o escritório costuma levar para dar a primeira resposta?',
    ajuda:
      'Não é aconselhamento jurídico; é recepção e orientação inicial do fluxo de atendimento.',
    opcoes: [
      { texto: 'Até 15 minutos', valor: 100 },
      { texto: '15 a 30 minutos', valor: 80 },
      { texto: '30 min a 1 hora', valor: 70 },
      { texto: '1 a 4 horas', valor: 50 },
      { texto: 'Mais de 4 horas', valor: 30 },
      { texto: 'Não existe padrão', valor: 20 },
    ],
  },
  {
    id: 'q8',
    pilar: 'Conversão',
    bloco: 'Conversão',
    texto: 'Existe um processo definido entre primeiro contato e contratação?',
    ajuda: 'Exemplo: contato → triagem → consulta → proposta → acompanhamento → contratação.',
    opcoes: [
      { texto: 'Sim, totalmente', valor: 100 },
      { texto: 'Parcialmente', valor: 70 },
      { texto: 'Depende do profissional', valor: 40 },
      { texto: 'Não existe', valor: 20 },
    ],
  },
  {
    id: 'q9',
    pilar: 'Conversão',
    bloco: 'Conversão',
    texto:
      'Quando um potencial cliente que já procurou o escritório não decide imediatamente, o que acontece?',
    ajuda:
      'Acompanhamento deve respeitar a relação já iniciada e os limites éticos aplicáveis.',
    opcoes: [
      { texto: 'Existe acompanhamento estruturado', valor: 100 },
      { texto: 'Alguém lembra manualmente', valor: 60 },
      { texto: 'Depende do advogado', valor: 50 },
      { texto: 'Esperamos ele retornar', valor: 30 },
      { texto: 'Normalmente perdemos o contato', valor: 10 },
    ],
  },

  // ---------------------------------------------------------------------- CRM
  {
    id: 'q10',
    pilar: 'CRM',
    bloco: 'CRM — Gestão de Relacionamento com Clientes',
    texto: 'Como vocês organizam as oportunidades?',
    ajuda:
      'CRM significa Customer Relationship Management — Gestão de Relacionamento com Clientes.',
    opcoes: [
      { texto: 'CRM usado de forma consistente', valor: 100 },
      { texto: 'CRM usado parcialmente', valor: 70 },
      { texto: 'Planilha', valor: 60 },
      { texto: 'WhatsApp', valor: 40 },
      { texto: 'Cada pessoa controla as próprias', valor: 30 },
      { texto: 'Não existe controle', valor: 10 },
    ],
  },
  {
    id: 'q11',
    pilar: 'CRM',
    bloco: 'Automação',
    texto: 'Quanto das tarefas repetitivas ainda depende de execução manual?',
    ajuda: 'Ex.: cadastro, confirmação, lembrete, tarefa, atualização e relatório.',
    opcoes: [
      { texto: 'Pouco; já automatizamos o essencial', valor: 90 },
      { texto: 'Parte relevante', valor: 60 },
      { texto: 'Quase tudo é manual', valor: 30 },
      { texto: 'Tudo é manual', valor: 20 },
      // Valia 35 e ficava acima de "Tudo é manual": quem admitia o problema
      // saía pior que quem fugia da pergunta.
      { texto: 'Não sabemos', valor: 10, desconhecimento: true },
    ],
  },
  {
    id: 'q12',
    pilar: 'CRM',
    bloco: 'Atendimento',
    texto:
      'Quanto tempo o advogado gasta por dia com triagem, respostas iniciais e organização de contatos?',
    ajuda:
      'Considere apenas atividades anteriores à análise jurídica que poderiam ser organizadas por processo.',
    opcoes: [
      { texto: 'Menos de 30 min', valor: 90 },
      { texto: '30 min a 1 hora', valor: 80 },
      { texto: '1 a 2 horas', valor: 50 },
      { texto: 'Mais de 2 horas', valor: 30 },
      // Mesmo defeito da q11: valia 35, acima de "Mais de 2 horas".
      { texto: 'Não sabemos', valor: 20, desconhecimento: true },
    ],
  },

  // ------------------------------------------------------------------- Gestão
  {
    id: 'q13',
    pilar: 'Gestão',
    bloco: 'Gestão',
    texto: 'O escritório sabe por que potenciais clientes não avançam?',
    ajuda: 'Motivos de perda tornam o gargalo mensurável.',
    opcoes: [
      { texto: 'Sim, registramos os motivos', valor: 100 },
      { texto: 'Temos boa percepção, mas sem registro', valor: 60 },
      { texto: 'Raramente sabemos', valor: 40, desconhecimento: true },
      { texto: 'Não sabemos', valor: 20, desconhecimento: true },
    ],
  },
  {
    id: 'q14',
    pilar: 'Gestão',
    bloco: 'Indicadores',
    texto: 'Qual é o nível atual de acompanhamento de indicadores?',
    ajuda:
      'Ex.: contatos, qualificação, comparecimento, conversão, ticket médio, CAC e motivos de perda.',
    opcoes: [
      { texto: 'Acompanhamos vários indicadores de forma recorrente', valor: 100 },
      { texto: 'Acompanhamos alguns', valor: 70 },
      { texto: 'Apenas volume de contatos / contratos', valor: 40 },
      { texto: 'Quase nenhum', valor: 20 },
      { texto: 'Nenhum', valor: 10 },
    ],
  },
  /**
   * A q15 é percepção declarada, não maturidade medida. Ela tem dois papéis,
   * deliberadamente separados:
   *
   * 1. Como NOTA, mede a única maturidade que essa pergunta consegue medir de
   *    verdade: o escritório sabe apontar onde dói? Apontar uma dor específica
   *    sem indicador que a comprove vale o mesmo que a q13 dá a "boa percepção,
   *    mas sem registro" (60); não saber onde está o problema é um buraco de
   *    gestão (20). As nove dores empatam de propósito — não existe ranking de
   *    maturidade entre "poucos contatos" e "falta de CRM", e inventar um
   *    fabricaria julgamento clínico que ninguém sustenta. Valia 70 para todas,
   *    o que inflava o pilar Gestão de graça.
   *
   * 2. Como CONTEÚDO, a dor escolhida aponta um pilar (`pilarAlvo`) e ordena o
   *    plano de ação — ver `prioridadesDoPlano`. É aqui que "sua percepção será
   *    cruzada com as respostas anteriores" deixa de ser promessa: escolher
   *    "Poucos contatos" e escolher "Falta de CRM" passam a produzir planos
   *    diferentes. A identidade exata da opção vem do índice em `escolhas_json`,
   *    que já é gravado — nenhuma coluna nova é necessária.
   *
   * Por que ela continua entrando na média do pilar: tirá-la deixaria Gestão
   * com 2 perguntas (quebrando a simetria de 3 por pilar que sustenta o
   * desempate do gargalo) e faria a nota da tela divergir da que o trigger
   * `aplicar_diagnostico` grava a partir de q13+q14+q15.
   */
  {
    id: 'q15',
    pilar: 'Gestão',
    bloco: 'Prioridade',
    texto: 'Qual problema parece mais urgente hoje?',
    ajuda: 'Sua percepção ordena o plano de ação e é cruzada com as respostas anteriores.',
    opcoes: [
      { texto: 'Dependência de indicação', valor: 60, pilarAlvo: 'Aquisição' },
      { texto: 'Poucos contatos', valor: 60, pilarAlvo: 'Aquisição' },
      { texto: 'Contatos pouco aderentes', valor: 60, pilarAlvo: 'Triagem' },
      { texto: 'Advogado preso na triagem', valor: 60, pilarAlvo: 'Triagem' },
      { texto: 'WhatsApp desorganizado', valor: 60, pilarAlvo: 'CRM' },
      { texto: 'Poucas contratações', valor: 60, pilarAlvo: 'Conversão' },
      { texto: 'Falta de acompanhamento', valor: 60, pilarAlvo: 'Conversão' },
      { texto: 'Falta de CRM / automação', valor: 60, pilarAlvo: 'CRM' },
      { texto: 'Falta de indicadores', valor: 60, pilarAlvo: 'Gestão' },
      { texto: 'Não sabemos onde está o problema', valor: 20, desconhecimento: true },
    ],
  },
]

/** Pergunta de percepção: a única cuja escolha ordena em vez de rankear. */
export const ID_PRIORIDADE_DECLARADA = 'q15'

export const TOTAL_PERGUNTAS = PERGUNTAS.length

/**
 * Converte a maturidade de 0..100 no inteiro 1..10 que o banco aceita.
 * A constraint `respostas_validas` rejeita decimais e valores fora da faixa,
 * então o clamp aqui não é decorativo: sem ele o INSERT falha inteiro.
 *
 * Continua arredondando porque também recebe valores fora do catálogo (a tela
 * usa 50 para pergunta não respondida). Para as opções catalogadas o
 * arredondamento virou identidade: como todo `valor` é múltiplo de 10, opções
 * com maturidades diferentes caem sempre em baldes diferentes.
 */
export function valorParaEscala(valor: number): number {
  return Math.min(10, Math.max(1, Math.round(valor / 10)))
}

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

/**
 * Pilar apontado pela dor declarada na q15, a partir do índice já gravado em
 * `escolhas_json`. Devolve null quando não há escolha registrada, quando o
 * índice não existe ou quando a opção marcada é "não sabemos onde está o
 * problema" — que, justamente, não aponta nada.
 */
export function pilarDaPrioridadeDeclarada(
  indice: number | null | undefined
): string | null {
  if (indice == null) return null
  const pergunta = PERGUNTAS.find((p) => p.id === ID_PRIORIDADE_DECLARADA)
  return pergunta?.opcoes[indice]?.pilarAlvo ?? null
}

/**
 * Os três pilares mais fracos, do pior para o menos pior. É a ordem do plano
 * de ação: o gargalo principal é sempre o primeiro item.
 *
 * `prioridadeDeclarada` é o pilar apontado pela q15 (use
 * `pilarDaPrioridadeDeclarada`). Ela desempata, nunca decide: só reordena
 * pilares com a MESMA nota e nunca desloca do topo o gargalo medido. Percepção
 * que contraria o número não pode reescrever o número — mas onde o número é
 * indiferente, começar pelo que o escritório já sente é mais útil do que
 * deixar a ordem fixa do funil decidir sozinha.
 *
 * O empate remanescente resolve pela ordem do funil (Aquisição → Triagem →
 * Conversão → CRM → Gestão), a mesma regra de `identificarGargalo`: corrigir
 * uma etapa adiante sem resolver a anterior só empurra o problema.
 */
export function prioridadesDoPlano(
  scores: PillarScores,
  prioridadeDeclarada?: string | null
): string[] {
  // Fixar o gargalo em primeiro mantém a tela alinhada com o
  // gargalo_principal que o trigger grava, que não conhece a q15.
  const gargalo = identificarGargalo(scores)

  const pilares: [string, number][] = [
    ['Aquisição', scores.aquisicao],
    ['Triagem', scores.triagem],
    ['Conversão', scores.conversao],
    ['CRM', scores.crm],
    ['Gestão', scores.gestao],
  ]

  return pilares
    .map(([nome, valor], ordem) => ({
      nome,
      valor,
      // 0 gargalo medido, 1 dor declarada, 2 o resto. Só vale dentro do empate.
      peso: nome === gargalo ? 0 : nome === prioridadeDeclarada ? 1 : 2,
      ordem,
    }))
    .sort((a, b) => a.valor - b.valor || a.peso - b.peso || a.ordem - b.ordem)
    .slice(0, 3)
    .map((p) => p.nome)
}

/**
 * Texto da opção marcada pelo visitante.
 *
 * Prefere o índice gravado em `escolhas_json`, que é exato. Só quando ele não
 * existe — diagnósticos anteriores a essa coluna — cai na busca pela escala.
 * Hoje a única pergunta ambígua é a q15, cujas nove dores empatam de propósito;
 * nela a busca devolve a primeira correspondente, que pode não ser a marcada.
 */
export function opcaoRespondida(
  pergunta: Pergunta,
  escala: number,
  indice?: number | null,
): string | null {
  if (indice != null && pergunta.opcoes[indice]) {
    return pergunta.opcoes[indice].texto
  }
  const op = pergunta.opcoes.find((o) => valorParaEscala(o.valor) === escala)
  return op ? op.texto : null
}

/** Verdadeiro quando a escala sozinha não identifica a opção marcada. */
export function escalaAmbigua(pergunta: Pergunta, escala: number): boolean {
  return pergunta.opcoes.filter((o) => valorParaEscala(o.valor) === escala).length > 1
}

/** Rótulo longo de cada pilar, para a tela de resultado. */
export const ROTULO_PILAR: Record<string, string> = {
  Aquisição: 'Aquisição & Posicionamento',
  Triagem: 'Atendimento & Triagem',
  Conversão: 'Conversão & Acompanhamento',
  CRM: 'CRM & Automação',
  Gestão: 'Gestão & Indicadores',
}

/** Leitura do gargalo dominante. */
export const DIAGNOSTICO_GARGALO: Record<string, { titulo: string; texto: string }> = {
  Aquisição: {
    titulo: 'Aquisição e posicionamento',
    texto:
      'Seu escritório apresenta maior fragilidade na geração, origem ou qualidade da demanda. O plano deve começar por clareza de posicionamento, canais e mensuração antes de ampliar investimento.',
  },
  Triagem: {
    titulo: 'Atendimento e triagem',
    texto:
      'O maior vazamento está antes da consulta: tempo do advogado, qualidade da recepção, velocidade e critérios de qualificação precisam ser organizados.',
  },
  Conversão: {
    titulo: 'Conversão e acompanhamento',
    texto:
      'O escritório recebe oportunidades, mas a passagem entre consulta, proposta, retorno e contratação não está suficientemente estruturada.',
  },
  CRM: {
    titulo: 'CRM e automação',
    texto:
      'O controle depende demais de WhatsApp, planilhas ou tarefas manuais. O primeiro movimento é estruturar pipeline, responsáveis e automações administrativas.',
  },
  Gestão: {
    titulo: 'Gestão e indicadores',
    texto:
      'O escritório não enxerga com clareza o que acontece entre origem, oportunidade e contrato. Sem dados, marketing e atendimento ficam difíceis de otimizar.',
  },
}

/** Plano de ação por pilar, exibido em ordem de prioridade. */
export const PLANO_ACAO: Record<string, { titulo: string; itens: string[] }> = {
  Aquisição: {
    titulo: 'Posicionamento & Demanda',
    itens: [
      'Revisar áreas e públicos prioritários',
      'Analisar Instagram, site e presença em busca',
      'Definir canais permitidos e critérios de mensuração',
    ],
  },
  Triagem: {
    titulo: 'Triagem & Atendimento',
    itens: [
      'Criar roteiro administrativo de primeiro atendimento',
      'Definir o que deve chegar ao advogado',
      'Padronizar resposta, agendamento e coleta inicial',
    ],
  },
  Conversão: {
    titulo: 'Acompanhamento & Conversão',
    itens: [
      'Mapear etapas entre consulta e contratação',
      'Definir tarefas e cadências de acompanhamento',
      'Registrar motivos de perda e pontos de fuga',
    ],
  },
  CRM: {
    titulo: 'CRM & Automação',
    itens: [
      'Implementar ou corrigir pipeline no CRM',
      'Definir responsáveis, tarefas e alertas',
      'Automatizar confirmações, lembretes e relatórios administrativos',
    ],
  },
  Gestão: {
    titulo: 'Gestão por Indicadores',
    itens: [
      'Conectar origem a oportunidade e contrato',
      'Acompanhar qualificação, comparecimento e conversão',
      'Criar dashboard com CAC, ticket e motivos de perda',
    ],
  },
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
