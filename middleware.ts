import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Very defensive middleware: bail out early for API routes and never let
  // an import/runtime error surface as a 500 for normal requests.
  try {
    // Bypass middleware for API routes (avoid running auth checks on multipart POSTs)
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next()
    }

    // Lazy-load the Supabase SSR client to avoid module-evaluation errors
    // during middleware initialization on the Edge runtime.
    let createServerClient: any
    try {
      // dynamic import so build-time or environment issues don't crash middleware
      createServerClient = (await import('@supabase/ssr')).createServerClient
    } catch (e) {
      console.error('Failed to import @supabase/ssr in middleware, skipping auth:', e)
      return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // RequestCookies in middleware supports iteration; provide a safe fallback
            // if the API surface differs between Next versions.
            if (typeof request.cookies.getAll === 'function') return request.cookies.getAll()
            try {
              const out: any[] = []
              for (const [name, value] of request.cookies) out.push({ name, value })
              return out
            } catch (e) {
              return []
            }
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }: any) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }: any) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    return supabaseResponse
  } catch (err) {
    // Swallow unexpected errors so middleware doesn't block the app.
    console.error('Unexpected error in middleware, allowing request through:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
