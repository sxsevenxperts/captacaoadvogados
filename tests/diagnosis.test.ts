import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  calcularScores,
  identificarGargalo,
} from '../lib/diagnosis'
import type { DiagnosticoRespostas } from '../lib/types'

function respostas(valores: Partial<DiagnosticoRespostas>, padrao = 5): DiagnosticoRespostas {
  const base = Object.fromEntries(
    PERGUNTAS.map((p) => [p.id, padrao])
  ) as unknown as DiagnosticoRespostas
  return { ...base, ...valores }
}

test('sao exatamente 15 perguntas', () => {
  assert.equal(TOTAL_PERGUNTAS, 15)
  assert.equal(PERGUNTAS.length, 15)
})

test('cada pilar tem exatamente 3 perguntas', () => {
  const porPilar = new Map<string, number>()
  for (const p of PERGUNTAS) {
    porPilar.set(p.pilar, (porPilar.get(p.pilar) ?? 0) + 1)
  }
  assert.equal(porPilar.size, 5)
  for (const [pilar, n] of porPilar) {
    assert.equal(n, 3, `${pilar} deveria ter 3 perguntas, tem ${n}`)
  }
})

test('nao ha ids de pergunta duplicados', () => {
  const ids = new Set(PERGUNTAS.map((p) => p.id))
  assert.equal(ids.size, 15)
})

test('todas as notas 10 dao media 10', () => {
  const s = calcularScores(respostas({}, 10))
  assert.deepEqual(s, {
    aquisicao: 10, triagem: 10, conversao: 10, crm: 10, gestao: 10, media: 10,
  })
})

test('todas as notas 1 dao media 1', () => {
  assert.equal(calcularScores(respostas({}, 1)).media, 1)
})

test('scores sao reproduziveis: mesma entrada, mesma saida', () => {
  const r = respostas({ q1: 2, q7: 9, q15: 4 })
  assert.deepEqual(calcularScores(r), calcularScores(r))
})

test('cada pilar usa apenas as proprias perguntas', () => {
  // Aquisicao = q1,q2,q3. Zerar so elas nao pode mexer nos outros pilares.
  const s = calcularScores(respostas({ q1: 1, q2: 1, q3: 1 }))
  assert.equal(s.aquisicao, 1)
  assert.equal(s.triagem, 5)
  assert.equal(s.conversao, 5)
  assert.equal(s.crm, 5)
  assert.equal(s.gestao, 5)
})

test('CRM usa q10, q11 e q12', () => {
  const s = calcularScores(respostas({ q10: 1, q11: 1, q12: 1 }))
  assert.equal(s.crm, 1)
  assert.equal(s.gestao, 5)
})

test('Gestao usa q13, q14 e q15', () => {
  const s = calcularScores(respostas({ q13: 1, q14: 1, q15: 1 }))
  assert.equal(s.gestao, 1)
  assert.equal(s.crm, 5)
})

test('media aritmetica correta', () => {
  // Aquisicao 3, demais 5 -> (3+5+5+5+5)/5 = 4.6
  const s = calcularScores(respostas({ q1: 3, q2: 3, q3: 3 }))
  assert.equal(s.aquisicao, 3)
  assert.equal(s.media, 4.6)
})

test('arredondamento em uma casa, sem erro de ponto flutuante', () => {
  // q1..q3 = 1,2,2 -> 5/3 = 1.666... -> 1.7
  const s = calcularScores(respostas({ q1: 1, q2: 2, q3: 2 }))
  assert.equal(s.aquisicao, 1.7)
})

test('gargalo e o menor pilar', () => {
  const s = calcularScores(respostas({ q10: 1, q11: 1, q12: 1 }))
  assert.equal(identificarGargalo(s), 'CRM')
})

test('empate resolve pela ordem do funil', () => {
  // Aquisicao e Gestao empatados no minimo: vence Aquisicao (topo do funil).
  const s = calcularScores(
    respostas({ q1: 1, q2: 1, q3: 1, q13: 1, q14: 1, q15: 1 })
  )
  assert.equal(s.aquisicao, s.gestao)
  assert.equal(identificarGargalo(s), 'Aquisição')
})

test('gargalo e determinístico', () => {
  const s = calcularScores(respostas({ q7: 2, q8: 2, q9: 2 }))
  assert.equal(identificarGargalo(s), identificarGargalo(s))
  assert.equal(identificarGargalo(s), 'Conversão')
})
