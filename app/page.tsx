'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  calcularScores,
  identificarGargalo,
  gerarMensagemWhatsapp,
} from '@/lib/diagnosis'
import type { DiagnosticoRespostas } from '@/lib/types'
import styles from './page.module.css'

const perguntas = [
  'Como é sua estratégia de aquisição de clientes? (1=inexistente, 10=muito estruturada)',
  'Você investe em marketing digital? (1=não, 10=sim, muito)',
  'Sua presença online é forte? (1=fraca, 10=excelente)',
  'Como é seu processo de triagem de leads? (1=inexistente, 10=muito estruturado)',
  'Você qualifica seus leads antes de propor? (1=nunca, 10=sempre)',
  'Seus critérios de aceite são claros? (1=não, 10=muito claros)',
  'Como é seu processo de conversão? (1=informal, 10=muito estruturado)',
  'Você tem taxa de fechamento definida? (1=não, 10=sim)',
  'Suas propostas são personalizadas? (1=genéricas, 10=totalmente personalizadas)',
  'Você usa CRM? (1=não, 10=sim, totalmente integrado)',
  'Como é seu acompanhamento pós-proposta? (1=nenhum, 10=muito estruturado)',
  'Seus processos administrativos são estruturados? (1=não, 10=muito)',
  'Como é sua gestão de tempo e recursos? (1=caótica, 10=otimizada)',
]

export default function DiagnosisPage() {
  const [step, setStep] = useState<'contact' | 'questions' | 'results'>('contact')
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    instagram: '',
    site: '',
    cidade: '',
    area: '',
  })

  const [respostas, setRespostas] = useState<Partial<DiagnosticoRespostas>>({})
  const [resultado, setResultado] = useState<any>(null)

  async function handleSubmitContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.nome || !contact.email || !contact.whatsapp) {
      alert('Preencha os campos obrigatórios')
      return
    }
    setStep('questions')
  }

  function handleResposta(index: number, valor: number) {
    const chave = `q${index + 1}` as keyof DiagnosticoRespostas
    setRespostas((prev) => ({ ...prev, [chave]: valor }))
  }

  async function handleSubmitDiagnosis(e: React.FormEvent) {
    e.preventDefault()

    const respostasCompletas = {
      q1: respostas.q1 || 0,
      q2: respostas.q2 || 0,
      q3: respostas.q3 || 0,
      q4: respostas.q4 || 0,
      q5: respostas.q5 || 0,
      q6: respostas.q6 || 0,
      q7: respostas.q7 || 0,
      q8: respostas.q8 || 0,
      q9: respostas.q9 || 0,
      q10: respostas.q10 || 0,
      q11: respostas.q11 || 0,
      q12: respostas.q12 || 0,
      q13: respostas.q13 || 0,
    } as DiagnosticoRespostas

    const scores = calcularScores(respostasCompletas)
    const gargalo = identificarGargalo(scores)

    setLoading(true)
    try {
      // Sem .select(): o visitante anônimo não tem permissão de leitura (RLS)
      const { error } = await supabase.from('diagnosticos').insert([
        {
          ...contact,
          respostas_json: respostasCompletas,
          nota_geral: scores.media,
          gargalo_principal: gargalo,
        },
      ])

      if (error) {
        console.error('Erro ao salvar diagnóstico:', error)
        alert('Erro ao salvar diagnóstico')
        return
      }

      const mensagem = gerarMensagemWhatsapp(contact.nome, gargalo, scores)

      setResultado({
        scores,
        gargalo,
        mensagem,
        whatsappLink: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
          mensagem
        )}`,
      })
      setStep('results')
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao processar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Diagnóstico de Captação - Seven Xperts</h1>

        {step === 'contact' && (
          <form onSubmit={handleSubmitContact} className={styles.form}>
            <h2>Dados de Contato</h2>

            <input
              type="text"
              placeholder="Nome completo"
              value={contact.nome}
              onChange={(e) => setContact({ ...contact, nome: e.target.value })}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              required
            />

            <input
              type="tel"
              placeholder="WhatsApp (+55 11 99999-9999)"
              value={contact.whatsapp}
              onChange={(e) =>
                setContact({ ...contact, whatsapp: e.target.value })
              }
              required
            />

            <input
              type="text"
              placeholder="Instagram (opcional)"
              value={contact.instagram}
              onChange={(e) =>
                setContact({ ...contact, instagram: e.target.value })
              }
            />

            <input
              type="text"
              placeholder="Site (opcional)"
              value={contact.site}
              onChange={(e) => setContact({ ...contact, site: e.target.value })}
            />

            <input
              type="text"
              placeholder="Cidade (opcional)"
              value={contact.cidade}
              onChange={(e) => setContact({ ...contact, cidade: e.target.value })}
            />

            <input
              type="text"
              placeholder="Área de especialidade (opcional)"
              value={contact.area}
              onChange={(e) => setContact({ ...contact, area: e.target.value })}
            />

            <button type="submit">Continuar para Perguntas</button>
          </form>
        )}

        {step === 'questions' && (
          <form onSubmit={handleSubmitDiagnosis} className={styles.form}>
            <h2>Questões (13 perguntas)</h2>
            <p>Responda de 1 a 10 para cada pergunta</p>

            {perguntas.map((pergunta, index) => (
              <div key={index} className={styles.questionGroup}>
                <label>{`${index + 1}. ${pergunta}`}</label>
                <div className={styles.slider}>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={
                      respostas[`q${index + 1}` as keyof DiagnosticoRespostas] ||
                      5
                    }
                    onChange={(e) => handleResposta(index, parseInt(e.target.value))}
                  />
                  <span>
                    {
                      respostas[
                        `q${index + 1}` as keyof DiagnosticoRespostas
                      ]
                    }
                  </span>
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Enviar Diagnóstico'}
            </button>
          </form>
        )}

        {step === 'results' && resultado && (
          <div className={styles.results}>
            <h2>🎯 Seu Diagnóstico</h2>

            <div className={styles.scores}>
              <div className={styles.scoreItem}>
                <strong>Aquisição:</strong> {resultado.scores.aquisicao}/10
              </div>
              <div className={styles.scoreItem}>
                <strong>Triagem:</strong> {resultado.scores.triagem}/10
              </div>
              <div className={styles.scoreItem}>
                <strong>Conversão:</strong> {resultado.scores.conversao}/10
              </div>
              <div className={styles.scoreItem}>
                <strong>CRM:</strong> {resultado.scores.crm}/10
              </div>
              <div className={styles.scoreItem}>
                <strong>Gestão:</strong> {resultado.scores.gestao}/10
              </div>
              <div className={styles.scoreItem + ' ' + styles.average}>
                <strong>Nota Geral:</strong> {resultado.scores.media}/10
              </div>
            </div>

            <div className={styles.bottleneck}>
              <h3>🚨 Seu Gargalo Principal: {resultado.gargalo}</h3>
              <p>Esta é a área que mais impacta sua captação de clientes.</p>
            </div>

            <a
              href={resultado.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappButton}
            >
              💬 Conversar no WhatsApp
            </a>

            <button onClick={() => window.location.reload()}>
              Fazer Novo Diagnóstico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
