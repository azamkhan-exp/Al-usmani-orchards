import { NextRequest, NextResponse } from 'next/server';
import { verifySignedSessionToken } from '@/lib/auth/tokens';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('auo_session')?.value || req.cookies.get('shahi_session')?.value;

  const isLoginPage = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin') && !isLoginPage;
  const isAccountRoute = pathname.startsWith('/account');

  const isApiRequest = pathname.startsWith('/api') || req.headers.get('accept')?.includes('application/json');

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-pathname', pathname);

  // If user is accessing /admin/login and is ALREADY authenticated as admin, redirect to /admin
  if (isLoginPage && sessionCookie) {
    const { valid, payload } = await verifySignedSessionToken(sessionCookie);
    const adminRoles = [
      'SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'INVENTORY_MANAGER',
      'ORDER_MANAGER', 'MARKETING_MANAGER', 'SUPPORT_AGENT'
    ];
    if (valid && payload && adminRoles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  // If visiting an administrative route or patron account route
  if (isAdminRoute || isAccountRoute) {
    if (!sessionCookie) {
      if (isApiRequest) {
        return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
      }
      const targetLogin = isAdminRoute ? '/admin/login' : '/login';
      const loginUrl = new URL(targetLogin, req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { valid, payload } = await verifySignedSessionToken(sessionCookie);

    // If signature verification fails or session is expired
    if (!valid || !payload) {
      if (isApiRequest) {
        const res = NextResponse.json({ error: 'Unauthorized: Session expired or invalid.' }, { status: 401 });
        res.cookies.delete('auo_session');
        res.cookies.delete('shahi_session');
        return res;
      }
      const targetLogin = isAdminRoute ? '/admin/login' : '/login';
      const loginUrl = new URL(targetLogin, req.url);
      loginUrl.searchParams.set('error', 'Session Expired or Invalid');
      loginUrl.searchParams.set('redirect', pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('auo_session');
      res.cookies.delete('shahi_session');
      return res;
    }

    // Role-based access control for administrative command center
    if (isAdminRoute) {
      const adminRoles = [
        'SUPER_ADMIN',
        'ADMIN',
        'FINANCE_MANAGER',
        'INVENTORY_MANAGER',
        'ORDER_MANAGER',
        'MARKETING_MANAGER',
        'SUPPORT_AGENT'
      ];

      if (!adminRoles.includes(payload.role) || payload.role === 'CUSTOMER') {
        // Customers are strictly prohibited from viewing or accessing administrative routes
        if (isApiRequest) {
          return NextResponse.json({ error: 'Forbidden: Administrative access restricted.' }, { status: 403 });
        }
        const deniedUrl = new URL('/admin/login', req.url);
        deniedUrl.searchParams.set('error', "You don't have permission to access the admin dashboard.");
        deniedUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(deniedUrl);
      }

      // Legitimate admin access: Attach search engine indexing prevention and security headers
      const res = NextResponse.next({
        request: {
          headers: reqHeaders
        }
      });
      res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-Content-Type-Options', 'nosniff');
      return res;
    }

    // Account route protection
    if (isAccountRoute) {
      const res = NextResponse.next({
        request: {
          headers: reqHeaders
        }
      });
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
  }

  return NextResponse.next({
    request: {
      headers: reqHeaders
    }
  });
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*']
};
