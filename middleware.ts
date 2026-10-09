import { NextResponse, type NextRequest } from "next/server";
import { validateSessionToken, COOKIE_NAME } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Shortcuts and setup are public (each has its own auth layer)
  const isPublicApi =
    pathname.startsWith("/api/auth/pin") ||
    pathname.startsWith("/api/shortcuts/") ||
    pathname.startsWith("/api/setup");

  if (pathname.startsWith("/api/") && isPublicApi) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? validateSessionToken(token) : false;

  if (pathname.startsWith("/api/")) {
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  const isLogin = pathname === "/login" || pathname.startsWith("/login");

  if (!valid && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (valid && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
