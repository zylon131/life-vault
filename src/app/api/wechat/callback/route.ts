import { NextRequest, NextResponse } from "next/server";
import { hash } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupHash, protect } from "@/lib/pii";
import { parseWechatEvent, verifyWechatSignature } from "@/lib/wechat";

function text(value: string, status = 200) {
  return new NextResponse(value, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (
    !verifyWechatSignature(
      searchParams.get("signature") || "",
      searchParams.get("timestamp") || "",
      searchParams.get("nonce") || "",
    )
  )
    return text("invalid signature", 403);
  return text(searchParams.get("echostr") || "success");
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (
    !verifyWechatSignature(
      searchParams.get("signature") || "",
      searchParams.get("timestamp") || "",
      searchParams.get("nonce") || "",
    )
  )
    return text("invalid signature", 403);
  try {
    const event = parseWechatEvent(await req.text());
    if (!event.fromUserName) return text("success");
    const openIdHash = lookupHash("wechat-openid", event.fromUserName);
    if (event.event.toLowerCase() === "unsubscribe") {
      await db.account.updateMany({
        where: { wechatOpenIdHash: openIdHash },
        data: { wechatSubscribed: false, reminderEnabled: false },
      });
      return text("success");
    }
    if (!["subscribe", "scan"].includes(event.event.toLowerCase()))
      return text("success");
    const scene = event.eventKey.replace(/^qrscene_/, "");
    if (!scene) return text("success");
    const challenge = await db.wechatBindingChallenge.findUnique({
      where: { tokenHash: hash(scene) },
    });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date())
      return text("success");
    const alreadyBound = await db.account.findUnique({
      where: { wechatOpenIdHash: openIdHash },
    });
    if (alreadyBound && alreadyBound.id !== challenge.accountId)
      return text("success");
    await db.$transaction([
      db.wechatBindingChallenge.update({
        where: { tokenHash: challenge.tokenHash },
        data: { consumedAt: new Date() },
      }),
      db.account.update({
        where: { id: challenge.accountId },
        data: {
          wechatOpenIdHash: openIdHash,
          wechatOpenIdEncrypted: protect(event.fromUserName),
          wechatBoundAt: new Date(),
          wechatSubscribed: true,
        },
      }),
    ]);
  } catch {
    // WeChat retries callbacks. Returning success prevents repeated invalid events.
  }
  return text("success");
}
