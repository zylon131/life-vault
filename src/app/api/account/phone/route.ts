import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientIp,
  fail,
  jsonBody,
  loginContext,
  sameOrigin,
} from "@/lib/auth";
import { maskPhone, normalizePhone, protect } from "@/lib/pii";
import {
  createVerificationCode,
  sendVerificationCode,
  verifyCode,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const context = await loginContext(req);
  if (!context) return fail("请先登录", 401);
  try {
    const body = await jsonBody(req);
    if (body.action === "request") {
      const phone = normalizePhone(String(body.phone || ""));
      const challenge = await createVerificationCode({
        channel: "SMS",
        purpose: "PHONE_BIND",
        target: phone,
        accountId: context.account.id,
        sessionHash: context.session.hash,
        requestIp: clientIp(req),
      });
      try {
        const delivery = await sendVerificationCode(
          "SMS",
          phone,
          challenge.code,
        );
        return NextResponse.json({
          success: true,
          ...(delivery.simulated ? { devCode: challenge.code } : {}),
        });
      } catch (error) {
        await db.verificationCode.delete({ where: { id: challenge.row.id } });
        throw error;
      }
    }

    if (body.action === "verify") {
      const phone = normalizePhone(String(body.phone || ""));
      if (body.consent !== true)
        return fail("请先确认同意接收必要的短信提醒");
      const valid = await verifyCode({
        channel: "SMS",
        purpose: "PHONE_BIND",
        target: phone,
        code: String(body.code || ""),
        accountId: context.account.id,
        sessionHash: context.session.hash,
      });
      if (!valid) return fail("验证码不正确或已经失效", 401);
      const preview = maskPhone(phone);
      await db.account.update({
        where: { id: context.account.id },
        data: {
          phoneEncrypted: protect(phone),
          phonePreview: preview,
          phoneVerifiedAt: new Date(),
          smsConsentAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, phone: preview });
    }

    if (body.action === "remove") {
      await db.account.update({
        where: { id: context.account.id },
        data: {
          phoneEncrypted: null,
          phonePreview: null,
          phoneVerifiedAt: null,
          smsConsentAt: null,
        },
      });
      return NextResponse.json({ success: true });
    }
    return fail("不支持的操作");
  } catch (error) {
    if (error instanceof Error && error.message === "CODE_RATE_LIMIT")
      return fail("验证码发送得太频繁，请稍后再试", 429);
    if (error instanceof Error && error.message === "CHANNEL_UNAVAILABLE")
      return fail("短信验证码服务尚未配置，暂时无法发送", 503);
    if (error instanceof Error && error.message.includes("手机号"))
      return fail(error.message);
    return fail("暂时无法完成手机号验证，请稍后再试", 500);
  }
}
