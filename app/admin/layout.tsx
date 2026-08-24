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
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/admin/login')
        return
      }

      // Verificar se é admin
      const { data: admin } = await supabase
        .from('admins')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (!admin) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      setUser(authUser)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Verificando acesso...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isLoginPage = pathname === '/admin/login'

  if (isLoginPage) {
    return <>{children}</>
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
            router.push('/admin/login')
          }}
        >
          Sair
        </button>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
