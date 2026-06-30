import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['en', 'zh-TW'] as const
const DEFAULT_LOCALE = 'en'

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')
  return res
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/icon.svg' || pathname === '/manifest.webmanifest') {
    return cors(NextResponse.next())
  }

  if (pathname.startsWith('/api')) {
    if (request.method === 'OPTIONS') {
      return cors(new NextResponse(null, { status: 204 }))
    }

    const publicPaths = ['/api/contact', '/api/auth/']
    const publicGetPaths = ['/api/posts', '/api/projects', '/api/services', '/api/settings']

    const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p))
    const isPublicGet = publicGetPaths.some(p => (pathname === p || pathname.startsWith(p + '/'))) && request.method === 'GET'

    if (isPublic || isPublicGet) {
      return cors(NextResponse.next())
    }

    if (pathname.startsWith('/api/admin/init') || pathname.startsWith('/api/admin/verify')) {
      return cors(NextResponse.next())
    }

    const key = request.headers.get('x-api-key')
    if (!key || key.split('_').length !== 3) {
      return cors(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
    }

    return cors(NextResponse.next())
  }

  if (pathname.includes('.') && !pathname.startsWith('/')) {
    return NextResponse.next()
  }

  const pathLocale = LOCALES.find(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )

  if (pathLocale) {
    const newPath = pathname === `/${pathLocale}` ? '/' : pathname.replace(`/${pathLocale}`, '')
    const url = new URL(newPath, request.url)
    const response = NextResponse.rewrite(url)
    response.headers.set('x-locale', pathLocale)
    response.cookies.set('locale', pathLocale, { maxAge: 31_536_000 })
    return response
  }

  const accept = request.headers.get('accept-language') || ''
  const locale = accept.startsWith('zh') ? 'zh-TW' : DEFAULT_LOCALE
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
