import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { account, fail, sameOrigin, jsonBody } from "@/lib/auth";
import { recordCheckIn } from "@/lib/checkin";
import { wechatConfigured, wechatSimulationAvailable } from "@/lib/wechat";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  return NextResponse.json({
    lastCheckInAt: a.lastCheckInAt,
    interval: a.checkInInterval,
    enabled: a.reminderEnabled,
    phone: a.phonePreview || "",
    phoneVerified: !!a.phoneVerifiedAt,
    wechatBound: !!a.wechatBoundAt,
    wechatSubscribed: a.wechatSubscribed,
    reminderHour: a.wechatReminderHour,
  });
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  try {
    const b = await jsonBody(req);
    if (b.action === "settings") {
      if (
        !Number.isInteger(b.hour) ||
        b.hour < 6 ||
        b.hour > 23 ||
        typeof b.enabled !== "boolean"
      )
        return fail("请检查报平安设置");
      if (
        b.enabled &&
        !wechatConfigured() &&
        !wechatSimulationAvailable()
      )
        return fail("微信服务号尚未接入，暂不能开启每日提醒");
      if (b.enabled && (!a.wechatBoundAt || !a.wechatSubscribed))
        return fail("请先绑定并关注微信服务号");
      await db.account.update({
        where: { id: a.id },
        data: {
          checkInInterval: 24,
          reminderEnabled: b.enabled,
          wechatReminderHour: b.hour,
        },
      });
      return NextResponse.json({ success: true });
    }
    if (b.action !== "checkin") return fail("不支持的操作");
    const now = await recordCheckIn(a.id);
    return NextResponse.json({ success: true, lastCheckInAt: now });
  } catch {
    return fail("暂时无法保存，请重试", 500);
  }
}
