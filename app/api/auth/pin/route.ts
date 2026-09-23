import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pin } = await req.json();
  const correctPin = process.env.APP_PIN;

  if (!correctPin) {
    return NextResponse.json({ error: "PIN no configurado" }, { status: 503 });
  }

  if (pin !== correctPin) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const secret = process.env.APP_SESSION_SECRET ?? "default-secret";
  // Simple token: base64(secret + timestamp)
  const token = Buffer.from(`${secret}:${Date.now()}`).toString("base64");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("wt_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("wt_session");
  return res;
}
