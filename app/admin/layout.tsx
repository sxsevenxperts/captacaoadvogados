'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { criarClienteNavegador } from '@/lib/supabase/client'
import styles from './layout.module.css'

/**
 * Este layout é apenas a moldura visual. Quem barra o acesso é o
 * `middleware.ts`, no servidor — nenhuma rota /admin chega ao navegador
 * sem uma linha correspondente em `admins`.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => criarClienteNavegador(), [])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Seven Xperts</div>
        <div className={styles.menu}>
          <a
            href="/admin/diagnosticos"
            className={pathname.startsWith('/admin/diagnosticos') ? styles.active : ''}
          >
            Diagnósticos
          </a>
        </div>
        <button
          className={styles.logout}
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace('/admin/login')
            router.refresh()
          }}
        >
          Sair
        </button>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
