'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { criarClienteNavegador } from '@/lib/supabase/client'
import styles from './layout.module.css'
import './admin.css'

/**
 * Este layout é apenas a moldura visual. Quem barra o acesso é o
 * `proxy.ts`, no servidor — nenhuma rota /admin chega ao navegador
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

  // O login não usa a moldura, mas precisa do escopo: é ele que carrega os
  // tokens de cor e as fontes do painel.
  if (pathname === '/admin/login') {
    return <div className="admin-scope">{children}</div>
  }

  return (
    <div className={`admin-scope ${styles.layout}`}>
      <nav className={styles.navbar}>
        <div className={styles.logo}>Seven Xperts</div>
        <div className={styles.menu}>
          <Link
            href="/admin/diagnosticos"
            className={pathname.startsWith('/admin/diagnosticos') ? styles.active : ''}
          >
            Diagnósticos
          </Link>
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
