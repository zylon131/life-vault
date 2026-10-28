import { randomBytes, createHash, scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function passwordHash(password: string) {
  const salt = token();
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, stored: string) {
  const [salt, value] = stored.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(value, "hex"),
  );
}
export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export async function loginContext(req: NextRequest) {
  const raw = req.cookies.get("yst_session")?.value;
  if (!raw) return null;
  const session = await db.loginSession.findUnique({
    where: { hash: hash(raw) },
    include: { account: true },
  });
  return session && session.expiresAt > new Date()
    ? { raw, session, account: session.account }
    : null;
}
export async function account(req: NextRequest) {
  return (await loginContext(req))?.account || null;
}
export async function recentlyVerified(req: NextRequest, minutes = 10) {
  const context = await loginContext(req);
  return !!(
    context &&
    context.session.verifiedAt.getTime() > Date.now() - minutes * 60_000
  );
}
export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return (
    origin === req.nextUrl.origin ||
    (!!process.env.APP_ORIGIN && origin === process.env.APP_ORIGIN)
  );
}
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 12) {
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.until < now) {
    buckets.set(key, { count: 1, until: now + 60000 });
    return false;
  }
  return ++b.count > max;
}
export async function jsonBody(req: NextRequest) {
  const s = await req.text();
  if (s.length > 1500000) throw new Error("内容过大，首版仅支持文字交代");
  return JSON.parse(s);
}
