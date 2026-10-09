// In-memory rate limiter. Works per serverless instance — good enough for a single-user app.
const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX = 5;
const WINDOW = 60_000; // 1 minute

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW });
    return true;
  }
  if (rec.count >= MAX) return false;
  rec.count++;
  return true;
}

export function clearRateLimit(ip: string) {
  attempts.delete(ip);
}
