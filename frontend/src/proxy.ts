import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "hsc95_session";

/**
 * Optimistic redirect only: if there is no session cookie at all, send the
 * visitor to the right login page before rendering a protected screen.
 * Real authentication and authorisation happen in the NestJS API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/backend/login", request.url));
}

export const config = {
  matcher: [
    "/backend/dashboard/:path*",
    "/backend/registrations/:path*",
    "/backend/tokens/:path*",
    "/backend/users/:path*",
  ],
};
