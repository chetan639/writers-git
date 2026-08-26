import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Read the HttpOnly cookie
  const token = request.cookies.get('gitwriter_jwt')?.value;
  const { pathname } = request.nextUrl;

  // Define public and protected routes
  const isAuthPage = pathname === '/';
  const isProtectedPage = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/setup') || 
                          pathname.startsWith('/workspace');

  // If logged out and trying to access a protected page, redirect to Login
  if (!token && isProtectedPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If logged in and trying to access the Login page, redirect to Dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Only run middleware on these specific routes
export const config = {
  matcher: ['/', '/dashboard', '/setup', '/workspace/:path*'],
};