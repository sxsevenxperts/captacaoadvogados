'use client'

import { useMemo, useState } from 'react'
import { criarClienteNavegador } from '@/lib/supabase/client'
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  calcularScores,
  identificarGargalo,
  gerarMensagemWhatsapp,
} from '@/lib/diagnosis'
import { calcularCac, normalizarCacInputs } from '@/lib/cac'
import type { CacResultado } from '@/lib/cac'
import { CacResumo } from './components/CacResumo'
import type { DiagnosticoRespostas, PillarScores } from '@/lib/types'
import styles from './page.module.css'

type Etapa = 'contato' | 'perguntas' | 'cac' | 'resultado'

type Contato = {
  nome: string
  email: string
  whatsapp: string
  instagram: string
  site: string
  cidade: string
  area: string
}

type CacForm = {
  investimentoMensal: string
  novosClientes: string
  ticketMedio: string
  margem: string
  casosPorCliente: string
}

const CAC_VAZIO: CacForm = {
  investimentoMensal: '',
  novosClientes: '',
  ticketMedio: '',
  margem: '60',
  casosPorCliente: '1',
}

/** Converte campo de texto em número; string vazia vira undefined. */
function numero(valor: string): number | undefined {
  if (valor.trim() === '') return undefined
  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export default function PaginaDiagnostico() {
  const supabase = useMemo(() => criarClienteNavegador(), [])

  const [etapa, setEtapa] = useState<Etapa>('contato')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const [contato, setContato] = useState<Contato>({
    nome: '', email: '', whatsapp: '',
    instagram: '', site: '', cidade: '', area: '',
  })

  // Todas as perguntas começam em 5 — o meio da escala. Assim nenhuma
  // resposta fica ausente e o valor inicial não enviesa o diagnóstico.
  const [respostas, setRespostas] = useState<DiagnosticoRespostas>(
    () =>
      Object.fromEntries(
        PERGUNTAS.map((p) => [p.id, 5])
      ) as unknown as DiagnosticoRespostas
  )

  const [cacForm, setCacForm] = useState<CacForm>(CAC_VAZIO)

  const [resultado, setResultado] = useState<{
    scores: PillarScores
    gargalo: string
    cac: CacResultado | null
    linkWhatsapp: string
  } | null>(null)

  const cacInputs = useMemo(
    () => normalizarCacInputs({
        investimentoMensal: numero(cacForm.investimentoMensal),
        novosClientes: numero(cacForm.novosClientes),
        ticketMedio: numero(cacForm.ticketMedio),
        margem: (numero(cacForm.margem) ?? 0) / 100,
        casosPorCliente: numero(cacForm.casosPorCliente),
      }),
    [cacForm]
  )

  const cacPreview = useMemo(() => calcularCac(cacInputs), [cacInputs])

  function avancarContato(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!contato.nome.trim() || !contato.email.trim() || !contato.whatsapp.trim()) {
      setErro('Nome, e-mail e WhatsApp são obrigatórios.')
      return
    }
    if (contato.nome.trim().length < 2) {
      setErro('Informe um nome válido.')
      return
    }
    const whatsappDigitos = contato.whatsapp.replace(/\D/g, '')
    if (whatsappDigitos.length < 8 || whatsappDigitos.length > 15) {
      setErro('Informe um WhatsApp válido, com DDD.')
      return
    }
    setEtapa('perguntas')
  }

  function avancarPerguntas(e: React.FormEvent) {
    e.preventDefault()
    setEtapa('cac')
  }

  async function enviar(incluirCac: boolean) {
    setErro('')
    setEnviando(true)

    const scores = calcularScores(respostas)
    const gargalo = identificarGargalo(scores)
    const cac = incluirCac ? cacPreview : null

    try {
      // Sem .select(): o visitante anônimo tem permissão de INSERT, não de
      // leitura. Pedir os dados de volta faria a requisição falhar no RLS.
      const { error } = await supabase.from('diagnosticos').insert({
        nome: contato.nome.trim(),
        email: contato.email.trim(),
        whatsapp: contato.whatsapp.trim(),
        instagram: contato.instagram.trim() || null,
        site: contato.site.trim() || null,
        cidade: contato.cidade.trim() || null,
        area: contato.area.trim() || null,
        respostas_json: respostas,
        cac_investimento_mensal: incluirCac ? cacInputs.investimentoMensal ?? null : null,
        cac_novos_clientes: incluirCac ? cacInputs.novosClientes ?? null : null,
        cac_ticket_medio: incluirCac ? cacInputs.ticketMedio ?? null : null,
        cac_margem: incluirCac ? cacInputs.margem ?? null : null,
        cac_casos_por_cliente: incluirCac ? cacInputs.casosPorCliente ?? null : null,
      })

      if (error) {
        setErro('Não foi possível enviar o diagnóstico. Tente novamente.')
        setEnviando(false)
        return
      }

      const mensagem = gerarMensagemWhatsapp(contato.nome, gargalo, scores)
      setResultado({
        scores,
        gargalo,
        cac,
        linkWhatsapp: `https://wa.me/${contato.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`,
      })
      setEtapa('resultado')
    } catch {
      setErro('Não foi possível enviar o diagnóstico. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Diagnóstico de Captação</h1>

        {erro && <div className={styles.erro}>{erro}</div>}

        {etapa === 'contato' && (
          <form onSubmit={avancarContato} className={styles.form}>
            <h2>Seus dados</h2>
            <input placeholder="Nome completo *" value={contato.nome} maxLength={200}
              onChange={(e) => setContato({ ...contato, nome: e.target.value })} required />
            <input type="email" placeholder="E-mail *" value={contato.email} maxLength={320}
              onChange={(e) => setContato({ ...contato, email: e.target.value })} required />
            <input type="tel" placeholder="WhatsApp * (11 99999-9999)" value={contato.whatsapp} maxLength={30}
              onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })} required />
            <input placeholder="Instagram" value={contato.instagram} maxLength={200}
              onChange={(e) => setContato({ ...contato, instagram: e.target.value })} />
            <input placeholder="Site" value={contato.site} maxLength={500}
              onChange={(e) => setContato({ ...contato, site: e.target.value })} />
            <input placeholder="Cidade" value={contato.cidade} maxLength={120}
              onChange={(e) => setContato({ ...contato, cidade: e.target.value })} />
            <input placeholder="Área de atuação" value={contato.area} maxLength={120}
              onChange={(e) => setContato({ ...contato, area: e.target.value })} />
            <button type="submit">Começar diagnóstico</button>
          </form>
        )}

        {etapa === 'perguntas' && (
          <form onSubmit={avancarPerguntas} className={styles.form}>
            <h2>{TOTAL_PERGUNTAS} perguntas</h2>
            <p className={styles.ajuda}>1 = não existe &nbsp;·&nbsp; 10 = totalmente estruturado</p>

            {PERGUNTAS.map((pergunta, i) => (
              <div key={pergunta.id} className={styles.pergunta}>
                <label htmlFor={pergunta.id}>
                  <span className={styles.pilarTag}>{pergunta.pilar}</span>
                  {i + 1}. {pergunta.texto}
                </label>
                <div className={styles.slider}>
                  <input
                    id={pergunta.id}
                    type="range" min={1} max={10}
                    value={respostas[pergunta.id]}
                    onChange={(e) =>
                      setRespostas({ ...respostas, [pergunta.id]: Number(e.target.value) })
                    }
                  />
                  <span>{respostas[pergunta.id]}</span>
                </div>
              </div>
            ))}

            <button type="submit">Continuar</button>
          </form>
        )}

        {etapa === 'cac' && (
          <div className={styles.form}>
            <h2>Custo de aquisição (opcional)</h2>
            <p className={styles.ajuda}>
              Preencha para descobrir quanto custa cada novo cliente e se essa conta
              fecha. Você pode pular esta etapa.
            </p>

            <label className={styles.campo}>
              Investimento mensal em marketing e comercial (R$)
              <input inputMode="decimal" placeholder="5000" value={cacForm.investimentoMensal}
                onChange={(e) => setCacForm({ ...cacForm, investimentoMensal: e.target.value })} />
            </label>

            <label className={styles.campo}>
              Novos clientes fechados por mês
              <input inputMode="decimal" placeholder="4" value={cacForm.novosClientes}
                onChange={(e) => setCacForm({ ...cacForm, novosClientes: e.target.value })} />
            </label>

            <label className={styles.campo}>
              Honorário médio por cliente (R$)
              <input inputMode="decimal" placeholder="8000" value={cacForm.ticketMedio}
                onChange={(e) => setCacForm({ ...cacForm, ticketMedio: e.target.value })} />
            </label>

            <label className={styles.campo}>
              Margem de contribuição (%)
              <input inputMode="decimal" placeholder="60" value={cacForm.margem}
                onChange={(e) => setCacForm({ ...cacForm, margem: e.target.value })} />
            </label>

            <label className={styles.campo}>
              Casos por cliente ao longo da relação
              <input inputMode="decimal" placeholder="1" value={cacForm.casosPorCliente}
                onChange={(e) => setCacForm({ ...cacForm, casosPorCliente: e.target.value })} />
            </label>

            {cacPreview && <CacResumo resultado={cacPreview} />}

            <button type="button" disabled={enviando || !cacPreview}
              onClick={() => enviar(true)}>
              {enviando ? 'Enviando...' : 'Ver meu diagnóstico'}
            </button>
            <button type="button" className={styles.secundario} disabled={enviando}
              onClick={() => enviar(false)}>
              Pular e ver o diagnóstico
            </button>
          </div>
        )}

        {etapa === 'resultado' && resultado && (
          <div className={styles.resultado}>
            <h2>Seu diagnóstico</h2>

            <div className={styles.scores}>
              <Score rotulo="Aquisição" valor={resultado.scores.aquisicao} />
              <Score rotulo="Triagem"   valor={resultado.scores.triagem} />
              <Score rotulo="Conversão" valor={resultado.scores.conversao} />
              <Score rotulo="CRM"       valor={resultado.scores.crm} />
              <Score rotulo="Gestão"    valor={resultado.scores.gestao} />
              <div className={`${styles.score} ${styles.media}`}>
                <strong>Nota geral</strong>
                {resultado.scores.media}/10
              </div>
            </div>

            <div className={styles.gargalo}>
              <h3>Gargalo principal: {resultado.gargalo}</h3>
              <p>É a área que mais limita seu resultado hoje.</p>
            </div>

            {resultado.cac && <CacResumo resultado={resultado.cac} />}

            <a className={styles.whatsapp} href={resultado.linkWhatsapp}
              target="_blank" rel="noopener noreferrer">
              Conversar no WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function Score({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className={styles.score}>
      <strong>{rotulo}</strong>
      {valor}/10
    </div>
  )
}
