'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularScores } from '@/lib/diagnosis'
import type { Diagnostico, DiagnosticoRespostas, PillarScores } from '@/lib/types'
import styles from './detail.module.css'

const statusOptions = [
  'NOVO',
  'CONTATO_PENDENTE',
  'PROPOSTA_ENVIADA',
  'NEGOCIACAO',
  'FECHADO',
  'REJEITADO',
]

export default function DiagnosticoDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [proximaAcao, setProximaAcao] = useState('')
  const [scores, setScores] = useState<PillarScores | null>(null)

  useEffect(() => {
    loadDiagnostico()
  }, [id])

  async function loadDiagnostico() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        console.error('Erro:', error)
        router.push('/admin/diagnosticos')
        return
      }

      setDiagnostico(data)
      setStatus(data.status_comercial)
      setObservacoes(data.observacoes || '')
      setProximaAcao(data.proxima_acao || '')

      // Recalcular scores
      const calculated = calcularScores(data.respostas_json as DiagnosticoRespostas)
      setScores(calculated)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('diagnosticos')
        .update({
          status_comercial: status,
          observacoes,
          proxima_acao: proximaAcao,
        })
        .eq('id', id)

      if (updateError) {
        alert('Erro ao salvar')
        setSaving(false)
        return
      }

      // Registrar no histórico se status mudou
      if (diagnostico && diagnostico.status_comercial !== status) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          await supabase.from('historico_comercial').insert([
            {
              diagnostico_id: id,
              status_anterior: diagnostico.status_comercial,
              status_novo: status,
              observacao: observacoes,
              criado_por: user.id,
            },
          ])
        }
      }

      setDiagnostico({ ...diagnostico!, status_comercial: status as Diagnostico['status_comercial'], observacoes, proxima_acao: proximaAcao })
      alert('Salvo com sucesso!')
      setSaving(false)
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao salvar')
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>
  }

  if (!diagnostico || !scores) {
    return <div className={styles.error}>Diagnóstico não encontrado</div>
  }

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => router.back()}>
        ← Voltar
      </button>

      <div className={styles.header}>
        <div>
          <h1>{diagnostico.nome}</h1>
          <p className={styles.subtitle}>
            {diagnostico.email} • {diagnostico.whatsapp}
          </p>
        </div>
        <div className={styles.meta}>
          <span>
            Criado em: {new Date(diagnostico.criado_em).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Coluna 1: Informações de Contato */}
        <div className={styles.card}>
          <h2>Informações de Contato</h2>
          <div className={styles.field}>
            <label>Nome</label>
            <p>{diagnostico.nome}</p>
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <p>{diagnostico.email}</p>
          </div>
          <div className={styles.field}>
            <label>WhatsApp</label>
            <p>{diagnostico.whatsapp}</p>
          </div>
          {diagnostico.instagram && (
            <div className={styles.field}>
              <label>Instagram</label>
              <p>{diagnostico.instagram}</p>
            </div>
          )}
          {diagnostico.site && (
            <div className={styles.field}>
              <label>Site</label>
              <p>{diagnostico.site}</p>
            </div>
          )}
          {diagnostico.cidade && (
            <div className={styles.field}>
              <label>Cidade</label>
              <p>{diagnostico.cidade}</p>
            </div>
          )}
          {diagnostico.area && (
            <div className={styles.field}>
              <label>Área de Especialidade</label>
              <p>{diagnostico.area}</p>
            </div>
          )}
        </div>

        {/* Coluna 2: Scores e Gargalo */}
        <div className={styles.card}>
          <h2>Diagnóstico</h2>
          <div className={styles.scoreGrid}>
            <div className={styles.scoreBox}>
              <label>Aquisição</label>
              <div className={styles.scoreValue}>{scores.aquisicao}</div>
            </div>
            <div className={styles.scoreBox}>
              <label>Triagem</label>
              <div className={styles.scoreValue}>{scores.triagem}</div>
            </div>
            <div className={styles.scoreBox}>
              <label>Conversão</label>
              <div className={styles.scoreValue}>{scores.conversao}</div>
            </div>
            <div className={styles.scoreBox}>
              <label>CRM</label>
              <div className={styles.scoreValue}>{scores.crm}</div>
            </div>
            <div className={styles.scoreBox}>
              <label>Gestão</label>
              <div className={styles.scoreValue}>{scores.gestao}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>Nota Geral</label>
            <div className={styles.notaGeral}>{scores.media}/10</div>
          </div>

          <div className={styles.field}>
            <label>Gargalo Principal</label>
            <p className={styles.bottleneck}>{diagnostico.gargalo_principal}</p>
          </div>
        </div>

        {/* Coluna 3: Gestão Comercial */}
        <div className={styles.card}>
          <h2>Gestão Comercial</h2>

          <div className={styles.field}>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Próxima Ação</label>
            <input
              type="text"
              value={proximaAcao}
              onChange={(e) => setProximaAcao(e.target.value)}
              placeholder="Ex: Enviar proposta em 3 dias"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione notas sobre este diagnóstico..."
              className={styles.textarea}
              rows={4}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Respostas Completas */}
      <div className={styles.card}>
        <h2>Respostas Completas</h2>
        <div className={styles.responsesGrid}>
          {Object.entries(diagnostico.respostas_json).map(([key, value]) => (
            <div key={key} className={styles.responseItem}>
              <span className={styles.responseLabel}>{key.toUpperCase()}</span>
              <span className={styles.responseValue}>{value}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
