import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "wt_session";
const VERSION = "v2";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const s = process.env.APP_SESSION_SECRET;
  if (!s || s === "default-secret") throw new Error("APP_SESSION_SECRET not set");
  return s;
}

export function createSessionToken(): string {
  const secret = getSecret();
  const payload = JSON.stringify({ iat: Date.now(), jti: randomBytes(16).toString("hex") });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`${VERSION}.${payloadB64}`)
    .digest("base64url");
  return `${VERSION}.${payloadB64}.${sig}`;
}

export function validateSessionToken(token: string): boolean {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return false;
    const [ver, payloadB64, sig] = parts;

    const expectedSig = createHmac("sha256", secret)
      .update(`${ver}.${payloadB64}`)
      .digest("base64url");

    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

    const { iat } = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    return typeof iat === "number" && Date.now() - iat <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
