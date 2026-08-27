'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { criarClientePublico } from '@/lib/supabase/client'
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  calcularScores,
  identificarGargalo,
  valorParaEscala,
} from '@/lib/diagnosis'
import type { DiagnosticoRespostas, PillarScores } from '@/lib/types'
import './landing.css'

const WA_BASE = 'https://wa.me/5588992138011'
const WA_PADRAO = `${WA_BASE}?text=${encodeURIComponent(
  'Olá! Sou advogado(a)/escritório de advocacia e quero entender como a Seven Xperts pode estruturar minha operação.'
)}`
// Agenda da Reunião de Diagnóstico: onde houver CTA de agendamento, aponta aqui.
const AGENDA = 'https://calendar.google.com/calendar/u/5?cid=c2V2ZW54cGVydHNzeGFjYWRlbXlAZ21haWwuY29t'
const INSTAGRAM = 'https://instagram.com/sevenxperts'

const AREAS = [
  'Família e Sucessões', 'Previdenciário', 'Trabalhista', 'Empresarial',
  'Tributário', 'Imobiliário', 'Cível', 'Consumidor',
  'Bancário', 'Criminal', 'Administrativo', 'Atuação multidisciplinar',
]
const MAX_AREAS = 3

const RX_ITENS = [
  'O WhatsApp concentra quase todo o controle dos contatos.',
  'O próprio advogado faz grande parte da triagem inicial.',
  'Não existe processo claro de acompanhamento após a consulta.',
  'O escritório não registra por que oportunidades não avançam.',
  'Cada pessoa atende de uma maneira diferente.',
  'Não sabemos qual canal está associado a cada contrato.',
  'Consultas são agendadas sem informações suficientes.',
  'O marketing é medido mais por contatos do que por contratos.',
  'Tarefas repetitivas dependem da memória da equipe.',
  'O relacionamento com o cliente termina junto com o serviço.',
]

const DORES = [
  {
    n: '01', titulo: 'Contato sem triagem',
    texto: 'O advogado entra cedo demais em conversas que poderiam ser organizadas administrativamente antes da análise jurídica.',
    implicacao: 'Tempo técnico consumido, atendimento irregular e pouca clareza sobre quais demandas têm aderência ao escritório.',
  },
  {
    n: '02', titulo: 'Oportunidades esquecidas',
    texto: 'Consulta, documentação, proposta e retorno ficam espalhados entre WhatsApp, agenda e memória da equipe.',
    implicacao: 'Oportunidades que já procuraram o escritório podem parar sem próximo passo definido ou registro do motivo de perda.',
  },
  {
    n: '03', titulo: 'Marketing sem contratos',
    texto: 'O escritório acompanha alcance, mensagens e contatos, mas não conecta origem, qualificação, consulta e contratação.',
    implicacao: 'Fica difícil saber quais canais contribuem para oportunidades aderentes e onde o investimento deve ser corrigido.',
  },
  {
    n: '04', titulo: 'Dependência de indicação',
    texto: 'A indicação continua importante, mas quando é a única fonte relevante de demanda o fluxo se torna pouco controlável.',
    implicacao: 'Meses fortes e fracos sem clareza sobre quais ações aumentam descoberta, autoridade e relacionamento.',
  },
]

const PROBLEMAS = [
  ['01', 'Dependência de indicação', 'Fluxo de novas oportunidades oscila e o escritório não possui visão clara de outras fontes de descoberta.', 'Posicionamento, presença digital, conteúdo informativo e mensuração dos canais permitidos.'],
  ['02', 'Advogado na triagem', 'O profissional de maior valor técnico gasta tempo com coleta inicial e organização administrativa.', 'Formulário, chatbot auxiliar, roteiro de triagem e passagem contextualizada ao advogado.'],
  ['03', 'WhatsApp como CRM', 'Conversas substituem gestão e oportunidades ficam sem etapa, responsável ou próximo passo.', 'CRM — Gestão de Relacionamento com Clientes — com pipeline, tarefas e histórico.'],
  ['04', 'Resposta irregular', 'Audiências, reuniões e produção jurídica tornam a velocidade de resposta dependente da agenda.', 'Recepção estruturada, distribuição, alertas e automações administrativas.'],
  ['05', 'Consulta sem contexto', 'O advogado chega à conversa sem informações mínimas previamente organizadas.', 'Pré-coleta de assunto, localidade, documentos e dados administrativos pertinentes.'],
  ['06', 'Sem acompanhamento', '“Vou pensar” ou “vou enviar documentos” fica dependente da memória da equipe.', 'Cadência ética de tarefas e acompanhamento de quem já iniciou relação com o escritório.'],
  ['07', 'Não comparecimento', 'Horários são reservados e perdidos por falta de confirmação e lembrete.', 'Agendamento organizado, confirmações, lembretes e reagendamento.'],
  ['08', 'Perdas sem causa', 'O escritório presume que perdeu por preço, mas não registra o motivo real.', 'Motivos de perda padronizados e dashboard — painel de indicadores.'],
  ['09', 'Marketing desconectado', 'Cliques e contatos são medidos, mas não a jornada até qualificação, consulta e contrato.', 'Integração entre origem, CRM, etapas e resultado comercial.'],
  ['10', 'Cliente encerrado', 'O relacionamento termina junto com o serviço, reduzindo lembrança institucional.', 'Pós-atendimento, organização da experiência e relacionamento permitido.'],
]

const TRANSFORMACOES = [
  ['WhatsApp concentra tudo', 'CRM organiza oportunidades, tarefas e responsáveis'],
  ['Advogado tria todos os contatos', 'Triagem administrativa organiza antes da análise jurídica'],
  ['Cada pessoa atende de um jeito', 'Playbook — manual operacional — e scripts padronizam o processo'],
  ['Retornos dependem da memória', 'Cadências e tarefas definem o próximo passo'],
  ['Marketing mede contatos', 'Origem é conectada a qualificação, consulta e contrato'],
  ['Não sabemos por que não contratam', 'Motivos de perda passam a ser registrados'],
  ['Tarefas repetitivas são manuais', 'Automações reduzem retrabalho administrativo'],
  ['Cliente some após o serviço', 'Pós-atendimento fortalece experiência, lembrança e reputação'],
]

