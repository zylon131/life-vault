import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail } from "@/lib/auth";
import { createWechatCheckInLink } from "@/lib/checkin";
import { deliver } from "@/lib/notifications";
import { reveal } from "@/lib/pii";
import { sendCheckInTemplateMessage, wechatConfigured } from "@/lib/wechat";

export const dynamic = "force-dynamic";

function chinaClock(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

function chinaDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function sendWechatPrompt(accountId: string, date: string) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (
    !account?.reminderEnabled ||
    !account.wechatSubscribed ||
    !account.wechatOpenIdEncrypted
  )
    return false;
  const eventKey = `${accountId}:${date}:WECHAT_PROMPT`;
  const row = await db.delivery.upsert({
    where: { eventKey },
    create: { accountId, eventKey },
    update: {},
  });
  if (row.status === "SENT") return true;
  const lease = await db.delivery.updateMany({
    where: { id: row.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "SENDING", createdAt: new Date() },
  });
  if (!lease.count) return false;
  try {
    const raw = await createWechatCheckInLink(accountId);
    const origin = process.env.APP_ORIGIN || "";
    if (!origin.startsWith("https://"))
      throw new Error("生产环境报平安链接必须使用 HTTPS");
    const url = new URL("/api/wechat/checkin", origin);
    url.searchParams.set("token", raw);
    await sendCheckInTemplateMessage({
      openId: reveal(account.wechatOpenIdEncrypted),
      userName: account.displayName,
      checkInUrl: url.toString(),
      reminderTime: `${date} ${String(account.wechatReminderHour).padStart(2, "0")}:00`,
    });
    await db.delivery.update({
      where: { id: row.id },
      data: { status: "SENT" },
    });
    return true;
  } catch {
    await db.delivery.update({
      where: { id: row.id },
      data: { status: "FAILED" },
    });
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (
    !process.env.SCHEDULER_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.SCHEDULER_SECRET}`
  )
    return fail("无权执行", 401);
  if (!wechatConfigured()) return fail("微信服务号通知通道未配置", 503);
  const accounts = await db.account.findMany({
    where: { reminderEnabled: true },
    include: { invitations: true },
  });
  const now = new Date();
  const clock = chinaClock(now);
  let sent = 0;
  let failed = 0;
  for (const account of accounts) {
    if (
      clock.hour >= account.wechatReminderHour &&
      chinaDate(account.lastCheckInAt) !== clock.date
    ) {
      if (await sendWechatPrompt(account.id, clock.date)) sent++;
      else failed++;
    }
    const elapsedHours = (now.getTime() - account.lastCheckInAt.getTime()) / 3_600_000;
    const kind = elapsedHours >= 72 ? "ALERT" : elapsedHours >= 48 ? "FALLBACK" : "";
    if (!kind) continue;
    const recipients =
      kind === "FALLBACK"
        ? account.phoneEncrypted && account.phoneVerifiedAt && account.smsConsentAt
          ? [reveal(account.phoneEncrypted)]
          : []
        : account.invitations
            .filter((trustee) => trustee.accepted && trustee.confirmed)
            .map((trustee) =>
              trustee.contactEncrypted
                ? reveal(trustee.contactEncrypted)
                : trustee.contact,
            );
    if (!recipients.length) continue;
    const fresh = await db.account.findUnique({ where: { id: account.id } });
    if (
      !fresh?.reminderEnabled ||
      fresh.lastCheckInAt.getTime() !== account.lastCheckInAt.getTime()
    )
      continue;
    const ok = await deliver(
      account.id,
      `${account.id}:${account.lastCheckInAt.toISOString()}:${kind}`,
      kind,
      recipients,
      account.displayName,
    );
    if (ok) sent++;
    else failed++;
  }
  return NextResponse.json({ sent, failed });
}
