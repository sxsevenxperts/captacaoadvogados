import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente para componentes de navegador.
 * Guarda a sessão em cookie (e não em localStorage) para que o middleware
 * no servidor consiga enxergá-la.
 */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Cliente do formulário público, deliberadamente sem sessão.
 *
 * A policy `anon_insert_diagnostico` é `FOR INSERT TO anon`, e o GRANT de
 * INSERT também só existe para `anon`. Se o visitante tiver um cookie de
 * admin no mesmo navegador, o cliente normal envia aquele JWT, o papel vira
 * `authenticated` e o INSERT morre com 42501 — que foi exatamente o que
 * aconteceu ao testar o site logado no painel.
 *
 * O envio do diagnóstico não depende de quem está logado, então aqui a
 * sessão é ignorada de propósito.
 */
export function criarClientePublico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
