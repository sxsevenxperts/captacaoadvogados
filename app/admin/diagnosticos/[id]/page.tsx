'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { criarClienteNavegador } from '@/lib/supabase/client'
import { PERGUNTAS, calcularScores, identificarGargalo } from '@/lib/diagnosis'
import { calcularCac } from '@/lib/cac'
import { STATUS_COMERCIAL } from '@/lib/types'
import type { Diagnostico, HistoricoComercial, StatusComercial } from '@/lib/types'
import { CacResumo } from '../../../components/CacResumo'
import styles from './detail.module.css'

export default function DetalheDiagnostico() {
  const supabase = useMemo(() => criarClienteNavegador(), [])
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [historico, setHistorico] = useState<HistoricoComercial[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  const [status, setStatus] = useState<StatusComercial>('NOVO')
  const [observacoes, setObservacoes] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)

    const { data, error } = await supabase
      .from('diagnosticos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      setErro('Diagnóstico não encontrado.')
      setCarregando(false)
      return
    }

    setDiagnostico(data)
    setStatus(data.status_comercial)
    setObservacoes(data.observacoes ?? '')
    setProximaAcao(data.proxima_acao ?? '')

    const { data: hist } = await supabase
      .from('historico_comercial')
      .select('*')
      .eq('diagnostico_id', id)
      .order('criado_em', { ascending: false })

    setHistorico(hist ?? [])
    setCarregando(false)
  }, [supabase, id])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar() {
    if (!diagnostico) return

    setSalvando(true)
    setAviso('')
    setErro('')

    const statusMudou = diagnostico.status_comercial !== status

    const { error } = await supabase
      .from('diagnosticos')
      .update({
        status_comercial: status,
        observacoes: observacoes.trim() || null,
        proxima_acao: proximaAcao.trim() || null,
      })
      .eq('id', id)

    if (error) {
      setErro('Não foi possível salvar.')
      setSalvando(false)
      return
    }

    if (statusMudou) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('historico_comercial').insert({
          diagnostico_id: id,
          status_anterior: diagnostico.status_comercial,
          status_novo: status,
          observacao: observacoes.trim() || null,
          criado_por: user.id,
        })
      }
    }

    // Recarrega para refletir o estado real do banco e o histórico novo.
    await carregar()
    setAviso('Alterações salvas.')
    setSalvando(false)
  }

  if (carregando) return <p className={styles.aviso}>Carregando...</p>
  if (erro && !diagnostico) return <p className={styles.aviso}>{erro}</p>
  if (!diagnostico) return null

  const scores = calcularScores(diagnostico.respostas_json)
  const gargaloRecalculado = identificarGargalo(scores)
  const cac = calcularCac({
    investimentoMensal: diagnostico.cac_investimento_mensal ?? undefined,
    novosClientes: diagnostico.cac_novos_clientes ?? undefined,
    ticketMedio: diagnostico.cac_ticket_medio ?? undefined,
    margem: diagnostico.cac_margem ?? undefined,
    casosPorCliente: diagnostico.cac_casos_por_cliente ?? undefined,
  })

  // Divergência aqui significa que a fórmula mudou depois que o lead
  // respondeu. Vale mostrar em vez de esconder.
  const divergencia = gargaloRecalculado !== diagnostico.gargalo_principal

  return (
    <div className={styles.container}>
      <button className={styles.voltar} onClick={() => router.push('/admin/diagnosticos')}>
        ← Diagnósticos
      </button>

      <header className={styles.cabecalho}>
        <div>
          <h1>{diagnostico.nome}</h1>
          <p className={styles.sub}>
            {diagnostico.email} · {diagnostico.whatsapp}
          </p>
        </div>
        <span className={styles.data}>
          {new Date(diagnostico.criado_em).toLocaleString('pt-BR')}
        </span>
      </header>

      {aviso && <div className={styles.sucesso}>{aviso}</div>}
      {erro && <div className={styles.falha}>{erro}</div>}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Contato</h2>
          <Campo rotulo="Instagram" valor={diagnostico.instagram} />
          <Campo rotulo="Site" valor={diagnostico.site} />
          <Campo rotulo="Cidade" valor={diagnostico.cidade} />
          <Campo rotulo="Área" valor={diagnostico.area} />
        </section>

        <section className={styles.card}>
          <h2>Pilares</h2>
          <div className={styles.pilares}>
            <Pilar rotulo="Aquisição" valor={scores.aquisicao} />
            <Pilar rotulo="Triagem" valor={scores.triagem} />
            <Pilar rotulo="Conversão" valor={scores.conversao} />
            <Pilar rotulo="CRM" valor={scores.crm} />
            <Pilar rotulo="Gestão" valor={scores.gestao} />
          </div>
          <div className={styles.notaGeral}>{scores.media}/10</div>
          <p className={styles.gargalo}>Gargalo: {gargaloRecalculado}</p>
          {divergencia && (
            <p className={styles.divergencia}>
              Registrado no envio como &ldquo;{diagnostico.gargalo_principal}&rdquo;.
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2>Comercial</h2>

          <label className={styles.campo}>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusComercial)}>
              {STATUS_COMERCIAL.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            Próxima ação
            <input
              value={proximaAcao}
              onChange={(e) => setProximaAcao(e.target.value)}
              placeholder="Ex: enviar proposta até sexta"
            />
          </label>

          <label className={styles.campo}>
            Observações
            <textarea
              rows={5}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas da conversa, objeções, contexto..."
            />
          </label>

          <button className={styles.salvar} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </section>
      </div>

      {cac && (
        <section className={styles.card}>
          <h2>Custo de aquisição declarado</h2>
          <CacResumo resultado={cac} />
        </section>
      )}

      <section className={styles.card}>
        <h2>Respostas ({PERGUNTAS.length})</h2>
        <ol className={styles.respostas}>
          {PERGUNTAS.map((p) => (
            <li key={p.id}>
              <span className={styles.respPilar}>{p.pilar}</span>
              <span className={styles.respTexto}>{p.texto}</span>
              <span className={styles.respValor}>
                {diagnostico.respostas_json[p.id]}/10
              </span>
            </li>
          ))}
        </ol>
      </section>

      {historico.length > 0 && (
        <section className={styles.card}>
          <h2>Histórico</h2>
          <ul className={styles.historico}>
            {historico.map((h) => (
              <li key={h.id}>
                <span className={styles.histData}>
                  {new Date(h.criado_em).toLocaleString('pt-BR')}
                </span>
                <span>
                  {(h.status_anterior ?? '—').replace(/_/g, ' ')} → {h.status_novo.replace(/_/g, ' ')}
                </span>
                {h.observacao && <small>{h.observacao}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className={styles.linhaCampo}>
      <span>{rotulo}</span>
      <strong>{valor || '—'}</strong>
    </div>
  )
}

function Pilar({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className={styles.pilar}>
      <span>{rotulo}</span>
      <div className={styles.barra}>
        <div className={styles.preenchida} style={{ width: `${valor * 10}%` }} />
      </div>
      <strong>{valor}</strong>
    </div>
  )
}