const SERVICOS = [
  ['Diagnóstico 360°', 'Digital, marketing jurídico, atendimento, triagem, CRM, acompanhamento, automação, conversão e indicadores.'],
  ['CRM + Pipeline', 'Implementação da Gestão de Relacionamento com Clientes, etapas, automações, tarefas, responsáveis e treinamento.'],
  ['Consultoria Comercial-Operacional', 'Scripts, playbook — manual operacional —, triagem, acompanhamento, gestão e correção de gargalos.'],
  ['Marketing Jurídico', 'Posicionamento, estratégia, presença digital e conteúdo informativo alinhados às normas profissionais.'],
  ['Google Ads dentro das regras aplicáveis', 'Estratégias de palavra-chave responsivas à busca iniciada pelo potencial cliente, com comunicação ética e informativa.'],
  ['Landing Pages Informativas', 'Páginas por área ou tema com conteúdo sóbrio, canais de contato, formulários e integração com CRM.'],
  ['Conteúdo Estratégico', 'Planejamento de conteúdo técnico-informativo para consolidar posicionamento e tornar a atuação compreensível.'],
  ['Automação', 'Formulários, agenda, CRM, WhatsApp, tarefas, lembretes e relatórios — sem automatizar aconselhamento jurídico.'],
  ['Dashboard de Gestão', 'Painel com origem, qualificação, comparecimento, conversão, tempo de resposta, CAC e motivos de perda.'],
]

const INDICADORES = [
  ['Origem dos contratos', 'Quais canais estão associados às oportunidades e contratações.'],
  ['Tempo de resposta', 'Quanto tempo existe entre contato e recepção inicial.'],
  ['Taxa de qualificação', 'Percentual de contatos que possuem aderência aos critérios definidos.'],
  ['Comparecimento', 'Percentual das consultas agendadas que realmente acontecem.'],
  ['Taxa de conversão', 'Percentual das oportunidades qualificadas que avançam para contratação.'],
  ['Motivos de perda', 'Por que oportunidades param e em qual etapa.'],
  ['CAC', 'Custo de Aquisição de Cliente: investimento médio para conquistar um novo cliente por canais mensuráveis.'],
  ['Ticket médio', 'Valor médio dos contratos celebrados pelo escritório.'],
  ['LTV', 'Lifetime Value — Valor do Cliente ao Longo do Relacionamento, quando aplicável ao modelo de atuação.'],
]

const SIGLAS = [
  ['CRM', 'Customer Relationship Management — Gestão de Relacionamento com Clientes.'],
  ['CAC', 'Custo de Aquisição de Cliente — investimento médio necessário para conquistar um novo cliente.'],
  ['LTV', 'Lifetime Value — Valor do Cliente ao Longo do Relacionamento.'],
  ['SEO', 'Search Engine Optimization — Otimização para Mecanismos de Busca.'],
  ['OAB', 'Ordem dos Advogados do Brasil.'],
  ['CAACE', 'Caixa de Assistência dos Advogados do Ceará.'],
]

type Etapa = 'intro' | 'perguntas' | 'resultado'

type Contato = {
  nome: string; email: string; whatsapp: string
  cidade: string; instagram: string; site: string; areas: string[]
}

const CONTATO_VAZIO: Contato = {
  nome: '', email: '', whatsapp: '', cidade: '', instagram: '', site: '', areas: [],
}

function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number.isFinite(v) ? v : 0)
}

