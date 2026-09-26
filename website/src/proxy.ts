import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveAllowedOrigin } from '@/lib/cors'

const LOCALES = ['en', 'zh-TW'] as const
const DEFAULT_LOCALE = 'en'
const SECTIONS = ['about', 'portfolio', 'blog', 'services', 'resume', 'contact'] as const

const ALLOW_HEADERS = 'Content-Type, X-Api-Key, X-Admin-Init-Token'
const ALLOW_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'

function cors(res: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigin = resolveAllowedOrigin(origin)
  if (allowedOrigin) {
    res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  }
  res.headers.set('Access-Control-Allow-Methods', ALLOW_METHODS)
  res.headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS)
  return res
}

// Locale priority for requests without an explicit locale in the path:
// valid locale cookie → Accept-Language → default.
function pickLocale(request: NextRequest): 'en' | 'zh-TW' {
  const cookie = request.cookies.get('locale')?.value
  if (cookie === 'en' || cookie === 'zh-TW') return cookie
  const accept = (request.headers.get('accept-language') || '').toLowerCase()
  return accept.startsWith('zh') ? 'zh-TW' : DEFAULT_LOCALE
}

// Legacy homepage ?tab= links map to the dedicated route, consuming only the
// known tab param so all other query params survive.
function tabTarget(request: NextRequest, locale: string): URL | null {
  const tab = request.nextUrl.searchParams.get('tab')
  if (!(SECTIONS as readonly string[]).includes(tab || '')) return null
  const params = new URLSearchParams(request.nextUrl.searchParams)
  params.delete('tab')
  const qs = params.toString()
  return new URL(`/${locale}/${tab}${qs ? `?${qs}` : ''}`, request.url)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/icon.svg' || pathname === '/manifest.webmanifest') {
    return cors(NextResponse.next(), request)
  }

  if (pathname.startsWith('/api')) {
    if (request.method === 'OPTIONS') {
      return cors(new NextResponse(null, { status: 204 }), request)
    }

    const publicPaths = ['/api/contact', '/api/auth/']
    const publicGetPaths = ['/api/posts', '/api/projects', '/api/services', '/api/settings']

    const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p))
    const isPublicGet = publicGetPaths.some(p => (pathname === p || pathname.startsWith(p + '/'))) && request.method === 'GET'

    if (isPublic || isPublicGet) {
      return cors(NextResponse.next(), request)
    }

    if (pathname.startsWith('/api/admin/init') || pathname.startsWith('/api/admin/verify')) {
      return cors(NextResponse.next(), request)
    }

    const key = request.headers.get('x-api-key')
    if (!key || key.split('_').length !== 3) {
      return cors(NextResponse.json({ error: 'unauthorized' }, { status: 401 }), request)
    }

    return cors(NextResponse.next(), request)
  }

  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    return cors(NextResponse.next(), request)
  }

  const pathLocale = LOCALES.find(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )

  if (pathLocale) {
    const internalPath = pathname === `/${pathLocale}` ? '/' : pathname.slice(`/${pathLocale}`.length)

    if (internalPath === '/') {
      const target = tabTarget(request, pathLocale)
      if (target) return NextResponse.redirect(target)
    }

    const url = new URL(internalPath, request.url)
    url.search = request.nextUrl.search
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', pathLocale)
    requestHeaders.set('x-pathname', internalPath)
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    response.headers.set('x-locale', pathLocale)
    response.cookies.set('locale', pathLocale, { maxAge: 31_536_000 })
    return response
  }

  const locale = pickLocale(request)

  if (pathname === '/') {
    const target = tabTarget(request, locale)
    if (target) return NextResponse.redirect(target)
  }

  const target = new URL(`/${locale}${pathname}`, request.url)
  target.search = request.nextUrl.search
  return NextResponse.redirect(target)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
