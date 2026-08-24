import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularCac, normalizarCacInputs, RAZAO_ALVO } from '../lib/cac'

const BASE = {
  investimentoMensal: 5000,
  novosClientes: 4,
  ticketMedio: 8000,
  margem: 0.6,
  casosPorCliente: 1,
}

test('CAC = investimento / novos clientes', () => {
  const r = calcularCac(BASE)!
  assert.equal(r.cac, 1250) // 5000 / 4
})

test('LTV = ticket x margem x casos', () => {
  const r = calcularCac(BASE)!
  assert.equal(r.ltv, 4800) // 8000 * 0.6 * 1
})

test('razao = LTV / CAC', () => {
  const r = calcularCac(BASE)!
  assert.equal(r.razao, 3.84) // 4800 / 1250
})

test('lucro por cliente = LTV - CAC', () => {
  const r = calcularCac(BASE)!
  assert.equal(r.lucroPorCliente, 3550) // 4800 - 1250
})

test('CAC maximo saudavel = LTV / 3', () => {
  const r = calcularCac(BASE)!
  assert.equal(r.cacMaximoSaudavel, 1600) // 4800 / 3
  assert.equal(RAZAO_ALVO, 3)
})

test('casos por cliente multiplicam o LTV', () => {
  const r = calcularCac({ ...BASE, casosPorCliente: 3 })!
  assert.equal(r.ltv, 14400) // 8000 * 0.6 * 3
  assert.equal(r.razao, 11.52)
})

test('veredito PREJUIZO quando CAC supera o LTV', () => {
  const r = calcularCac({ ...BASE, investimentoMensal: 40000 })!
  assert.equal(r.cac, 10000)
  assert.ok(r.razao < 1)
  assert.equal(r.veredito, 'PREJUIZO')
  assert.equal(r.lucroPorCliente, -5200)
})

test('veredito APERTADO entre 1:1 e 3:1', () => {
  const r = calcularCac({ ...BASE, investimentoMensal: 8000 })!
  assert.equal(r.cac, 2000)
  assert.equal(r.razao, 2.4)
  assert.equal(r.veredito, 'APERTADO')
})

test('veredito SAUDAVEL entre 3:1 e 5:1', () => {
  assert.equal(calcularCac(BASE)!.veredito, 'SAUDAVEL')
})

test('veredito SUBINVESTINDO acima de 5:1', () => {
  const r = calcularCac({ ...BASE, investimentoMensal: 2000 })!
  assert.equal(r.cac, 500)
  assert.equal(r.razao, 9.6)
  assert.equal(r.veredito, 'SUBINVESTINDO')
})

test('divisao por zero devolve null em vez de Infinity', () => {
  assert.equal(calcularCac({ ...BASE, novosClientes: 0 }), null)
})

test('entradas faltando devolvem null', () => {
  assert.equal(calcularCac({}), null)
  assert.equal(calcularCac({ ...BASE, ticketMedio: undefined }), null)
})

test('margem fora de 0..1 e rejeitada', () => {
  assert.equal(calcularCac({ ...BASE, margem: 0 }), null)
  assert.equal(calcularCac({ ...BASE, margem: 1.5 }), null)
})

test('nunca devolve NaN', () => {
  const r = calcularCac({ ...BASE, investimentoMensal: 0 })!
  assert.equal(r.cac, 0)
  assert.ok(!Number.isNaN(r.lucroPorCliente))
})

test('investimento negativo e rejeitado antes do banco', () => {
  assert.equal(calcularCac({ ...BASE, investimentoMensal: -1 }), null)
})

test('quantidade de clientes precisa ser inteira', () => {
  assert.equal(calcularCac({ ...BASE, novosClientes: 2.5 }), null)
})

test('normalizacao espelha as precisões do PostgreSQL', () => {
  assert.deepEqual(normalizarCacInputs({
    investimentoMensal: 100.005,
    novosClientes: 3,
    ticketMedio: 8000.005,
    margem: 0.3334,
    casosPorCliente: 1.005,
  }), {
    investimentoMensal: 100.01,
    novosClientes: 3,
    ticketMedio: 8000.01,
    margem: 0.333,
    casosPorCliente: 1.01,
  })
})
