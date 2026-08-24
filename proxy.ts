import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const LOGIN = '/admin/login'

/**
 * Proteção de /admin no servidor: a requisição é barrada antes de qualquer
 * HTML sair daqui. O RLS continua sendo a defesa dos dados; este proxy é a
 * segunda camada, para que a rota não seja apenas escondida no cliente.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() revalida o token no servidor de auth — ao contrário de
  // getSession(), que apenas lê o cookie e é falsificável.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname === LOGIN) {
    if (user && (await ehAdmin(supabase, user.id))) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/diagnosticos'
      return NextResponse.redirect(url)
    }
    return response
  }

  if (!user || !(await ehAdmin(supabase, user.id))) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN
    url.searchParams.set('redirecionado', '1')
    return NextResponse.redirect(url)
  }

  return response
}

async function ehAdmin(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  return Boolean(data)
}

export const config = {
  matcher: ['/admin/:path*'],
}
