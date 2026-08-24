# Seven Xperts — Diagnóstico de Captação

MVP: formulário público de diagnóstico + painel administrativo.

**Rotas**
- `/` — formulário público (13 perguntas)
- `/admin/login` — login
- `/admin/diagnosticos` — lista com busca/filtro/ordenação
- `/admin/diagnosticos/:id` — detalhe, status comercial, observações

---

## 1. Regenerar as chaves do Supabase

As chaves compartilhadas anteriormente estão comprometidas.

Supabase Dashboard → Settings → API → regenerar `anon` e `service_role`.

---

## 2. Rodar o SQL

Supabase Dashboard → SQL Editor → cole todo o conteúdo de `sql/schema.sql` → Run.

O script é idempotente: pode rodar de novo se der erro no meio.

---

## 3. Variáveis de ambiente

Crie `.env.local` na raiz:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_NOVA
```

Encontre em Settings → API. **Nunca** coloque a `service_role` aqui — este é um app client-side e a chave iria para o navegador.

---

## 4. Criar o primeiro administrador

**a)** Authentication → Users → **Add user**
- Email e senha
- Marque *Auto Confirm User* (senão o login falha por email não confirmado)
- Copie o **UUID** do usuário criado

**b)** SQL Editor:

```sql
INSERT INTO admins (id, email, nome, role)
VALUES ('COLE-O-UUID-AQUI', 'seu@email.com', 'Seu Nome', 'admin');
```

O `id` precisa ser exatamente o UUID do Auth — é assim que o RLS reconhece o admin.

---

## 5. Rodar local

```bash
npm install
npm run dev
```

- http://localhost:3000 — formulário
- http://localhost:3000/admin/login — painel

---

## 6. Deploy no EasyPanel

Build command: `npm install && npm run build`
Start command: `npm run start`
Porta: `3000`

Variáveis de ambiente no painel do EasyPanel (as mesmas do `.env.local`).

Elas são lidas **em build time** — se mudar uma variável, precisa rebuildar, não só reiniciar.

---

## Modelo de segurança

A proteção real dos dados é o **RLS no Postgres**, não a interface:

| Quem | diagnosticos | admins | historico |
|---|---|---|---|
| Visitante anônimo | INSERT apenas | nada | nada |
| Autenticado fora de `admins` | nada | nada | nada |
| Admin (linha em `admins`) | SELECT + UPDATE | própria linha | SELECT + INSERT |

Mesmo que alguém abra `/admin/diagnosticos` no navegador, o banco não devolve nenhuma linha sem uma linha correspondente em `admins`.

---

## Troubleshooting

| Erro | Causa |
|---|---|
| `function auth.user_id() does not exist` | SQL antigo. Use o `sql/schema.sql` atual (usa `auth.uid()`). |
| `infinite recursion detected in policy` | Política em `admins` consultando `admins`. Resolvido pela função `is_admin()` com SECURITY DEFINER. |
| Login diz "sem acesso" | Falta a linha em `admins`, ou o `id` não bate com o UUID do Auth. |
| Login falha silenciosamente | Usuário não confirmado no Auth. |
| Lista vazia com admin logado | Confira `SELECT * FROM admins WHERE id = auth.uid()`. |
