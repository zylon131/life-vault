import { NextRequest, NextResponse } from "next/server";
import { account, fail, jsonBody, sameOrigin } from "@/lib/auth";
import { createWechatCheckInLink } from "@/lib/checkin";
import { wechatSimulationAvailable } from "@/lib/wechat";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const current = await account(req);
  if (!current) return fail("请先登录", 401);
  if (!wechatSimulationAvailable()) return fail("仅本地开发环境可模拟消息", 403);
  await jsonBody(req);
  if (!current.wechatBoundAt || !current.wechatSubscribed)
    return fail("请先模拟绑定微信");
  const raw = await createWechatCheckInLink(current.id);
  return NextResponse.json({
    url: `/api/wechat/checkin?token=${raw}&mock=1`,
  });
}
