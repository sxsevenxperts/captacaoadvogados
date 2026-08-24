'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // A página de login é pública — não checar sessão nela (evita loop de redirect)
    if (isLoginPage) {
      setLoading(false)
      return
    }

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/admin/login')
        return
      }

      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!admin) {
        await supabase.auth.signOut()
        router.replace('/admin/login')
        return
      }

      setAuthorized(true)
      setLoading(false)
    }

    checkAuth()
  }, [router, isLoginPage])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Verificando acesso...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Seven Xperts Admin</div>
        <div className={styles.menu}>
          <a
            href="/admin/diagnosticos"
            className={pathname === '/admin/diagnosticos' ? styles.active : ''}
          >
            Diagnósticos
          </a>
        </div>
        <button
          className={styles.logout}
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace('/admin/login')
          }}
        >
          Sair
        </button>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
