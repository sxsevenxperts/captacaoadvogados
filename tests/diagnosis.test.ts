import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PERGUNTAS,
  TOTAL_PERGUNTAS,
  calcularScores,
  identificarGargalo,
  prioridadesDoPlano,
  opcaoRespondida,
  escalaAmbigua,
  valorParaEscala,
  pilarDaPrioridadeDeclarada,
  PLANO_ACAO,
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

/* ------------------------------------------------------- plano de ação -- */

test('o plano tem 3 prioridades e comeca pelo gargalo', () => {
  const r = respostas({ q10: 1, q11: 2, q1: 3, q2: 3, q3: 3 })
  const scores = calcularScores(r)
  const plano = prioridadesDoPlano(scores)

  assert.equal(plano.length, 3)
  assert.equal(plano[0], identificarGargalo(scores))
})

test('as prioridades saem do mais fraco para o menos fraco', () => {
  const scores = calcularScores(respostas({}))
  const plano = prioridadesDoPlano(scores)
  const valor: Record<string, number> = {
    'Aquisição': scores.aquisicao, 'Triagem': scores.triagem,
    'Conversão': scores.conversao, 'CRM': scores.crm, 'Gestão': scores.gestao,
  }
  assert.ok(valor[plano[0]] <= valor[plano[1]])
  assert.ok(valor[plano[1]] <= valor[plano[2]])
})

test('todo pilar priorizado tem plano cadastrado', () => {
  for (const pilar of ['Aquisição', 'Triagem', 'Conversão', 'CRM', 'Gestão']) {
    assert.ok(PLANO_ACAO[pilar], `sem plano para ${pilar}`)
    assert.ok(PLANO_ACAO[pilar].itens.length > 0)
  }
})

test('o indice gravado identifica a opcao mesmo com pesos empatados', () => {
  // As nove dores da q15 empatam de proposito: sem o indice, colapsam na
  // mesma escala. A escala vem da propria opcao para o teste nao congelar
  // o numero de hoje.
  const q15 = PERGUNTAS.find((p) => p.id === 'q15')!
  assert.ok(q15.opcoes.length > 2)

  q15.opcoes.forEach((op, i) => {
    assert.equal(opcaoRespondida(q15, valorParaEscala(op.valor), i), op.texto)
  })
})

test('sem indice, pergunta de pesos empatados e marcada como ambigua', () => {
  const q15 = PERGUNTAS.find((p) => p.id === 'q15')!
  const escalaDaDor = valorParaEscala(q15.opcoes[0].valor)
  assert.equal(escalaAmbigua(q15, escalaDaDor), true)
  // O fallback ainda devolve algo, mas e a primeira correspondente.
  assert.equal(opcaoRespondida(q15, escalaDaDor), q15.opcoes[0].texto)
})

test('perguntas sem empate resolvem pela escala sozinha', () => {
  let semEmpate = 0
  for (const p of PERGUNTAS) {
    for (const op of p.opcoes) {
      const escala = valorParaEscala(op.valor)
      if (escalaAmbigua(p, escala)) continue
      semEmpate++
      assert.equal(opcaoRespondida(p, escala), op.texto)
    }
  }
  assert.ok(semEmpate > 40, `esperava dezenas de opcoes sem empate, houve ${semEmpate}`)
})

test('escala sem opcao correspondente devolve null', () => {
  assert.equal(opcaoRespondida(PERGUNTAS[0], 999), null)
})

/* ------------------------------------------- escala 1..10 sem colapso -- */

test('opcoes com maturidades diferentes nunca caem no mesmo balde 1..10', () => {
  // Defeito antigo: round(valor/10) juntava 80 e 75 no mesmo 8. Opcoes com o
  // MESMO valor podem dividir o balde (q15 empata de proposito); opcoes com
  // valores diferentes, nunca.
  for (const p of PERGUNTAS) {
    const valores = new Set(p.opcoes.map((o) => o.valor))
    const baldes = new Set(p.opcoes.map((o) => valorParaEscala(o.valor)))
    assert.equal(
      baldes.size,
      valores.size,
      `${p.id}: ${valores.size} niveis de maturidade colapsaram em ${baldes.size} baldes`
    )
  }
})

test('todo valor do catalogo e multiplo de 10 entre 10 e 100', () => {
  // E o que sustenta o teste acima: com multiplos de 10, valor/10 e exato e a
  // conversao para 1..10 nunca aproxima duas opcoes distintas.
  for (const p of PERGUNTAS) {
    for (const op of p.opcoes) {
      assert.equal(op.valor % 10, 0, `${p.id}: "${op.texto}" vale ${op.valor}`)
      assert.ok(
        op.valor >= 10 && op.valor <= 100,
        `${p.id}: "${op.texto}" vale ${op.valor}, fora de 10..100`
      )
    }
  }
})

test('volume de contatos distingue cada faixa da anterior', () => {
  // O colapso mais visivel: um escritorio com 500 contatos pontuava igual a
  // um com 70.
  const q2 = PERGUNTAS.find((p) => p.id === 'q2')!
  const faixa = (texto: string) =>
    valorParaEscala(q2.opcoes.find((o) => o.texto === texto)!.valor)

  assert.ok(faixa('Mais de 100') > faixa('61 a 100'))
  assert.ok(faixa('61 a 100') > faixa('31 a 60'))
  assert.ok(faixa('31 a 60') > faixa('11 a 30'))
  assert.ok(faixa('11 a 30') > faixa('Até 10'))
})

test('quem faz o primeiro atendimento cai em baldes distintos', () => {
  const q5 = PERGUNTAS.find((p) => p.id === 'q5')!
  const baldes = q5.opcoes.map((o) => valorParaEscala(o.valor))
  assert.equal(new Set(baldes).size, q5.opcoes.length)
})

