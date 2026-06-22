import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === 'OPTIONS') {
    return cors(new NextResponse(null, { status: 204 }));
  }

  const publicPaths = ['/api/contact', '/api/auth/'];
  const publicGetPaths = ['/api/posts', '/api/projects', '/api/services'];

  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p));
  const isPublicGet = publicGetPaths.some(p => pathname === p || pathname.startsWith(p + '/')) && req.method === 'GET';

  if (isPublic || isPublicGet || pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
    return cors(NextResponse.next());
  }

  if (pathname.startsWith('/api/admin/init') || pathname.startsWith('/api/admin/verify')) {
    return cors(NextResponse.next());
  }

  if (pathname.startsWith('/api/')) {
    const key = req.headers.get('x-api-key');
    if (!key || key.split('_').length !== 3) {
      return cors(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
    }
  }

  return cors(NextResponse.next());
}

export const config = {
  matcher: '/api/:path*',
};
