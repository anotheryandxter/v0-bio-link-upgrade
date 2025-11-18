import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Very defensive middleware: bail out early for API routes and never let
  // an import/runtime error surface as a 500 for normal requests.
  try {
    // Bypass middleware for API routes (avoid running auth checks on multipart POSTs)
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next()
    }

    // Quick path: if a `source` query param is present on any non-API request,
    // attempt to resolve an embed redirect server-side. We forward to the
    // server route which will perform the admin lookup and logging, then
    // return its redirect location (if any) so the middleware can redirect
    // without rendering the main page. This keeps the lookup privileged and
    // avoids duplicating admin logic in middleware.
    if (request.nextUrl.searchParams.has('source')) {
      try {
        const slug = request.nextUrl.searchParams.get('source') || ''
        const apiUrl = new URL('/api/embed/redirect', request.url)
        apiUrl.searchParams.set('source', slug)

        // Use a manual redirect so we can inspect the response headers.
        const resp = await fetch(apiUrl.toString(), { method: 'GET', redirect: 'manual' })
        if (resp.status >= 300 && resp.status < 400) {
          const loc = resp.headers.get('location')
          if (loc) return NextResponse.redirect(loc)
        }
        // If there's no redirect result, continue normal processing so the
        // app can render normally (no-op for unknown slugs).
      } catch (e) {
        console.error('Embed redirect lookup failed in middleware:', e)
        // swallow and continue
      }
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
