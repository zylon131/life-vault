import { NextRequest, NextResponse } from "next/server";
import { account, fail, hash, jsonBody, sameOrigin, token } from "@/lib/auth";
import { db } from "@/lib/db";
import { lookupHash, protect } from "@/lib/pii";
import {
  createWechatBindingQr,
  wechatConfigured,
  wechatSimulationAvailable,
} from "@/lib/wechat";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const current = await account(req);
  if (!current) return fail("请先登录", 401);
  const latest = await db.account.findUnique({ where: { id: current.id } });
  return NextResponse.json({
    bound: !!latest?.wechatBoundAt,
    subscribed: !!latest?.wechatSubscribed,
    simulated: wechatSimulationAvailable(),
  });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const current = await account(req);
  if (!current) return fail("请先登录", 401);
  try {
    const body = await jsonBody(req);
    if (body.action === "request") {
      const raw = token();
      await db.$transaction([
        db.wechatBindingChallenge.deleteMany({
          where: { accountId: current.id },
        }),
        db.wechatBindingChallenge.create({
          data: {
            tokenHash: hash(raw),
            accountId: current.id,
            expiresAt: new Date(Date.now() + 10 * 60_000),
          },
        }),
      ]);
      if (wechatSimulationAvailable())
        return NextResponse.json({
          token: raw,
          simulated: true,
          expiresAt: Date.now() + 10 * 60_000,
        });
      if (!wechatConfigured()) return fail("微信服务号尚未配置", 503);
      return NextResponse.json({
        qrUrl: await createWechatBindingQr(raw),
        simulated: false,
        expiresAt: Date.now() + 10 * 60_000,
      });
    }
    if (body.action === "simulate") {
      if (!wechatSimulationAvailable()) return fail("不能模拟微信绑定", 403);
      if (typeof body.token !== "string") return fail("绑定二维码已失效");
      const challenge = await db.wechatBindingChallenge.findUnique({
        where: { tokenHash: hash(body.token) },
      });
      if (
        !challenge ||
        challenge.accountId !== current.id ||
        challenge.consumedAt ||
        challenge.expiresAt <= new Date()
      )
        return fail("绑定二维码已失效，请重新生成");
      const openId = `mock:${current.id}`;
      await db.$transaction([
        db.wechatBindingChallenge.update({
          where: { tokenHash: challenge.tokenHash },
          data: { consumedAt: new Date() },
        }),
        db.account.update({
          where: { id: current.id },
          data: {
            wechatOpenIdHash: lookupHash("wechat-openid", openId),
            wechatOpenIdEncrypted: protect(openId),
            wechatBoundAt: new Date(),
            wechatSubscribed: true,
          },
        }),
      ]);
      return NextResponse.json({ success: true });
    }
    if (body.action === "unbind") {
      await db.$transaction([
        db.wechatBindingChallenge.deleteMany({
          where: { accountId: current.id },
        }),
        db.wechatCheckInLink.deleteMany({ where: { accountId: current.id } }),
        db.account.update({
          where: { id: current.id },
          data: {
            wechatOpenIdHash: null,
            wechatOpenIdEncrypted: null,
            wechatBoundAt: null,
            wechatSubscribed: false,
            reminderEnabled: false,
          },
        }),
      ]);
      return NextResponse.json({ success: true });
    }
    return fail("不支持的操作");
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "微信绑定没有完成";
    return fail(message, 400);
  }
}
