import { NextRequest, NextResponse } from "next/server";
import { hash } from "@/lib/auth";
import { recordCheckIn } from "@/lib/checkin";
import { db } from "@/lib/db";
import { lookupHash, reveal } from "@/lib/pii";
import {
  exchangeWechatOAuthCode,
  wechatConfigured,
  wechatSimulationAvailable,
} from "@/lib/wechat";

function result(req: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/checkin-success?status=${status}`, req.url));
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token") || "";
  if (!/^[0-9a-f]{64}$/.test(raw)) return result(req, "invalid");
  const link = await db.wechatCheckInLink.findUnique({
    where: { tokenHash: hash(raw) },
    include: { account: true },
  });
  if (!link || link.consumedAt || link.expiresAt <= new Date())
    return result(req, "expired");

  let openId = "";
  const simulated =
    req.nextUrl.searchParams.get("mock") === "1" &&
    wechatSimulationAvailable();
  if (simulated) {
    openId = reveal(link.account.wechatOpenIdEncrypted || "");
  } else {
    if (!wechatConfigured() || !process.env.WECHAT_APP_ID)
      return result(req, "unavailable");
    const code = req.nextUrl.searchParams.get("code");
    const expectedState = hash(raw).slice(0, 24);
    if (!code) {
      const callback = new URL(
        "/api/wechat/checkin",
        process.env.APP_ORIGIN || req.nextUrl.origin,
      );
      callback.searchParams.set("token", raw);
      const oauth = new URL("https://open.weixin.qq.com/connect/oauth2/authorize");
      oauth.searchParams.set("appid", process.env.WECHAT_APP_ID);
      oauth.searchParams.set("redirect_uri", callback.toString());
      oauth.searchParams.set("response_type", "code");
      oauth.searchParams.set("scope", "snsapi_base");
      oauth.searchParams.set("state", expectedState);
      oauth.hash = "wechat_redirect";
      return NextResponse.redirect(oauth);
    }
    if (req.nextUrl.searchParams.get("state") !== expectedState)
      return result(req, "invalid");
    try {
      openId = await exchangeWechatOAuthCode(code);
    } catch {
      return result(req, "unavailable");
    }
  }

  if (
    !link.account.wechatOpenIdHash ||
    lookupHash("wechat-openid", openId) !== link.account.wechatOpenIdHash
  )
    return result(req, "wrong-wechat");
  const consumed = await db.wechatCheckInLink.updateMany({
    where: {
      tokenHash: link.tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  if (!consumed.count) return result(req, "expired");
  await recordCheckIn(link.accountId);
  return result(req, "ok");
}