export default function LandingPage() {
  // createClient lanca se as NEXT_PUBLIC_* faltarem no build. Sem esta guarda,
  // um deploy sem as variaveis derruba a landing inteira em vez de apenas
  // impedir o envio do diagnostico.
  const supabase = useMemo(() => {
    try {
      return criarClientePublico()
    } catch (e) {
      console.error('[diagnostico] Supabase indisponivel:', e)
      return null
    }
  }, [])

  const [fotoOk, setFotoOk] = useState(true)

  /* ----------------------------------------------------------------- nav -- */
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* -------------------------------------------------------------- reveal -- */
  useEffect(() => {
    const alvos = Array.from(document.querySelectorAll('.reveal'))
    if (!('IntersectionObserver' in window)) {
      alvos.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.08 }
    )
    alvos.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  /* -------------------------------------------------------------- raio-x -- */
  const [rx, setRx] = useState<boolean[]>(() => RX_ITENS.map(() => false))
  const rxTotal = rx.filter(Boolean).length
  const rxLeitura =
    rxTotal >= 6
      ? { nivel: 'Gargalos relevantes', msg: 'A operação apresenta vários pontos de dependência manual ou perda de visibilidade. Corrigir processos antes de escalar demanda tende a ser prioritário.' }
      : rxTotal >= 3
        ? { nivel: 'Atenção operacional', msg: 'Há sinais de vazamentos entre atendimento, acompanhamento e gestão. Vale priorizar processos e indicadores.' }
        : rxTotal > 0
          ? { nivel: 'Estrutura mais madura', msg: 'Poucos sintomas marcados. O diagnóstico completo ajuda a identificar gargalos menos visíveis.' }
          : { nivel: 'Sem diagnóstico ainda', msg: 'Marque o que acontece hoje para visualizar o nível inicial de atenção.' }

  /* ----------------------------------------------------------------- cac -- */
  const [cac, setCac] = useState({
    marketing: '3000', operacao: '1000', clientes: '8', ticket: '4000', margem: '60',
  })
  // Os campos já nascem preenchidos como exemplo. Sem esta trava, o diagnóstico
  // gravaria os números de demonstração como se fossem do escritório.
  const [cacTocado, setCacTocado] = useState(false)
  const mudarCac = (campo: keyof typeof cac, valor: string) => {
    setCacTocado(true)
    setCac((c) => ({ ...c, [campo]: valor }))
  }
  const cacCalc = useMemo(() => {
    const mk = Math.max(0, parseFloat(cac.marketing) || 0)
    const op = Math.max(0, parseFloat(cac.operacao) || 0)
    const cl = Math.max(1, parseFloat(cac.clientes) || 1)
    const tk = Math.max(0, parseFloat(cac.ticket) || 0)
    const mg = Math.min(100, Math.max(0, parseFloat(cac.margem) || 0))
    const valor = (mk + op) / cl
    const razao = tk > 0 ? (valor / tk) * 100 : 0
    const depois = tk * (mg / 100) - valor
    return { valor, razao, depois }
  }, [cac])

  /* --------------------------------------------------------- diagnóstico -- */
  const shell = useRef<HTMLDivElement>(null)
  const [etapa, setEtapa] = useState<Etapa>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [respostas, setRespostas] = useState<(number | null)[]>(
    () => PERGUNTAS.map(() => null)
  )
  const [contato, setContato] = useState<Contato>(CONTATO_VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{
    scores: PillarScores; gargalo: string; total: number; linkWhatsapp: string
  } | null>(null)

  const rolarParaTopo = useCallback(() => {
    shell.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  function alternarArea(area: string) {
    setContato((c) => {
      if (c.areas.includes(area)) {
        return { ...c, areas: c.areas.filter((a) => a !== area) }
      }
      if (c.areas.length >= MAX_AREAS) return c
      return { ...c, areas: [...c.areas, area] }
    })
  }

  /** Espelha a constraint `dados_contato_validos` do schema. */
  function validarIntro(): string {
    const nome = contato.nome.trim()
    const email = contato.email.trim()
    const digitos = contato.whatsapp.replace(/\D/g, '')
    if (nome.length < 2 || nome.length > 200) return 'Informe o nome do advogado ou escritório.'
    if (email.length < 3 || email.indexOf('@') < 1) return 'Informe um e-mail válido.'
    if (digitos.length < 8 || digitos.length > 15) return 'Informe um WhatsApp válido, com DDD.'
    if (!contato.cidade.trim()) return 'Informe a cidade e o estado.'
    if (contato.areas.length === 0) return 'Selecione ao menos uma área de atuação.'
    return ''
  }

  function iniciar() {
    const problema = validarIntro()
    setErro(problema)
    if (problema) return
    setQIndex(0)
    setEtapa('perguntas')
    rolarParaTopo()
  }

  function responder(indice: number) {
    setRespostas((r) => {
      const copia = [...r]
      copia[qIndex] = indice
      return copia
    })
    setErro('')
  }

  async function avancar() {
    if (respostas[qIndex] === null) {
      setErro('Escolha uma opção para continuar.')
      return
    }
    if (qIndex < TOTAL_PERGUNTAS - 1) {
      setQIndex((i) => i + 1)
      setErro('')
      rolarParaTopo()
      return
    }
    await finalizar()
  }

  async function finalizar() {
    setErro('')
    setEnviando(true)

    // O banco só aceita q1..q15 como inteiros de 1 a 10 (respostas_validas).
    const brutas = Object.fromEntries(
      PERGUNTAS.map((p, i) => {
        const escolha = respostas[i]
        const valor = escolha === null ? 50 : p.opcoes[escolha].valor
        return [p.id, valorParaEscala(valor)]
      })
    ) as unknown as DiagnosticoRespostas

    // Nota e gargalo saem do mesmo cálculo que o trigger faz no Postgres,
    // então a tela e o painel do admin nunca divergem.
    const scores = calcularScores(brutas)
    const gargalo = identificarGargalo(scores)
    const total = Math.round(scores.media * 10)

    try {
      const local = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')
      if (!local && !supabase) {
        setErro('Cadastro indisponível no momento. Fale conosco pelo WhatsApp.')
        setEnviando(false)
        return
      }
      if (!local && supabase) {
        // Sem .select(): o visitante anônimo tem INSERT, não SELECT.
        // nota_geral e gargalo_principal são preenchidos pelo trigger.
        const { error } = await supabase.from('diagnosticos').insert({
          nome: contato.nome.trim(),
          email: contato.email.trim(),
          whatsapp: contato.whatsapp.trim(),
          instagram: contato.instagram.trim() || null,
          site: contato.site.trim() || null,
          cidade: contato.cidade.trim() || null,
          area: contato.areas.join(', ') || null,
          respostas_json: brutas,
          // Só grava o CAC se o visitante realmente calculou o dele.
          // A constraint cac_valores_positivos exige margem entre 0 e 1.
          cac_investimento_mensal: cacTocado
            ? Math.max(0, (parseFloat(cac.marketing) || 0) + (parseFloat(cac.operacao) || 0))
            : null,
          cac_novos_clientes: cacTocado
            ? Math.max(0, Math.round(parseFloat(cac.clientes) || 0))
            : null,
          cac_ticket_medio: cacTocado ? Math.max(0, parseFloat(cac.ticket) || 0) : null,
          cac_margem: cacTocado
            ? Math.min(1, Math.max(0, (parseFloat(cac.margem) || 0) / 100))
            : null,
        })
        if (error) {
          // Sem isto, uma constraint ou trigger ausente vira só "tente
          // novamente" e não há como descobrir a causa a partir do navegador.
          console.error('[diagnostico] INSERT recusado pelo Supabase:', error)
          setErro('Não foi possível registrar o diagnóstico. Tente novamente.')
          setEnviando(false)
          return
        }
      }
    } catch (e) {
      console.error('[diagnostico] falha de rede ao registrar:', e)
      setErro('Não foi possível registrar o diagnóstico. Tente novamente.')
      setEnviando(false)
      return
    }

    const resumo = [
      'Olá! Fiz o Diagnóstico 360° para Advocacia no site da Seven Xperts.',
      `Escritório/Advogado: ${contato.nome.trim()}`,
      `Cidade: ${contato.cidade.trim()}`,
      `Áreas: ${contato.areas.join(', ')}`,
      contato.instagram.trim() ? `Instagram: ${contato.instagram.trim()}` : '',
      contato.site.trim() ? `Site: ${contato.site.trim()}` : '',
      'Respondi as 15 perguntas e quero agendar a apresentação do diagnóstico.',
    ].filter(Boolean).join('\n')

    setResultado({
      scores, gargalo, total,
      linkWhatsapp: `${WA_BASE}?text=${encodeURIComponent(resumo)}`,
    })
    setEnviando(false)
    setEtapa('resultado')
    rolarParaTopo()
  }

  function refazer() {
    setRespostas(PERGUNTAS.map(() => null))
    setQIndex(0)
    setResultado(null)
    setErro('')
    setEtapa('intro')
    rolarParaTopo()
  }

  const progresso =
    etapa === 'intro' ? 0
      : etapa === 'resultado' ? 100
        : Math.round(((qIndex + 1) / (TOTAL_PERGUNTAS + 1)) * 100)
  const rotuloProgresso =
    etapa === 'intro' ? 'Dados iniciais'
      : etapa === 'resultado' ? 'Registrado'
        : `Pergunta ${qIndex + 1} de ${TOTAL_PERGUNTAS}`

  const pergunta = PERGUNTAS[qIndex]

  return (
    <div className="sx-root">
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <a className="brand" href="#top"><span className="dot" />SEVEN XPERTS</a>
        <nav className="nav-links">
          <a href="#dores">Dores</a>
          <a href="#diagnostico">Diagnóstico</a>
          <a href="#metodo">Ampulheta</a>
          <a href="#operacao">Operação</a>
          <a href="#servicos">Serviços</a>
          <a className="btn btn-primary" href={WA_PADRAO} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </nav>
      </header>

      <main id="top">
        {/* ------------------------------------------------------------ HERO */}
        <section className="hero wrap">
          <div className="hero-grid">
            <div className="reveal in">
              <span className="eyebrow">Marketing Jurídico · Atendimento · CRM · Automação</span>
              <h1>
                Seu escritório pode não perder contratos<br />
                por falta de conhecimento jurídico.<br />
                <em className="grad-text">Pode perder por operação.</em>
              </h1>
              <p className="lead">
                Estruturamos a jornada entre ser encontrado, organizar o primeiro contato,
                qualificar, acompanhar e medir oportunidades — sem transformar a advocacia
                em comércio e preservando a atuação jurídica do advogado.
              </p>
              <div className="hero-cta">
                <a className="btn btn-primary" href="#diagnostico">
                  Fazer Diagnóstico 360°
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
                <a className="btn btn-ghost" href={WA_PADRAO} target="_blank" rel="noopener noreferrer">Falar com a Seven Xperts</a>
              </div>
              <div className="hero-meta">
                <span>Advogados e escritórios</span><span>Operação integrada</span><span>Desde 2019</span>
              </div>
            </div>

            <div className="glass-wrap reveal in">
              <svg className="glass" viewBox="0 0 220 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ampulheta de vendas adaptada à advocacia">
                <defs>
                  <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#06302C" />
                    <stop offset=".5" stopColor="#1FD8C4" />
                    <stop offset="1" stopColor="#C6FF3A" />
                  </linearGradient>
                  <linearGradient id="gsweep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#C6FF3A" stopOpacity="0" />
                    <stop offset=".5" stopColor="#C6FF3A" stopOpacity=".9" />
                    <stop offset="1" stopColor="#C6FF3A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M34 26 H186 L120 170 L186 314 H34 L100 170 Z" fill="url(#gg)" opacity=".92" />
                <path d="M34 26 H186 L120 170 L186 314 H34 L100 170 Z" fill="none" stroke="#1FD8C4" strokeOpacity=".55" strokeWidth="1.4" />
                <line x1="24" y1="26" x2="196" y2="26" stroke="#C6FF3A" strokeOpacity=".8" strokeWidth="2.4" />
                <line x1="24" y1="314" x2="196" y2="314" stroke="#C6FF3A" strokeOpacity=".8" strokeWidth="2.4" />
                <circle className="grain" cx="110" cy="0" r="2.4" fill="#EAF3EC" />
                <circle className="grain b" cx="106" cy="0" r="1.8" fill="#C6FF3A" />
                <circle className="grain c" cx="114" cy="0" r="1.8" fill="#1FD8C4" />
                <rect className="sweep" x="34" y="150" width="152" height="40" fill="url(#gsweep)" opacity=".3" />
              </svg>
              <span className="glass-cap">Jornada estruturada</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ PROOF STRIP */}
        <section className="wrap" aria-label="Escopo da solução">
          <div className="proof-strip reveal in">
            <div className="proof-item"><strong>Diagnóstico 360°</strong><span>digital, atendimento e operação comercial</span></div>
            <div className="proof-item"><strong>CRM + Processo</strong><span>oportunidades, etapas e responsáveis visíveis</span></div>
            <div className="proof-item"><strong>Automação</strong><span>menos tarefas repetitivas dependentes da memória</span></div>
            <div className="proof-item"><strong>20% de desconto</strong><span>para associados da CAACE — Caixa de Assistência dos Advogados do Ceará</span></div>
          </div>
        </section>

        {/* ----------------------------------------------------------- DORES */}
        <section className="sec wrap" id="dores">
          <div className="sec-head reveal">
            <span className="eyebrow">Os 3 vazamentos mais comuns</span>
            <h2>O escritório recebe demanda.<br />Mas <em className="grad-text">a jornada quebra.</em></h2>
            <p>Nem toda dificuldade de crescimento é falta de marketing. Muitas perdas acontecem depois que a pessoa já encontrou o escritório.</p>
          </div>
          <div className="prob-grid">
            {DORES.map((d) => (
              <div className="prob reveal" key={d.n}>
                <div className="n">{d.n}</div>
                <h3>{d.titulo}</h3>
                <p>{d.texto}</p>
                <div className="prob-detail"><b>Implicação</b><p>{d.implicacao}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------- RAIO-X */}
        <section className="sec wrap" id="raio-x">
          <div className="sec-head reveal">
            <span className="eyebrow">Raio-X rápido</span>
            <h2>Quantos destes sintomas<br />existem no <em>seu escritório?</em></h2>
          </div>
          <div className="rx reveal">
            <div className="rx-list">
              {RX_ITENS.map((item, i) => (
                <label className="rx-check" key={item}>
                  <input
                    type="checkbox"
                    checked={rx[i]}
                    onChange={() => setRx((v) => v.map((x, j) => (j === i ? !x : x)))}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <div className="rx-result">
              <div><span className="rx-score">{rxTotal}<small>/10</small></span></div>
              <div className="rx-level">{rxLeitura.nivel}</div>
              <p className="rx-message">{rxLeitura.msg}</p>
              <div className="rx-metrics">
                <div className="rx-metric"><span>0–2 sintomas</span><strong>Estrutura mais madura</strong></div>
                <div className="rx-metric"><span>3–5 sintomas</span><strong>Atenção operacional</strong></div>
                <div className="rx-metric"><span>6+ sintomas</span><strong>Gargalos relevantes</strong></div>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- DIAGNÓSTICO */}
        <section className="sec wrap" id="diagnostico">
          <div className="sec-head reveal">
            <span className="eyebrow">Diagnóstico 360° simplificado</span>
            <h2>15 perguntas.<br />Um <em className="grad-text">plano de prioridade.</em></h2>
            <p>O resultado identifica o gargalo dominante entre aquisição, triagem, conversão, CRM, automação e gestão. Não avalia mérito jurídico.</p>
          </div>

          <div className="diag-shell reveal" ref={shell}>
            <div className="diag-topbar">
              <div className="diag-progress-track">
                <div className="diag-progress-bar" style={{ width: `${progresso}%` }} />
              </div>
              <div className="diag-progress-label">{rotuloProgresso}</div>
            </div>

            <div className="diag-body">
              {etapa === 'intro' && (
                <div className="diag-view diag-intro">
                  <span className="diag-block-label">Antes de começar</span>
                  <h3 className="diag-intro-title">Vamos entender a presença e a operação do escritório.</h3>
                  <p>
                    Instagram e site são opcionais, mas ajudam a contextualizar posicionamento,
                    clareza da comunicação e jornada digital na análise posterior.
                  </p>

                  <div className="diag-fields">
                    <div className="diag-field">
                      <label htmlFor="d-name">Nome do advogado ou escritório *</label>
                      <input className="diag-text" id="d-name" maxLength={200} placeholder="Nome"
                        value={contato.nome} onChange={(e) => setContato({ ...contato, nome: e.target.value })} />
                    </div>
                    <div className="diag-field">
                      <label htmlFor="d-city">Cidade / Estado *</label>
                      <input className="diag-text" id="d-city" maxLength={120} placeholder="Ex.: Sobral / CE"
                        value={contato.cidade} onChange={(e) => setContato({ ...contato, cidade: e.target.value })} />
                    </div>
                    <div className="diag-field">
                      <label htmlFor="d-email">E-mail *</label>
                      <input className="diag-text" id="d-email" type="email" maxLength={320} placeholder="voce@escritorio.com.br"
                        value={contato.email} onChange={(e) => setContato({ ...contato, email: e.target.value })} />
                    </div>
                    <div className="diag-field">
                      <label htmlFor="d-wa">WhatsApp *</label>
                      <input className="diag-text" id="d-wa" type="tel" maxLength={30} placeholder="(88) 99999-9999"
                        value={contato.whatsapp} onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })} />
                    </div>
                    <div className="diag-field">
                      <label htmlFor="d-ig">Instagram profissional</label>
                      <input className="diag-text" id="d-ig" maxLength={200} placeholder="@seuescritorio"
                        value={contato.instagram} onChange={(e) => setContato({ ...contato, instagram: e.target.value })} />
                    </div>
                    <div className="diag-field">
                      <label htmlFor="d-site">Site, se tiver</label>
                      <input className="diag-text" id="d-site" maxLength={500} placeholder="https://..."
                        value={contato.site} onChange={(e) => setContato({ ...contato, site: e.target.value })} />
                    </div>
                    <div className="diag-field full">
                      <label>Áreas de atuação * (até {MAX_AREAS})</label>
                      <div className="diag-areas">
                        {AREAS.map((area) => {
                          const marcada = contato.areas.includes(area)
                          const bloqueada = !marcada && contato.areas.length >= MAX_AREAS
                          return (
                            <label
                              key={area}
                              className={`diag-area${marcada ? ' selected' : ''}${bloqueada ? ' disabled' : ''}`}
                            >
                              <input type="checkbox" checked={marcada} disabled={bloqueada}
                                onChange={() => alternarArea(area)} />
                              {area}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {erro && <p className="diag-error">{erro}</p>}
                  <div className="diag-nav" style={{ justifyContent: 'flex-end' }}>
                    <button className="diag-btn primary" onClick={iniciar}>Iniciar diagnóstico →</button>
                  </div>
                </div>
              )}

              {etapa === 'perguntas' && (
                <div className="diag-view" key={qIndex}>
                  <div className="diag-block-label">{pergunta.bloco}</div>
                  <div className="diag-question">
                    <h3>{pergunta.texto}</h3>
                    <p className="diag-helper">{pergunta.ajuda}</p>
                    <div className="diag-options">
                      {pergunta.opcoes.map((op, i) => (
                        <button
                          type="button"
                          key={op.texto}
                          className={`diag-option${respostas[qIndex] === i ? ' selected' : ''}`}
                          onClick={() => responder(i)}
                        >
                          {op.texto}
                        </button>
                      ))}
                    </div>
                  </div>
                  {erro && <p className="diag-error">{erro}</p>}
                  <div className="diag-nav">
                    <button
                      className="diag-btn"
                      style={{ visibility: qIndex === 0 ? 'hidden' : 'visible' }}
                      onClick={() => { setQIndex((i) => Math.max(0, i - 1)); setErro('') }}
                    >
                      ← Voltar
                    </button>
                    <button className="diag-btn primary" onClick={avancar} disabled={enviando}>
                      {enviando
                        ? 'Registrando...'
                        : qIndex === TOTAL_PERGUNTAS - 1 ? 'Ver meu diagnóstico →' : 'Continuar →'}
                    </button>
                  </div>
                </div>
              )}

              {etapa === 'resultado' && resultado && (
                <div className="diag-view">
                  <div className="diag-result-head">
                    <div className="diag-result-text">
                      <h3 className="diag-result-level">Diagnóstico registrado.</h3>
                      <p>
                        Suas 15 respostas foram recebidas e já estão em análise. O resultado
                        &mdash; índice de maturidade, principal gargalo e plano de ação &mdash;
                        é apresentado por nós, ao vivo, na sessão estratégica.
                      </p>
                    </div>
                  </div>

                  <div className="diag-alert">
                    <h4>Por que a leitura não sai automática</h4>
                    <p>
                      O mesmo sintoma tem causas diferentes em escritórios diferentes. Na sessão
                      cruzamos suas respostas com Instagram, site, processo atual e números da
                      operação antes de definir prioridade &mdash; é isso que separa um plano
                      aplicável de uma lista genérica.
                    </p>
                  </div>

                  <div className="legal-note" style={{ marginTop: '1.3rem' }}>
                    <strong>Limite do diagnóstico:</strong> esta leitura avalia marketing, atendimento,
                    processos, tecnologia e gestão. Não avalia mérito jurídico nem substitui decisões
                    profissionais do advogado.
                  </div>

                  <div className="diag-cta-row">
                    <p className="diag-cta-note">
                      Próximo passo: escolher um horário. A apresentação leva cerca de 40 minutos.
                    </p>
                    <div className="diag-cta-btns">
                      <a className="btn btn-primary" href={AGENDA} target="_blank" rel="noopener noreferrer">Agendar apresentação do diagnóstico</a>
                      <a className="btn btn-ghost" href={resultado.linkWhatsapp} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
                    </div>
                  </div>
                  <button className="diag-restart-link" onClick={refazer}>Refazer diagnóstico</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- MÉTODO */}
        <section className="sec wrap" id="metodo">
          <div className="sec-head reveal">
            <span className="eyebrow">Ampulheta de Vendas Seven Xperts</span>
            <h2>A contratação é o centro.<br /><em className="grad-text">Não o fim.</em></h2>
            <p>Antes da contratação, a operação precisa gerar descoberta, confiança e organização. Depois, experiência, relacionamento e reputação ampliam o valor da jornada sem transformar a advocacia em mercantilização.</p>
          </div>

          <div className="sx-method reveal">
            <div className="sx-phase-label">Antes da contratação · informar, organizar e qualificar</div>
            <div className="sx-row">
              <article className="sx-stage"><span className="sx-n">01</span><h3>Conhecer</h3><p>Presença digital e conteúdo informativo ajudam o público a encontrar e compreender o escritório.</p><span className="sx-kpi">Origem · Alcance qualificado</span></article>
              <article className="sx-stage"><span className="sx-n">02</span><h3>Considerar</h3><p>Clareza, autoridade legítima e experiência digital reduzem incerteza sem promessas de resultado.</p><span className="sx-kpi">Engajamento · Contato espontâneo</span></article>
              <article className="sx-stage"><span className="sx-n">03</span><h3>Qualificar</h3><p>Triagem administrativa organiza área, localidade, informações iniciais e aderência antes da análise jurídica.</p><span className="sx-kpi">Aderência · Tempo poupado</span></article>
            </div>

            <div className="sx-sale">Contratação · A cintura da ampulheta</div>

            <div className="sx-phase-label">Depois da contratação · experiência, relacionamento e reputação</div>
            <div className="sx-row">
              <article className="sx-stage"><span className="sx-n">04</span><h3>Experiência</h3><p>Onboarding, organização e comunicação confirmam o profissionalismo percebido antes da contratação.</p><span className="sx-kpi">Experiência · Organização</span></article>
              <article className="sx-stage"><span className="sx-n">05</span><h3>Relacionar</h3><p>Relações legítimas podem continuar com informação, comunicação institucional e novas necessidades compatíveis.</p><span className="sx-kpi">Retenção · LTV, quando aplicável</span></article>
              <article className="sx-stage"><span className="sx-n">06</span><h3>Indicar</h3><p>Boa experiência fortalece lembrança e reputação, favorecendo indicações espontâneas.</p><span className="sx-kpi">Reputação · Indicação</span></article>
            </div>

            <div className="sx-value-row" aria-label="Indicadores da jornada">
              <div className="sx-value"><b>CAC</b><span>Custo de Aquisição de Cliente</span></div>
              <div className="sx-value"><b>Conversão</b><span>Oportunidade → contrato</span></div>
              <div className="sx-value"><b>Ticket</b><span>Valor médio contratado</span></div>
              <div className="sx-value"><b>Tempo</b><span>Resposta e triagem</span></div>
              <div className="sx-value"><b>LTV</b><span>Valor do cliente ao longo do relacionamento</span></div>
              <div className="sx-value"><b>Indicação</b><span>Novas oportunidades espontâneas</span></div>
            </div>
            <div className="sx-equation">
              <strong>Descoberta × Aderência × Comparecimento × Conversão × Experiência × Reputação</strong>
              <p>Mais eficiência não depende apenas de aumentar o número de contatos.</p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ CAC */}
        <section className="sec wrap" id="cac">
          <div className="sec-head reveal">
            <span className="eyebrow">CAC — Custo de Aquisição de Cliente</span>
            <h2>Quanto custa, de verdade,<br /><em className="grad-text">conquistar um novo cliente?</em></h2>
            <p>O CAC conecta investimento e contratação. A fórmula é simples: <strong>investimento total para aquisição ÷ novos clientes conquistados no período</strong>. O número só ganha sentido quando comparado ao ticket médio, margem e qualidade das contratações.</p>
          </div>

          <div className="unit-economics reveal">
            <div className="ue-grid">
              <div className="ue-calc">
                <h3 className="ue-title">Calcule seu CAC</h3>
                <p className="ue-copy">Informe os custos do mesmo período e a quantidade de novos clientes atribuídos à operação. Não use apenas cliques ou contatos: o denominador deve ser cliente efetivamente conquistado.</p>

                <div className="ue-fields">
                  <div className="ue-field"><label htmlFor="cac-mk">Investimento em marketing (R$)</label>
                    <input className="ue-input" id="cac-mk" type="number" min={0} step={100} value={cac.marketing} onChange={(e) => mudarCac('marketing', e.target.value)} /></div>
                  <div className="ue-field"><label htmlFor="cac-op">Custos de aquisição e atendimento (R$)</label>
                    <input className="ue-input" id="cac-op" type="number" min={0} step={100} value={cac.operacao} onChange={(e) => mudarCac('operacao', e.target.value)} /></div>
                  <div className="ue-field"><label htmlFor="cac-cl">Novos clientes conquistados</label>
                    <input className="ue-input" id="cac-cl" type="number" min={1} step={1} value={cac.clientes} onChange={(e) => mudarCac('clientes', e.target.value)} /></div>
                  <div className="ue-field"><label htmlFor="cac-tk">Ticket médio por contrato (R$)</label>
                    <input className="ue-input" id="cac-tk" type="number" min={0} step={100} value={cac.ticket} onChange={(e) => mudarCac('ticket', e.target.value)} /></div>
                  <div className="ue-field"><label htmlFor="cac-mg">Margem bruta estimada (%)</label>
                    <input className="ue-input" id="cac-mg" type="number" min={0} max={100} step={1} value={cac.margem} onChange={(e) => mudarCac('margem', e.target.value)} /></div>
                </div>

                <div className="ue-results">
                  <div className="ue-result primary"><span>CAC — Custo de Aquisição</span><strong>{brl(cacCalc.valor)}</strong></div>
                  <div className="ue-result"><span>CAC sobre o ticket médio</span><strong>{cacCalc.razao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong></div>
                  <div className="ue-result"><span>Margem bruta após CAC</span><strong>{brl(cacCalc.depois)}</strong></div>
                </div>
                <div className="ue-explain">
                  Com os valores informados, cada novo cliente custa em média {brl(cacCalc.valor)} para ser
                  adquirido. Isso representa {cacCalc.razao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do
                  ticket médio informado. A margem bruta estimada após descontar o CAC fica em {brl(cacCalc.depois)} por
                  contrato, antes de outros custos e tributos.
                </div>
              </div>

              <div className="ue-roadmap">
                <h3 className="ue-title">Como interpretar</h3>
                <p className="ue-copy">Um escritório pode gerar muitos contatos e ainda ter aquisição ineficiente. O que importa é conectar o investimento ao cliente efetivamente contratado e entender onde a jornada perde eficiência.</p>
                <div className="ltv-flow">
                  <div className="ltv-step"><span className="step-n">01</span><div><h4>Meça o investimento</h4><p>Mídia, ferramentas e custos diretamente relacionados à aquisição e atendimento comercial.</p></div></div>
                  <div className="ltv-step"><span className="step-n">02</span><div><h4>Conte novos clientes</h4><p>Use clientes efetivamente contratados no mesmo período ou em uma janela de atribuição coerente.</p></div></div>
                  <div className="ltv-step"><span className="step-n">03</span><div><h4>Compare com o ticket</h4><p>Ticket médio é o valor médio dos contratos. CAC elevado com ticket baixo pressiona a operação.</p></div></div>
                  <div className="ltv-step"><span className="step-n">04</span><div><h4>Compare com a margem</h4><p>Receita não é lucro. A margem ajuda a entender quanto resta depois dos custos do serviço e da aquisição.</p></div></div>
                </div>
                <div className="ltv-ratio"><span>Fórmula</span><strong>(Marketing + aquisição) ÷ clientes</strong></div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ PROBLEMAS */}
        <section className="sec wrap" id="problemas">
          <div className="sec-head reveal">
            <span className="eyebrow">Dor · Implicação · Reversão</span>
            <h2>Dez problemas diários.<br /><em>Dez respostas operacionais.</em></h2>
            <p>A Seven Xperts atua no processo ao redor da advocacia. Análise, estratégia e decisão jurídica continuam com o advogado.</p>
          </div>
          <div className="prob-grid">
            {PROBLEMAS.map(([n, titulo, texto, reversao]) => (
              <div className="prob reveal" key={n}>
                <div className="n">{n}</div>
                <h3>{titulo}</h3>
                <p>{texto}</p>
                <div className="prob-detail"><b>Reversão Seven Xperts</b><p>{reversao}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- TRANSFORMAÇÃO */}
        <section className="sec wrap" id="transformacao">
          <div className="sec-head reveal">
            <span className="eyebrow">A transformação</span>
            <h2>De conversas dispersas<br />para uma <em className="grad-text">operação visível.</em></h2>
          </div>
          <div className="transform-grid">
            {TRANSFORMACOES.map(([antes, depois]) => (
              <div className="transform reveal" key={antes}>
                <div className="state"><small>Antes</small><p>{antes}</p></div>
                <div className="arrow">→</div>
                <div className="state to"><small>Depois</small><p>{depois}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- OPERAÇÃO */}
        <section className="sec wrap" id="operacao">
          <div className="sec-head reveal">
            <span className="eyebrow">Implementação da operação</span>
            <h2>O CRM não é uma agenda.<br />É o <em>mapa da jornada.</em></h2>
            <p><strong>CRM significa Customer Relationship Management — Gestão de Relacionamento com Clientes.</strong> O objetivo é saber onde cada oportunidade está, quem é responsável e qual é o próximo passo.</p>
          </div>

          <div className="crm-shell reveal">
            <div className="crm-steps">
              <div className="crm-step"><span className="crm-n">01</span><h3>Diagnóstico</h3><p>Mapeamos canais, atendimento, triagem, agendamento, acompanhamento e dados.</p></div>
              <div className="crm-step"><span className="crm-n">02</span><h3>Arquitetura</h3><p>Definimos etapas, critérios, campos, responsáveis e motivos de perda.</p></div>
              <div className="crm-step"><span className="crm-n">03</span><h3>Configuração</h3><p>CRM, formulários, integrações e permissões são configurados para a rotina.</p></div>
              <div className="crm-step"><span className="crm-n">04</span><h3>Automação</h3><p>Alertas, tarefas, confirmações e rotinas repetitivas deixam de depender da memória.</p></div>
              <div className="crm-step"><span className="crm-n">05</span><h3>Adoção</h3><p>Equipe recebe processo, scripts e treinamento para usar a operação no dia a dia.</p></div>
              <div className="crm-step"><span className="crm-n">06</span><h3>Otimização</h3><p>Indicadores mostram gargalos e orientam ajustes no atendimento e marketing.</p></div>
            </div>

            <div className="crm-pipeline">
              <div className="crm-label">Exemplo de pipeline para escritório</div>
              <div className="crm-flow">
                <div className="crm-stage">Novo contato</div>
                <div className="crm-stage">Triagem</div>
                <div className="crm-stage">Qualificado</div>
                <div className="crm-stage">Consulta</div>
                <div className="crm-stage">Proposta</div>
                <div className="crm-stage">Acompanhamento</div>
                <div className="crm-stage win">Contratado</div>
              </div>
            </div>

            <div className="crm-control">
              <div className="crm-automation">
                <h3>O que pode ser automatizado</h3>
                <div className="crm-list">
                  <span>Registro do novo contato</span><span>Distribuição por responsável</span>
                  <span>Confirmação de agendamento</span><span>Lembretes administrativos</span>
                  <span>Criação de tarefas</span><span>Alertas de oportunidade parada</span>
                  <span>Pós-atendimento</span><span>Relatórios gerenciais</span>
                </div>
              </div>
              <div className="crm-dashboard">
                <h3>O gestor passa a enxergar</h3>
                <div className="crm-metrics">
                  <div className="crm-metric"><b>Conversão</b><span>por etapa da jornada</span></div>
                  <div className="crm-metric"><b>Velocidade</b><span>tempo de primeira resposta</span></div>
                  <div className="crm-metric"><b>Aderência</b><span>contatos que viram oportunidades</span></div>
                  <div className="crm-metric"><b>Perdas</b><span>motivos e pontos de fuga</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="commercial-models">
            <article className="commercial-model reveal">
              <span className="model-tag">Consultoria Comercial-Operacional</span>
              <h3>Estruturação + acompanhamento</h3>
              <p className="model-for">Para escritórios que já possuem secretária, recepção ou equipe e precisam transformar esforço em processo mensurável.</p>
              <ul className="model-list">
                <li>Scripts administrativos e de primeiro atendimento</li>
                <li>Pipeline e critérios de triagem</li>
                <li>Cadências de acompanhamento permitidas</li>
                <li>Treinamento e rotina de uso do CRM</li>
                <li>Análise de indicadores e correção de gargalos</li>
              </ul>
              <div className="model-handoff"><small>Divisão de responsabilidade</small><strong>Sua equipe atende; o advogado analisa e decide juridicamente; a Seven Xperts estrutura e melhora o processo.</strong></div>
            </article>

            <article className="commercial-model feature reveal">
              <span className="model-tag">Pré-qualificação Administrativa</span>
              <h3>Menos tempo técnico desperdiçado</h3>
              <p className="model-for">Estrutura de recepção e coleta inicial de informações sem substituir consulta, aconselhamento ou decisão jurídica.</p>
              <ul className="model-list">
                <li>Coleta inicial de dados e contexto administrativo</li>
                <li>Classificação conforme critérios definidos pelo escritório</li>
                <li>Organização de documentos e informações recebidas</li>
                <li>Registro da oportunidade no CRM</li>
                <li>Agendamento e passagem contextualizada ao responsável</li>
              </ul>
              <div className="model-handoff"><small>Limite profissional</small><strong>A tecnologia e a operação organizam. A análise jurídica permanece integralmente com o advogado.</strong></div>
            </article>
          </div>
        </section>

        {/* -------------------------------------------------------- PILARES */}
        <section className="sec wrap" id="ecossistema">
          <div className="sec-head reveal">
            <span className="eyebrow">A operação integrada</span>
            <h2>Quatro pilares.<br />Uma <em className="grad-text">jornada.</em></h2>
          </div>
          <div className="pillars reveal">
            <div className="pillar"><div className="idx">PILAR 01</div><h3>Marca &amp; Presença</h3><p>Posicionamento, site, redes e conteúdo jurídico informativo para clareza e autoridade legítima.</p></div>
            <div className="pillar"><div className="idx">PILAR 02</div><h3>Descoberta Ética</h3><p>SEO — Otimização para Mecanismos de Busca —, presença digital e mídia permitida, respeitando caráter informativo, discrição e sobriedade.</p></div>
            <div className="pillar"><div className="idx">PILAR 03</div><h3>Operação &amp; Conversão</h3><p>CRM, triagem, agendamento, acompanhamento, scripts e indicadores entre contato e contratação.</p></div>
            <div className="pillar"><div className="idx">PILAR 04</div><h3>Experiência &amp; Reputação</h3><p>Onboarding, comunicação, pós-atendimento e relacionamento institucional que fortalece confiança.</p></div>
          </div>
        </section>

        {/* ------------------------------------------------------- SERVIÇOS */}
        <section className="sec wrap" id="servicos">
          <div className="sec-head reveal">
            <span className="eyebrow">Serviços orientados a gargalos</span>
            <h2>Não vendemos ações soltas.<br />Estruturamos <em>o que está quebrando.</em></h2>
            <p>O escopo é definido a partir do diagnóstico, e não por um pacote genérico.</p>
          </div>
          <div className="svc-grid">
            {SERVICOS.map(([titulo, texto]) => (
              <div className="svc reveal" key={titulo}><h3>{titulo}</h3><p>{texto}</p></div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------- INDICADORES */}
        <section className="sec wrap" id="indicadores">
          <div className="sec-head reveal">
            <span className="eyebrow">O que passa a ser mensurável</span>
            <h2>Menos “eu acho”.<br />Mais <em className="grad-text">eu sei.</em></h2>
          </div>
          <div className="outcome-grid">
            {INDICADORES.map(([titulo, texto]) => (
              <div className="outcome reveal" key={titulo}>
                <span className="check">✓</span><h4>{titulo}</h4><p>{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- ÉTICA */}
        <section className="sec wrap" id="etica">
          <div className="sec-head reveal">
            <span className="eyebrow">Operação compatível com a advocacia</span>
            <h2>Tecnologia e marketing<br />sem <em>descaracterizar a profissão.</em></h2>
            <p>A estrutura comercial precisa respeitar os limites éticos da publicidade profissional e preservar pessoalidade, decisão e responsabilidade jurídica do advogado.</p>
          </div>
          <div className="ethics-grid">
            <div className="ethics-card reveal"><h3>Publicidade informativa</h3><p>Comunicação objetiva, verdadeira, discreta e sóbria, sem promessa de resultado, autoengrandecimento ou indução ao litígio.</p></div>
            <div className="ethics-card reveal"><h3>Tecnologia como apoio</h3><p>Chatbot e automações podem facilitar comunicação, coleta e organização, mas não substituir análise, decisão ou responsabilidade profissional.</p></div>
            <div className="ethics-card reveal"><h3>Mídia com critérios</h3><p>Google Ads por palavras-chave pode ser usado quando responsivo à busca iniciada pelo potencial cliente e em consonância com os ditames éticos.</p></div>
          </div>
          <div className="legal-note" style={{ marginTop: '1rem' }}>
            <strong>Nota:</strong> a execução final de qualquer estratégia para advogado ou sociedade deve ser
            validada conforme o Estatuto da Advocacia, Código de Ética e Disciplina, Provimento nº 205/2021 e
            entendimentos aplicáveis da OAB — Ordem dos Advogados do Brasil. Consulte o{' '}
            <a href="https://www.oab.org.br/leisnormas/legislacao/provimentos/205-2021" target="_blank" rel="noopener noreferrer">Provimento nº 205/2021</a>.
          </div>
        </section>

        {/* --------------------------------------------------------- QUEM FAZ */}
        <section className="sec wrap" id="quem-faz">
          <div className="sec-head reveal">
            <span className="eyebrow">Quem estrutura a operação</span>
            <h2>Estratégia, tecnologia e comercial<br />no mesmo <em className="grad-text">sistema.</em></h2>
            <p>A proposta da Seven Xperts é integrar as etapas que normalmente ficam separadas: presença digital, atendimento, CRM, automação, indicadores e experiência.</p>
          </div>
          <div className="bio-shell reveal">
            <div className="bio-photo">
              <div className="bio-frame">
                {/* Enquanto a foto não estiver em public/, mostra as iniciais
                    em vez do ícone de imagem quebrada. */}
                {fotoOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/sergio-ponte.jpg"
                    alt="Sérgio Ponte, fundador da Seven Xperts"
                    loading="lazy"
                    onError={() => setFotoOk(false)}
                  />
                ) : (
                  <span className="bio-iniciais" aria-hidden="true">SP</span>
                )}
              </div>
              <span className="bio-badge">Fundador · Seven Xperts</span>
            </div>
            <div className="bio-content">
              <h3 className="bio-name">Sérgio Ponte</h3>
              <div className="bio-cred">
                <div className="cred-item"><span className="cred-label">Foco</span><strong>Inteligência Comercial</strong><p>Estruturação de jornada, atendimento, CRM, automação e indicadores.</p></div>
                <div className="cred-item"><span className="cred-label">Formação de mercado</span><strong>Marketing &amp; Growth</strong><p>Aplicação de estratégia digital conectada à operação e à mensuração.</p></div>
                <div className="cred-item"><span className="cred-label">Tecnologia</span><strong>Automação &amp; Integrações</strong><p>Processos desenhados para reduzir retrabalho e aumentar visibilidade operacional.</p></div>
                <div className="cred-item"><span className="cred-label">Princípio</span><strong>Diagnóstico antes da prescrição</strong><p>A solução é definida pelo gargalo real da operação, não por pacote genérico.</p></div>
              </div>
              <div className="tagline-box"><strong>Você cuida do Direito. A Seven Xperts estrutura a operação ao redor dele.</strong></div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- SIGLAS */}
        <section className="sec wrap" id="siglas" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
          <div className="sec-head reveal" style={{ marginBottom: '1.5rem' }}>
            <span className="eyebrow">Siglas usadas nesta página</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.6rem)' }}>Sem jargão escondido.</h2>
          </div>
          <div className="outcome-grid">
            {SIGLAS.map(([sigla, texto]) => (
              <div className="outcome reveal" key={sigla}>
                <span className="check">✓</span><h4>{sigla}</h4><p>{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="sec" id="contato" style={{ paddingBlock: 'clamp(3rem, 7vw, 6rem)' }}>
          <div className="cta reveal">
            <span className="eyebrow">O próximo passo</span>
            <h2>Descubra onde sua jornada<br />está <em>quebrando</em>.</h2>
            <p>Antes de investir mais em marketing, identifique se o gargalo está em descoberta, triagem, atendimento, acompanhamento, CRM, automação ou gestão.</p>
            <div className="cta-btns">
              <a className="btn btn-primary" href="#diagnostico">Fazer Diagnóstico 360°</a>
              <a className="btn btn-ghost" href={AGENDA} target="_blank" rel="noopener noreferrer">Agendar Reunião de Diagnóstico</a>
              <a className="btn btn-ghost" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
            <p className="cta-fine">Diagnóstico inicial · Sem pacote genérico · Recomendação conforme aderência e gargalos identificados</p>
          </div>
        </section>
      </main>

      <footer className="foot wrap">
        <div className="foot-grid">
          <div>
            <div className="brand"><span className="dot" />SEVEN XPERTS</div>
            <p className="foot-about">Estratégia digital, atendimento, CRM, automação e inteligência comercial para operações profissionais.</p>
          </div>
          <div className="foot-meta">
            <div>Seven Xperts · Sobral/CE</div>
            <div><a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">@sevenxperts</a></div>
          </div>
        </div>
        <p className="foot-legal">Esta página divulga serviços da Seven Xperts para organização de marketing, atendimento, tecnologia e gestão. Não presta serviços jurídicos e não substitui orientação ética ou jurídica da OAB — Ordem dos Advogados do Brasil.</p>
      </footer>
    </div>
  )
}
