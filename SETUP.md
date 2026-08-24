# Setup Rápido - Seven Xperts Diagnóstico

## 1️⃣ Clonar e Instalar

```bash
npm install
```

## 2️⃣ Criar Projeto Supabase

1. Vá para [supabase.com](https://supabase.com)
2. Crie uma organização (se não tiver)
3. Crie novo projeto
4. Salve a senha do banco (vai precisar depois)
5. Aguarde ~2 minutos (inicialização)

## 3️⃣ Executar SQL

1. No Supabase Dashboard, vá para **SQL Editor**
2. Crie uma nova query
3. Copie TUDO do arquivo `sql/schema.sql`
4. Execute ▶️
5. Aguarde conclusão (deve ser rápido)

## 4️⃣ Configurar Variáveis

1. Settings → API
2. Copie:
   - `Project URL` → Cole como `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → Cole como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Crie arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 5️⃣ Criar Admin

1. Authentication → Users
2. "Add user" button
3. Email: seu-email@example.com
4. Password: escolha uma
5. Copie o UUID do usuário criado

6. SQL Editor → New Query → Execute:

```sql
INSERT INTO admins (id, email, nome, role)
VALUES (
  'uuid-do-usuario-aqui',
  'seu-email@example.com',
  'Seu Nome',
  'admin'
);
```

## 6️⃣ Rodar Localmente

```bash
npm run dev
```

Acesse:
- 🌍 Diagnóstico público: http://localhost:3000
- 🔐 Admin: http://localhost:3000/admin/login

## 7️⃣ Testar Fluxo Completo

1. **Form público**
   - Preencha nome, email, WhatsApp
   - Responda 13 perguntas
   - Veja resultado com score e gargalo

2. **Admin Dashboard**
   - Login: seu-email@example.com + senha
   - Veja diagnóstico na lista
   - Clique em "Ver Detalhes"
   - Mude status, adicione observações
   - Salve (registra histórico)

## 🚀 Deploy (Vercel)

```bash
# 1. Fazer commit
git add .
git commit -m "Initial setup"
git push

# 2. No Vercel.com
# - Import projeto do GitHub
# - Environment Variables:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# - Deploy
```

---

## 📋 Checklist Final

- [ ] Projeto Supabase criado
- [ ] SQL executado (3 tabelas + RLS)
- [ ] `.env.local` preenchido
- [ ] Admin criado na tabela `admins`
- [ ] `npm run dev` funcionando
- [ ] Form funciona e salva no Supabase
- [ ] Admin consegue fazer login
- [ ] Admin consegue ver diagnósticos
- [ ] Admin consegue atualizar status e observações
- [ ] Build sem erros: `npm run build`

---

## ❓ Troubleshooting

### "Erro ao carregar diagnósticos"
- Verifique RLS: SQL Editor → Tabela `diagnosticos` → Policies
- Confirme que admin está na tabela `admins`

### "Não consigo fazer login"
- Verifique email no Auth (deve estar confirmado)
- Verifique que o UUID está correto na tabela `admins`

### "Variáveis de ambiente não carregam"
- Reinicie servidor: Ctrl+C e `npm run dev` novamente
- Verifique `.env.local` está na raiz do projeto

### "Build falha"
- Delete `node_modules` e `.next`: `rm -rf node_modules .next`
- Reinstale: `npm install && npm run build`

---

## 📞 Documentação Completa

Veja `AUDIT.md` para:
- Auditoria completa de segurança
- SQL detalhado
- Instruções de produção
- Roadmap Phase 2

