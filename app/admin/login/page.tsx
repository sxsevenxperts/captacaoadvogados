'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarClienteNavegador } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function PaginaLogin() {
  const supabase = useMemo(() => criarClienteNavegador(), [])
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })

    if (error || !data.user) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }

    // Autenticar não basta: só entra quem tem linha em `admins`.
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!admin) {
      await supabase.auth.signOut()
      setErro('Esta conta não tem acesso ao painel.')
      setCarregando(false)
      return
    }

    // refresh() força o middleware a rodar de novo já com o cookie da sessão.
    router.replace('/admin/diagnosticos')
    router.refresh()
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Seven Xperts</h1>
        <p>Painel de diagnósticos</p>

        <form onSubmit={entrar} className={styles.form}>
          {erro && <div className={styles.erro}>{erro}</div>}

          <input
            type="email" placeholder="E-mail" value={email}
            onChange={(e) => setEmail(e.target.value)}
            required disabled={carregando} autoComplete="username"
          />
          <input
            type="password" placeholder="Senha" value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required disabled={carregando} autoComplete="current-password"
          />
          <button type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
