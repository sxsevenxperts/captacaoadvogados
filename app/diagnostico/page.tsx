import { DiagnosticoForm } from '@/app/components/DiagnosticoForm'
import styles from './page.module.css'

export default function PaginaDiagnostico() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Diagnóstico 360° simplificado</span>
        <h1>15 perguntas. Um plano de prioridade.</h1>
        <p>
          Identifica o gargalo dominante entre aquisição, triagem, conversão, CRM e
          gestão. Não avalia mérito jurídico.
        </p>
      </header>
      <DiagnosticoForm />
    </main>
  )
}
