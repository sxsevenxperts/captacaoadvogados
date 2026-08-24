# Seven Xperts — Diagnóstico de Captação

Formulário público de diagnóstico + painel administrativo.

**Rotas**
- `/` — diagnóstico público: contato → 15 perguntas → calculadora de CAC (opcional) → resultado
- `/admin/login`
- `/admin/diagnosticos` — lista com busca, filtro e ordenação
- `/admin/diagnosticos/:id` — detalhe, status comercial, observações, histórico

---

## 1. Regenerar as chaves do Supabase

As chaves compartilhadas por chat estão comprometidas.
Dashboard → Settings → API → regenerar `anon` e `service_role`.

---

## 2. Rodar o SQL

SQL Editor → cole `sql/schema.sql` inteiro → Run. É idempotente.

Depois, para **provar** que o RLS está fechado, rode `sql/verificar-rls.sql`.
Ele testa dentro de uma transação e faz ROLLBACK — não grava nada.
No fim deve imprimir `=== TODOS OS TESTES PASSARAM ===`.

---

## 3. Variáveis de ambiente

`.env.local` na raiz:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_NOVA
```

Nunca coloque a `service_role` aqui — é um app com código no navegador.

---

## 4. Criar o primeiro administrador

**a) Criar a conta** (você faz, no painel — envolve senha):
Authentication → Users → **Add user**
- E-mail e senha
- Marque **Auto Confirm User**, senão o login falha

**b) Autorizar no painel:**
SQL Editor → `sql/criar-admin.sql`, trocando e-mail e nome.
O script resolve o UUID pelo e-mail sozinho — sem copiar id à mão.

Ele já devolve uma linha de confirmação. Se `email_confirmed_at` vier `NULL`,
volte ao passo (a) e confirme o e-mail.

---

## 5. Rodar local

```bash
npm ci
npm run dev
```

Testes da lógica de cálculo:

```bash
npm run lint
npm test
npm run build
```

### Verificar o SQL sem tocar em produção

`sql/harness-local.sql` reproduz as primitivas do Supabase (schema `auth`,
`auth.uid()`, papéis `anon`/`authenticated`) num Postgres comum. Com ele dá
para rodar o schema e a verificação de RLS numa base descartável:

```bash
createdb sx_teste
psql -d sx_teste -f sql/harness-local.sql
psql -d sx_teste -f sql/schema.sql
psql -d sx_teste -f sql/verificar-rls.sql
```

A nota e o gargalo são calculados em dois lugares: em `lib/diagnosis.ts`, para
mostrar ao lead na hora, e no trigger `aplicar_diagnostico`, que é o valor
gravado. `npm run test:sql` roda 403 casos pelos dois caminhos e compara — é o
que impede as duas implementações de divergirem em silêncio.

```bash
PGDATABASE=sx_teste npm run test:sql
```

---

## 6. Deploy no EasyPanel

- Runtime: Node.js 22 LTS (mínimo técnico do Next.js: Node 20.9)
- Build: `npm ci && npm run build`
- Start: `npm run start`
- Porta: `3000`
- Variáveis: as mesmas do `.env.local`

As variáveis `NEXT_PUBLIC_*` são embutidas **em build time**. Trocar uma
exige rebuild, não basta reiniciar.

---

## Modelo de segurança

Três camadas independentes:

1. **GRANT** — `anon` só tem `INSERT` em `diagnosticos`. Nem privilégio de leitura tem.
2. **RLS** — sem linha em `admins`, o banco não devolve nenhum diagnóstico.
3. **Proxy** (`proxy.ts`) — `/admin/*` é barrado no servidor, antes de
   qualquer HTML sair. Usa `getUser()`, que revalida o token, e não `getSession()`,
   que apenas lê um cookie falsificável.

| Quem | diagnosticos | admins | historico |
|---|---|---|---|
| Anônimo | INSERT | — | — |
| Autenticado fora de `admins` | — | — | — |
| Admin | SELECT + UPDATE comercial | própria linha | SELECT; INSERT automático por trigger |

A sessão fica em **cookie** (`@supabase/ssr`), não em localStorage — é o que
permite o proxy enxergá-la no servidor.

---

## Como o diagnóstico é calculado

15 perguntas, escala 1–10, **3 por pilar**:

| Pilar | Perguntas |
|---|---|
| Aquisição | q1–q3 |
| Triagem | q4–q6 |
| Conversão | q7–q9 |
| CRM | q10–q12 |
| Gestão | q13–q15 |

- Score do pilar = média das suas 3 respostas
- Nota geral = média dos 5 pilares, calculada a partir dos valores brutos
- Gargalo = menor pilar; empate resolve pela ordem do funil

`nota_geral` e `gargalo_principal` são calculados novamente por trigger no
banco; o navegador não tem privilégio para escolher esses valores.

O banco recusa qualquer diagnóstico que não tenha as 15 respostas entre 1 e 10
(constraint `respostas_completas`).

## Calculadora de CAC

```
CAC   = investimento mensal ÷ novos clientes
LTV   = ticket médio × margem × casos por cliente
Razão = LTV ÷ CAC        (referência de mercado: 3:1)
```

Só as **entradas** são gravadas; CAC, LTV e razão são derivados em código, então
o resultado é sempre reproduzível a partir do que o lead informou.

Referências: [Paddle](https://www.paddle.com/resources/cac-ltv-ratio) ·
[Wall Street Prep](https://www.wallstreetprep.com/knowledge/ltv-cac-ratio/) ·
[Chargebee](https://www.chargebee.com/resources/glossaries/ltv-cac-ratio/)

---

## Troubleshooting

| Erro | Causa |
|---|---|
| `function auth.user_id() does not exist` | SQL antigo. Use o `sql/schema.sql` atual (`auth.uid()`). |
| `infinite recursion detected in policy` | Política em `admins` consultando `admins`. Resolvido por `is_admin()` com SECURITY DEFINER. |
| Login diz "sem acesso ao painel" | Falta a linha em `admins`. Rode `sql/criar-admin.sql`. |
| Login não passa e não mostra erro | Usuário sem `email_confirmed_at`. |
| Lista vazia com admin logado | Rode `sql/verificar-rls.sql` para localizar a camada que está barrando. |
| Formulário não envia | `anon` precisa de `GRANT INSERT`. Reexecute o `schema.sql`. |
