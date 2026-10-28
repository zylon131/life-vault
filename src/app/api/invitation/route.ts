import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, hash, sameOrigin, jsonBody, rateLimit } from "@/lib/auth";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  try {
    const b = await jsonBody(req);
    if (typeof b.token !== "string" || !/^[0-9a-f]{64}$/.test(b.token))
      return fail("邀请凭证不完整");
    if (rateLimit("invite:" + hash(b.token), 30))
      return fail("请稍后再试", 429);
    const i = await db.invitation.findUnique({
      where: { hash: hash(b.token) },
      include: { account: true },
    });
    if (!i) return fail("邀请已失效，请向托付你的人确认是否已更新信钥", 404);
    if (b.action === "accept")
      await db.invitation.update({
        where: { hash: i.hash },
        data: { accepted: true },
      });
    if (b.action === "confirm") {
      if (
        !i.accepted ||
        typeof b.proof !== "string" ||
        hash(b.proof) !== i.proofHash
      )
        return fail("信钥与这份邀请不匹配，请核对对应的信钥文件");
      await db.invitation.update({
        where: { hash: i.hash },
        data: { confirmed: true },
      });
    }
    if (b.action === "withdraw") {
      await db.invitation.update({
        where: { hash: i.hash },
        data: { accepted: false, confirmed: false },
      });
      return NextResponse.json({ success: true, withdrawn: true });
    }
    if (b.action === "document") {
      if (!i.accepted || !i.confirmed)
        return fail("请先接受托付并确认保存信钥", 403);
      const doc = JSON.parse(i.account.document);
      return NextResponse.json({ doc: { ...doc, owner: undefined } });
    }
    return NextResponse.json({
      name: i.account.displayName,
      trustee: i.name,
      slot: i.slot,
      keyVersion: i.keyVersion,
      accepted: i.accepted || b.action === "accept",
      confirmed: i.confirmed || b.action === "confirm",
    });
  } catch {
    return fail("无法读取邀请，请检查链接后重试");
  }
}
