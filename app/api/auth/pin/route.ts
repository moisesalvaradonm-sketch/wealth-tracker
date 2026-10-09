import { NextResponse } from "next/server";
import { createSessionToken, COOKIE_NAME } from "@/lib/session";
import { checkRateLimit, clearRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      { status: 429 }
    );
  }

  const { pin } = await req.json();
  const correctPin = process.env.APP_PIN;

  if (!correctPin) {
    return NextResponse.json({ error: "PIN no configurado" }, { status: 503 });
  }

  if (pin !== correctPin) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  clearRateLimit(ip); // reset counter on success

  let token: string;
  try {
    token = createSessionToken();
  } catch {
    return NextResponse.json(
      { error: "APP_SESSION_SECRET no configurado" },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
