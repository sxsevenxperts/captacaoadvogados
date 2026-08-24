import { formatarReal, RAZAO_ALVO } from '@/lib/cac'
import type { CacResultado } from '@/lib/cac'
import styles from './CacResumo.module.css'

export function CacResumo({ resultado }: { resultado: CacResultado }) {
  return (
    <div
      className={`${styles.box} ${styles[resultado.veredito.toLowerCase()]}`}
    >
      <Linha rotulo="Custo por cliente (CAC)" valor={formatarReal(resultado.cac)} />
      <Linha rotulo="Valor do cliente (LTV)" valor={formatarReal(resultado.ltv)} />
      <Linha
        rotulo={`Razão LTV:CAC (alvo ${RAZAO_ALVO}:1)`}
        valor={resultado.razao === Infinity ? '—' : `${resultado.razao}:1`}
      />
      <Linha
        rotulo="Lucro por cliente"
        valor={formatarReal(resultado.lucroPorCliente)}
      />
      <Linha
        rotulo="CAC máximo saudável"
        valor={formatarReal(resultado.cacMaximoSaudavel)}
      />
      <p className={styles.mensagem}>{resultado.mensagem}</p>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={styles.linha}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  )
}
