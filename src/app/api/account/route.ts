import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  account,
  fail,
  hash,
  sameOrigin,
  jsonBody,
} from "@/lib/auth";
import { reveal } from "@/lib/pii";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  return NextResponse.json({
    id: a.id,
    email: a.emailEncrypted ? reveal(a.emailEncrypted) : "",
    name: a.displayName,
  });
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  try {
    const b = await jsonBody(req);
    if (b.action === "logout") {
      const raw = req.cookies.get("yst_session")?.value;
      if (raw) await db.loginSession.deleteMany({ where: { hash: hash(raw) } });
      const r = NextResponse.json({ success: true });
      r.cookies.delete("yst_session");
      return r;
    }
    return fail("不支持的操作");
  } catch {
    return fail("暂时无法完成操作，请稍后再试", 500);
  }
}
