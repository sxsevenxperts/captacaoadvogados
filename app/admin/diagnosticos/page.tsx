'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { criarClienteNavegador } from '@/lib/supabase/client'
import { calcularCac, formatarReal } from '@/lib/cac'
import { STATUS_COMERCIAL } from '@/lib/types'
import type { Diagnostico } from '@/lib/types'
import styles from './diagnosticos.module.css'

type Ordenacao = 'recentes' | 'pior_nota' | 'melhor_nota'

export default function PaginaDiagnosticos() {
  const supabase = useMemo(() => criarClienteNavegador(), [])

  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')

    let query = supabase.from('diagnosticos').select('*')

    if (filtroStatus) query = query.eq('status_comercial', filtroStatus)

    if (ordenacao === 'recentes') query = query.order('criado_em', { ascending: false })
    else query = query.order('nota_geral', { ascending: ordenacao === 'pior_nota' })

    const { data, error } = await query

    if (error) {
      setErro('Não foi possível carregar os diagnósticos.')
      setDiagnosticos([])
    } else {
      setDiagnosticos(data ?? [])
    }
    setCarregando(false)
  }, [supabase, filtroStatus, ordenacao])

  useEffect(() => {
    // A consulta sincroniza a tela com o Supabase sempre que os filtros mudam.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  // A busca é local: o conjunto é pequeno e o filtro fica instantâneo.
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return diagnosticos

    // Só dígitos do termo, para casar telefone independente da formatação.
    const digitos = termo.replace(/\D/g, '')

    return diagnosticos.filter((d) => {
      return (
        d.nome.toLowerCase().includes(termo) ||
        d.email.toLowerCase().includes(termo) ||
        (d.cidade?.toLowerCase().includes(termo) ?? false) ||
        (d.area?.toLowerCase().includes(termo) ?? false) ||
        (digitos.length > 0 && d.whatsapp.replace(/\D/g, '').includes(digitos))
      )
    })
  }, [diagnosticos, busca])

  return (
    <div className={styles.container}>
      <header className={styles.cabecalho}>
        <h1>Diagnósticos</h1>
        <span className={styles.contagem}>
          {filtrados.length} de {diagnosticos.length}
        </span>
      </header>

      <div className={styles.controles}>
        <input
          className={styles.busca}
          placeholder="Buscar por nome, e-mail, WhatsApp, cidade ou área..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className={styles.filtro}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_COMERCIAL.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          className={styles.filtro}
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
        >
          <option value="recentes">Mais recentes</option>
          <option value="pior_nota">Pior nota primeiro</option>
          <option value="melhor_nota">Melhor nota primeiro</option>
        </select>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      {carregando ? (
        <p className={styles.vazio}>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className={styles.vazio}>Nenhum diagnóstico encontrado.</p>
      ) : (
        // Tabela real, não grid de divs: uma linha por pessoa e uma coluna por
        // dado, com cabeçalho fixo e rolagem horizontal quando não couber.
        <div className={styles.tabelaScroll}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>E-mail</th>
                <th>Cidade</th>
                <th>Áreas</th>
                <th className={styles.centro}>Nota</th>
                <th>Gargalo</th>
                <th className={styles.direita}>CAC</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => {
                const cac = calcularCac({
                  investimentoMensal: d.cac_investimento_mensal ?? undefined,
                  novosClientes: d.cac_novos_clientes ?? undefined,
                  ticketMedio: d.cac_ticket_medio ?? undefined,
                  margem: d.cac_margem ?? undefined,
                  casosPorCliente: d.cac_casos_por_cliente ?? undefined,
                })

                return (
                  <tr key={d.id}>
                    <td className={styles.data}>
                      {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={styles.nome}>{d.nome}</td>
                    <td className={styles.mono}>{d.whatsapp}</td>
                    <td className={styles.email} title={d.email}>{d.email}</td>
                    <td>{d.cidade ?? '—'}</td>
                    <td className={styles.areas} title={d.area ?? ''}>{d.area ?? '—'}</td>
                    <td className={styles.centro}>
                      <span className={styles.nota}>{Number(d.nota_geral).toFixed(1)}</span>
                    </td>
                    <td className={styles.gargalo}>{d.gargalo_principal}</td>
                    <td className={styles.direita}>{cac ? formatarReal(cac.cac) : '—'}</td>
                    <td>
                      <span className={`${styles.status} ${styles[d.status_comercial.toLowerCase()]}`}>
                        {d.status_comercial.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className={styles.acao}>
                      <Link href={`/admin/diagnosticos/${d.id}`}>Abrir</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
