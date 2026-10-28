import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientIp,
  fail,
  hash,
  jsonBody,
  loginContext,
  sameOrigin,
  token,
} from "@/lib/auth";
import { lookupHash, normalizeEmail, protect, reveal } from "@/lib/pii";
import {
  createVerificationCode,
  sendVerificationCode,
  verifyCode,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

function setSession(response: NextResponse, raw: string, req: NextRequest) {
  response.cookies.set("yst_session", raw, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 30 * 86400,
  });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  try {
    const body = await jsonBody(req);

    if (body.action === "request") {
      const email = normalizeEmail(String(body.email || ""));
      const challenge = await createVerificationCode({
        channel: "EMAIL",
        purpose: "LOGIN",
        target: email,
        requestIp: clientIp(req),
      });
      try {
        const delivery = await sendVerificationCode(
          "EMAIL",
          email,
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
      const email = normalizeEmail(String(body.email || ""));
      const emailHash = lookupHash("email", email);
      const valid = await verifyCode({
        channel: "EMAIL",
        purpose: "LOGIN",
        target: email,
        code: String(body.code || ""),
      });
      if (!valid) return fail("验证码不正确或已经失效", 401);

      let user = await db.account.findUnique({ where: { emailHash } });
      if (!user) {
        const name =
          typeof body.name === "string" && body.name.trim()
            ? body.name.trim().slice(0, 40)
            : "朋友";
        user = await db.account.create({
          data: {
            emailHash,
            emailEncrypted: protect(email),
            emailVerifiedAt: new Date(),
            termsAcceptedAt: new Date(),
            displayName: name,
          },
        });
      } else {
        user = await db.account.update({
          where: { id: user.id },
          data: {
            emailEncrypted: protect(email),
            emailVerifiedAt: new Date(),
          },
        });
      }

      const raw = token();
      await db.$transaction([
        db.loginSession.deleteMany({
          where: { accountId: user.id, expiresAt: { lte: new Date() } },
        }),
        db.loginSession.create({
          data: {
            hash: hash(raw),
            accountId: user.id,
            expiresAt: new Date(Date.now() + 30 * 86400000),
            verifiedAt: new Date(),
          },
        }),
      ]);
      const response = NextResponse.json({
        id: user.id,
        email,
        name: user.displayName,
      });
      setSession(response, raw, req);
      return response;
    }

    const context = await loginContext(req);
    if (!context) return fail("请先登录", 401);
    if (!context.account.emailEncrypted)
      return fail("这个内测账号还没有绑定邮箱，请重新注册", 409);
    const email = reveal(context.account.emailEncrypted);

    if (body.action === "request-sensitive") {
      const challenge = await createVerificationCode({
        channel: "EMAIL",
        purpose: "SENSITIVE",
        target: email,
        accountId: context.account.id,
        sessionHash: context.session.hash,
        requestIp: clientIp(req),
      });
      try {
        const delivery = await sendVerificationCode(
          "EMAIL",
          email,
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

    if (body.action === "verify-sensitive") {
      const valid = await verifyCode({
        channel: "EMAIL",
        purpose: "SENSITIVE",
        target: email,
        code: String(body.code || ""),
        accountId: context.account.id,
        sessionHash: context.session.hash,
      });
      if (!valid) return fail("验证码不正确或已经失效", 401);
      await db.loginSession.update({
        where: { hash: context.session.hash },
        data: { verifiedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return fail("不支持的操作");
  } catch (error) {
    if (error instanceof Error && error.message === "CODE_RATE_LIMIT")
      return fail("验证码发送得太频繁，请稍后再试", 429);
    if (error instanceof Error && error.message === "CHANNEL_UNAVAILABLE")
      return fail("邮件验证码服务尚未配置，暂时无法发送", 503);
    if (
      error instanceof Error &&
      (error.message.includes("邮箱") || error.message.includes("PII_"))
    )
      return fail(error.message);
    return fail("暂时无法完成验证，请稍后再试", 500);
  }
}
