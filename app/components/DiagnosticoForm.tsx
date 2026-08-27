'use client'

import { useMemo, useRef, useState } from 'react'
import { criarClienteNavegador } from '@/lib/supabase/client'
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  calcularScores,
  identificarGargalo,
  gerarMensagemWhatsapp,
} from '@/lib/diagnosis'
import { calcularCac, normalizarCacInputs, formatarReal } from '@/lib/cac'
import type { CacResultado } from '@/lib/cac'
import type { DiagnosticoRespostas, PillarScores } from '@/lib/types'
import styles from './diagnostico-form.module.css'

type Etapa = 'contato' | 'perguntas' | 'cac' | 'resultado'

type Contato = {
  nome: string
  email: string
  whatsapp: string
  instagram: string
  site: string
  cidade: string
  area: string[]
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

const AREAS = [
  'Família e Sucessões', 'Previdenciário', 'Trabalhista', 'Empresarial',
  'Tributário', 'Imobiliário', 'Cível', 'Consumidor',
  'Bancário', 'Criminal', 'Administrativo', 'Atuação multidisciplinar',
]

function numero(valor: string): number | undefined {
  if (valor.trim() === '') return undefined
  const n = Number(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function DiagnosticoForm() {
  const supabase = useMemo(() => criarClienteNavegador(), [])
  const topo = useRef<HTMLDivElement>(null)

  const [etapa, setEtapa] = useState<Etapa>('contato')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const [contato, setContato] = useState<Contato>({
    nome: '', email: '', whatsapp: '',
    instagram: '', site: '', cidade: '', area: [],
  })

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

  function irPara(proxima: Etapa) {
    setEtapa(proxima)
    topo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function avancarContato(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!contato.nome.trim() || !contato.email.trim() || !contato.whatsapp.trim() || contato.area.length === 0) {
      setErro('Nome, e-mail, WhatsApp e pelo menos uma área de atuação são obrigatórios.')
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
    irPara('perguntas')
  }

  function avancarPerguntas(e: React.FormEvent) {
    e.preventDefault()
    irPara('cac')
  }

  async function enviar(incluirCac: boolean) {
    setErro('')
    setEnviando(true)

    const scores = calcularScores(respostas)
    const gargalo = identificarGargalo(scores)
    const cac = incluirCac ? cacPreview : null

    try {
      const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

      if (!isLocal) {
        const { error } = await supabase.from('diagnosticos').insert({
          nome: contato.nome.trim(),
          email: contato.email.trim(),
          whatsapp: contato.whatsapp.trim(),
          instagram: contato.instagram.trim() || null,
          site: contato.site.trim() || null,
          cidade: contato.cidade.trim() || null,
          area: contato.area.join(', ') || null,
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
      }

      const mensagem = gerarMensagemWhatsapp(contato.nome, gargalo, scores)
      setResultado({
        scores,
        gargalo,
        cac,
        linkWhatsapp: `https://wa.me/${contato.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`,
      })
      irPara('resultado')
    } catch {
      setErro('Não foi possível enviar o diagnóstico. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const passos: Etapa[] = ['contato', 'perguntas', 'cac', 'resultado']
  const passoAtual = passos.indexOf(etapa)

  return (
    <div className={styles.wrapper} ref={topo}>
      <div className={styles.steps}>
        {['Contato', 'Diagnóstico', 'CAC', 'Agendamento'].map((rotulo, i) => (
          <div
            key={rotulo}
            className={`${styles.step} ${i <= passoAtual ? styles.stepAtivo : ''}`}
          >
            <span className={styles.stepNum}>{i + 1}</span>
            {rotulo}
          </div>
        ))}
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {etapa === 'contato' && (
        <form onSubmit={avancarContato} className={styles.form}>
          <h3>Seus dados</h3>
          <div className={styles.grid2}>
            <input placeholder="Nome completo *" value={contato.nome} maxLength={200}
              onChange={(e) => setContato({ ...contato, nome: e.target.value })} required />
            <input type="email" placeholder="E-mail *" value={contato.email} maxLength={320}
              onChange={(e) => setContato({ ...contato, email: e.target.value })} required />
            <input type="tel" placeholder="WhatsApp * (11 99999-9999)" value={contato.whatsapp} maxLength={30}
              onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })} required />
            <input placeholder="Cidade" value={contato.cidade} maxLength={120}
              onChange={(e) => setContato({ ...contato, cidade: e.target.value })} />
            <input placeholder="Instagram" value={contato.instagram} maxLength={200}
              onChange={(e) => setContato({ ...contato, instagram: e.target.value })} />
            <input placeholder="Site" value={contato.site} maxLength={500}
              onChange={(e) => setContato({ ...contato, site: e.target.value })} />
          </div>

          <div className={styles.areaFieldset}>
            <label className={styles.areaLabel}>Principais áreas de atuação * (marque quantas quiser)</label>
            <div className={styles.areaCheckboxes}>
              {AREAS.map(area => (
                <label
                  key={area}
                  className={`${styles.checkboxLabel} ${contato.area.includes(area) ? styles.checkboxAtivo : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={contato.area.includes(area)}
                    onChange={e => {
                      setContato({
                        ...contato,
                        area: e.target.checked
                          ? [...contato.area, area]
                          : contato.area.filter(a => a !== area),
                      })
                    }}
                  />
                  {area}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className={styles.btnPrimario}>Começar diagnóstico</button>
        </form>
      )}

      {etapa === 'perguntas' && (
        <form onSubmit={avancarPerguntas} className={styles.form}>
          <h3>{TOTAL_PERGUNTAS} perguntas</h3>
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

          <button type="submit" className={styles.btnPrimario}>Continuar</button>
        </form>
      )}

      {etapa === 'cac' && (
        <div className={styles.form}>
          <h3>Custo de aquisição (opcional)</h3>
          <p className={styles.ajuda}>
            Preencha para descobrir quanto custa cada novo cliente e se essa conta fecha.
            Você pode pular esta etapa.
          </p>

          <div className={styles.grid2}>
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
          </div>

          {cacPreview && (
            <>
              <div className={styles.cacBox}>
                <div className={styles.cacItem}>
                  <strong>{formatarReal(cacPreview.cac)}</strong>
                  <span>CAC por cliente</span>
                </div>
                <div className={styles.cacItem}>
                  <strong>{formatarReal(cacPreview.ltv)}</strong>
                  <span>LTV estimado</span>
                </div>
                <div className={styles.cacItem}>
                  <strong>
                    {cacPreview.razao === Infinity ? '∞' : `${cacPreview.razao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x`}
                  </strong>
                  <span>LTV / CAC</span>
                </div>
                <div className={styles.cacItem}>
                  <strong>{formatarReal(cacPreview.lucroPorCliente)}</strong>
                  <span>Lucro por cliente</span>
                </div>
              </div>
              <p className={`${styles.veredito} ${styles[`veredito${cacPreview.veredito}`]}`}>
                {cacPreview.mensagem}
              </p>
            </>
          )}

          <button type="button" className={styles.btnPrimario} disabled={enviando}
            onClick={() => enviar(true)}>
            {enviando ? 'Enviando...' : 'Enviar e agendar reunião'}
          </button>
          <button type="button" className={styles.btnSecundario} disabled={enviando}
            onClick={() => enviar(false)}>
            Pular CAC e agendar
          </button>
        </div>
      )}

      {etapa === 'resultado' && resultado && (
        <div className={styles.resultado}>
          <h3>✅ Diagnóstico enviado com sucesso</h3>
          <p className={styles.ajuda}>
            Obrigado, {contato.nome.split(' ')[0]}. Seu diagnóstico 360° foi registrado.
            Na reunião você recebe:
          </p>
          <ul className={styles.lista}>
            <li>Diagnóstico completo com scores por pilar</li>
            <li>Análise do gargalo dominante</li>
            <li>Plano de ação priorizado</li>
            <li>Recomendações de operação e CRM</li>
          </ul>

          <div className={styles.acoes}>
            <a
              className={styles.btnPrimario}
              href={`https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(`Apresentação de Diagnóstico - ${contato.nome}`)}&details=${encodeURIComponent(`Apresentação do diagnóstico 360°\nContato: ${contato.email}`)}`}
              target="_blank" rel="noopener noreferrer">
              📅 Agendar reunião
            </a>
            <a className={styles.btnSecundario} href={resultado.linkWhatsapp}
              target="_blank" rel="noopener noreferrer">
              💬 WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
