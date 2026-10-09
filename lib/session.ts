// Uses Web Crypto API — compatible with both Node.js 18+ and Edge Runtime

export const COOKIE_NAME = "wt_session";
const VERSION = "v2";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const s = process.env.APP_SESSION_SECRET;
  if (!s || s === "default-secret") throw new Error("APP_SESSION_SECRET not set");
  return s;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(s: string): ArrayBuffer {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  const key = await getKey(secret);
  const payload = JSON.stringify({ iat: Date.now(), jti: crypto.randomUUID() });
  const payloadB64 = toBase64url(new TextEncoder().encode(payload));
  const msg = new TextEncoder().encode(`${VERSION}.${payloadB64}`);
  const sigBuf = await crypto.subtle.sign("HMAC", key, msg);
  const sig = toBase64url(sigBuf);
  return `${VERSION}.${payloadB64}.${sig}`;
}

export async function validateSessionToken(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return false;
    const [ver, payloadB64, sig] = parts;

    const key = await getKey(secret);
    const msg = new TextEncoder().encode(`${ver}.${payloadB64}`);
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64url(sig), msg);
    if (!valid) return false;

    const { iat } = JSON.parse(new TextDecoder().decode(new Uint8Array(fromBase64url(payloadB64))));
    return typeof iat === "number" && Date.now() - iat <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
