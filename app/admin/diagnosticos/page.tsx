'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Diagnostico } from '@/lib/types'
import styles from './diagnosticos.module.css'

const statusOptions = [
  'NOVO',
  'CONTATO_PENDENTE',
  'PROPOSTA_ENVIADA',
  'NEGOCIACAO',
  'FECHADO',
  'REJEITADO',
]

export default function DiagnosticosPage() {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'criado_em' | 'nota_geral'>('criado_em')

  useEffect(() => {
    loadDiagnosticos()
  }, [statusFilter, sortBy])

  async function loadDiagnosticos() {
    setLoading(true)
    try {
      let query = supabase.from('diagnosticos').select('*')

      if (statusFilter) {
        query = query.eq('status_comercial', statusFilter)
      }

      if (sortBy === 'criado_em') {
        query = query.order('criado_em', { ascending: false })
      } else {
        query = query.order('nota_geral', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao carregar:', error)
        return
      }

      setDiagnosticos(data || [])
    } finally {
      setLoading(false)
    }
  }

  const filtered = diagnosticos.filter((d) =>
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.whatsapp.includes(searchTerm)
  )

  return (
    <div className={styles.container}>
      <h1>Diagnósticos</h1>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Buscar por nome, email ou WhatsApp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.search}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filter}
        >
          <option value="">Todos os Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className={styles.filter}
        >
          <option value="criado_em">Mais Recentes</option>
          <option value="nota_geral">Melhor Score</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>Nenhum diagnóstico encontrado</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.header}>
            <div className={styles.col_name}>Nome</div>
            <div className={styles.col_email}>Email</div>
            <div className={styles.col_score}>Score</div>
            <div className={styles.col_status}>Status</div>
            <div className={styles.col_action}>Ação</div>
          </div>

          {filtered.map((diagnostico) => (
            <div key={diagnostico.id} className={styles.row}>
              <div className={styles.col_name}>{diagnostico.nome}</div>
              <div className={styles.col_email}>{diagnostico.email}</div>
              <div className={styles.col_score}>
                <span className={styles.badge}>
                  {diagnostico.nota_geral.toFixed(1)}/10
                </span>
              </div>
              <div className={styles.col_status}>
                <span
                  className={
                    styles[`status_${diagnostico.status_comercial.toLowerCase()}`]
                  }
                >
                  {diagnostico.status_comercial}
                </span>
              </div>
              <div className={styles.col_action}>
                <Link href={`/admin/diagnosticos/${diagnostico.id}`}>
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
