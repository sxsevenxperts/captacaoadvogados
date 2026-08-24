/**
 * Teste diferencial: TypeScript x trigger SQL.
 *
 * A nota e o gargalo são calculados em dois lugares — lib/diagnosis.ts (para
 * mostrar ao lead na hora) e o trigger aplicar_diagnostico (que é a verdade
 * gravada). Se as duas implementações divergirem, o lead vê um número e o
 * admin vê outro, sem nenhum erro aparecer.
 *
 * Este teste roda centenas de casos pelos dois caminhos e compara.
 *
 * Pré-requisito: Postgres local com a base montada.
 *
 *   createdb sx_teste
 *   psql -d sx_teste -f sql/harness-local.sql
 *   psql -d sx_teste -f sql/schema.sql
 *   npm run test:sql
 *
 * A base é escolhida por PGDATABASE (padrão: sx_teste).
 */
import { execFileSync } from 'node:child_process'
import { calcularScores, identificarGargalo, PERGUNTAS } from '../lib/diagnosis'
import type { DiagnosticoRespostas } from '../lib/types'

const DB = process.env.PGDATABASE ?? 'sx_teste'
const N = 400

// Gerador determinístico: o mesmo conjunto de casos em toda execução.
let semente = 12345
function proximo(max: number): number {
  semente = (semente * 1103515245 + 12345) & 0x7fffffff
  return (semente % max) + 1
}

const casos: DiagnosticoRespostas[] = []
for (let i = 0; i < N; i++) {
  const r: Record<string, number> = {}
  for (const p of PERGUNTAS) r[p.id] = proximo(10)
  casos.push(r as unknown as DiagnosticoRespostas)
}
// Bordas: todos os pilares empatados.
for (const v of [1, 5, 10]) {
  const r: Record<string, number> = {}
  for (const p of PERGUNTAS) r[p.id] = v
  casos.push(r as unknown as DiagnosticoRespostas)
}

const values = casos
  .map((r, i) => `('L${i}','l${i}@t.com','11999990000','${JSON.stringify(r)}'::jsonb)`)
  .join(',')

// ROLLBACK no fim: o teste não deixa resíduo na base.
const sql = `
BEGIN;
INSERT INTO diagnosticos (nome,email,whatsapp,respostas_json) VALUES ${values};
SELECT nome || '|' || nota_geral || '|' || gargalo_principal
FROM diagnosticos WHERE email LIKE 'l%@t.com';
ROLLBACK;
`

let saida: string
try {
  saida = execFileSync('psql', ['-qtA', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
} catch {
  console.error(
    `Nao foi possivel consultar a base "${DB}".\n` +
    `Monte-a com:\n` +
    `  createdb ${DB}\n` +
    `  psql -d ${DB} -f sql/harness-local.sql\n` +
    `  psql -d ${DB} -f sql/schema.sql\n`
  )
  process.exit(2)
}

const doBanco = new Map<string, { nota: number; gargalo: string }>()
for (const linha of saida.split('\n')) {
  const [nome, nota, gargalo] = linha.trim().split('|')
  if (nome && nota) doBanco.set(nome, { nota: Number(nota), gargalo })
}

let divergencias = 0

casos.forEach((r, i) => {
  const scores = calcularScores(r)
  const tsNota = scores.media
  const tsGargalo = identificarGargalo(scores)

  const sqlRes = doBanco.get(`L${i}`)
  if (!sqlRes) {
    divergencias++
    console.error(`L${i}: o banco nao devolveu resultado`)
    return
  }

  if (sqlRes.nota !== tsNota || sqlRes.gargalo !== tsGargalo) {
    divergencias++
    if (divergencias <= 10) {
      console.error(
        `DIVERGENCIA L${i}\n` +
        `  TS : ${tsNota} / ${tsGargalo}\n` +
        `  SQL: ${sqlRes.nota} / ${sqlRes.gargalo}\n` +
        `  respostas: ${JSON.stringify(r)}\n` +
        `  pilares  : ${JSON.stringify(scores)}`
      )
    }
  }
})

if (doBanco.size !== casos.length) {
  console.error(`Esperava ${casos.length} linhas do banco, recebi ${doBanco.size}`)
  process.exit(1)
}

console.log(`casos: ${casos.length} | divergencias: ${divergencias}`)
process.exit(divergencias === 0 ? 0 : 1)