/* --------------------------------- desconhecer nao pode ser premiado -- */

test('nenhuma opcao de desconhecimento pontua acima da pior resposta honesta', () => {
  // Varre as 15 perguntas: admitir que nao se sabe o proprio numero nunca pode
  // valer mais do que reportar um numero ruim, senao o formulario ensina o
  // respondente a fugir da pergunta.
  for (const p of PERGUNTAS) {
    const incertas = p.opcoes.filter((o) => o.desconhecimento)
    if (incertas.length === 0) continue

    const honestas = p.opcoes.filter((o) => !o.desconhecimento)
    assert.ok(honestas.length > 0, `${p.id}: so tem opcao de desconhecimento`)

    const piorHonesta = Math.min(...honestas.map((o) => o.valor))
    for (const op of incertas) {
      assert.ok(
        op.valor <= piorHonesta,
        `${p.id}: "${op.texto}" vale ${op.valor} e a pior resposta honesta vale ${piorHonesta}`
      )
    }
  }
})

test('toda opcao de nao-saber esta marcada como desconhecimento', () => {
  // Sem esta guarda bastaria esquecer a marca para a regra acima nao enxergar
  // a opcao nova.
  const naoSaber = /n[ãa]o sabemos|n[ãa]o sei|raramente sabemos/i
  for (const p of PERGUNTAS) {
    for (const op of p.opcoes) {
      if (!naoSaber.test(op.texto)) continue
      assert.equal(op.desconhecimento, true, `${p.id}: "${op.texto}" sem a marca`)
    }
  }
})

/* ----------------------------- q15: percepcao ordena o plano, nao infla -- */

test('cada dor da q15 aponta um pilar com plano cadastrado', () => {
  const q15 = PERGUNTAS.find((p) => p.id === 'q15')!
  const comAlvo = q15.opcoes.filter((o) => o.pilarAlvo)

  assert.equal(comAlvo.length, 9)
  for (const op of comAlvo) {
    const alvo = op.pilarAlvo
    assert.ok(alvo && PLANO_ACAO[alvo], `"${op.texto}" aponta pilar sem plano`)
  }
  // "Nao sabemos onde esta o problema" nao aponta nada, de proposito.
  assert.equal(q15.opcoes.filter((o) => !o.pilarAlvo).length, 1)
})

test('o indice gravado na q15 devolve o pilar da dor declarada', () => {
  const q15 = PERGUNTAS.find((p) => p.id === 'q15')!
  q15.opcoes.forEach((op, i) => {
    assert.equal(pilarDaPrioridadeDeclarada(i), op.pilarAlvo ?? null)
  })
  assert.equal(pilarDaPrioridadeDeclarada(null), null)
  assert.equal(pilarDaPrioridadeDeclarada(undefined), null)
  assert.equal(pilarDaPrioridadeDeclarada(99), null)
})

test('dores diferentes na q15 produzem planos diferentes', () => {
  // Antes as nove dores valiam 70 e escolher uma ou outra dava exatamente o
  // mesmo resultado.
  const scores = calcularScores(respostas({ q1: 1, q2: 1, q3: 1 }))
  const comCrm = prioridadesDoPlano(scores, pilarDaPrioridadeDeclarada(7))
  const comConversao = prioridadesDoPlano(scores, pilarDaPrioridadeDeclarada(5))

  assert.notDeepEqual(comCrm, comConversao)
  assert.deepEqual(comCrm, ['Aquisição', 'CRM', 'Triagem'])
  assert.deepEqual(comConversao, ['Aquisição', 'Conversão', 'Triagem'])
})

test('a percepcao desempata mas nunca desloca o gargalo medido', () => {
  // Aquisicao e CRM empatados no minimo. O trigger no Postgres nao conhece a
  // q15 e grava Aquisicao: a tela precisa concordar com o banco.
  const scores = calcularScores(
    respostas({ q1: 1, q2: 1, q3: 1, q10: 1, q11: 1, q12: 1 })
  )
  assert.equal(scores.aquisicao, scores.crm)

  const plano = prioridadesDoPlano(scores, 'CRM')
  assert.equal(plano[0], identificarGargalo(scores))
  assert.equal(plano[0], 'Aquisição')
  assert.equal(plano[1], 'CRM')
})

test('a percepcao nao promove pilar com nota melhor', () => {
  // CRM e o pilar mais forte: apontar CRM como dor nao pode furar a fila.
  const scores = calcularScores(
    respostas({ q1: 2, q2: 2, q3: 2, q10: 10, q11: 10, q12: 10 })
  )
  const plano = prioridadesDoPlano(scores, 'CRM')

  assert.equal(plano.includes('CRM'), false)
  assert.equal(plano[0], 'Aquisição')
})

test('sem percepcao declarada o plano continua o mesmo', () => {
  const scores = calcularScores(respostas({ q1: 1, q2: 1, q3: 1 }))
  assert.deepEqual(prioridadesDoPlano(scores), ['Aquisição', 'Triagem', 'Conversão'])
  assert.deepEqual(prioridadesDoPlano(scores, null), prioridadesDoPlano(scores))
})

test('apontar a dor nao vale mais que perceber sem registrar', () => {
  // A q15 entra na media do pilar Gestao; valendo 70 para todas as dores, ela
  // inflava o pilar de graca. Apontar onde doi sem indicador que comprove vale
  // o mesmo que a q13 da a "boa percepcao, mas sem registro".
  const dor = PERGUNTAS.find((p) => p.id === 'q15')!.opcoes[0]
  const percepcaoSemRegistro = PERGUNTAS.find((p) => p.id === 'q13')!.opcoes[1]
  assert.equal(valorParaEscala(dor.valor), valorParaEscala(percepcaoSemRegistro.valor))
})
