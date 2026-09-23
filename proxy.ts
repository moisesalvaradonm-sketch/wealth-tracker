import { NextResponse, type NextRequest } from "next/server";

function isValidSession(request: NextRequest): boolean {
  const token = request.cookies.get("wt_session")?.value;
  if (!token) return false;
  try {
    const secret = process.env.APP_SESSION_SECRET ?? "default-secret";
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.startsWith(`${secret}:`);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api/");

  // Rutas de API públicas que no necesitan sesión
  const isPublicApi = pathname.startsWith("/api/auth/pin") || pathname.startsWith("/api/shortcuts/");
  if (isApiRoute && isPublicApi) return NextResponse.next();

  // Rutas de API protegidas — chequear cookie
  if (isApiRoute) {
    if (!isValidSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const hasSession = isValidSession(request);

  if (!hasSession && !isLoginRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && isLoginRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
