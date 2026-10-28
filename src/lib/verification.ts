import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { db } from "./db";
import { lookupHash, protect } from "./pii";

export type VerificationChannel = "EMAIL" | "SMS";
export type VerificationPurpose = "LOGIN" | "SENSITIVE" | "PHONE_BIND";

function secret() {
  return process.env.PII_ENCRYPTION_KEY || "有所托-local-development-code-key";
}

export function verificationCodeHash(
  targetHash: string,
  purpose: VerificationPurpose,
  code: string,
) {
  return createHmac("sha256", secret())
    .update(`${purpose}\0${targetHash}\0${code}`)
    .digest("hex");
}

export async function createVerificationCode(input: {
  channel: VerificationChannel;
  purpose: VerificationPurpose;
  target: string;
  accountId?: string;
  sessionHash?: string;
  requestIp: string;
}) {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60_000);
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const targetHash = lookupHash(input.channel.toLowerCase(), input.target);
  const requestIpHash = lookupHash("request-ip", input.requestIp || "unknown");
  const [recentTarget, hourlyTarget, hourlyIp] = await Promise.all([
    db.verificationCode.count({
      where: {
        targetHash,
        purpose: input.purpose,
        createdAt: { gte: minuteAgo },
      },
    }),
    db.verificationCode.count({
      where: { targetHash, createdAt: { gte: hourAgo } },
    }),
    db.verificationCode.count({
      where: { requestIpHash, createdAt: { gte: hourAgo } },
    }),
  ]);
  if (recentTarget || hourlyTarget >= 6 || hourlyIp >= 30)
    throw new Error("CODE_RATE_LIMIT");

  const code = String(randomInt(100000, 1_000_000));
  await db.verificationCode.updateMany({
    where: {
      channel: input.channel,
      purpose: input.purpose,
      targetHash,
      accountId: input.accountId,
      sessionHash: input.sessionHash,
      consumedAt: null,
    },
    data: { consumedAt: now },
  });
  const row = await db.verificationCode.create({
    data: {
      channel: input.channel,
      purpose: input.purpose,
      targetHash,
      targetEncrypted: protect(input.target),
      codeHash: verificationCodeHash(targetHash, input.purpose, code),
      accountId: input.accountId,
      sessionHash: input.sessionHash,
      requestIpHash,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    },
  });
  return { row, code, targetHash };
}

export async function verifyCode(input: {
  channel: VerificationChannel;
  purpose: VerificationPurpose;
  target: string;
  code: string;
  accountId?: string;
  sessionHash?: string;
}) {
  if (!/^\d{6}$/.test(input.code)) return false;
  const targetHash = lookupHash(input.channel.toLowerCase(), input.target);
  const row = await db.verificationCode.findFirst({
    where: {
      channel: input.channel,
      purpose: input.purpose,
      targetHash,
      accountId: input.accountId,
      sessionHash: input.sessionHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return false;
  const expected = Buffer.from(row.codeHash, "hex");
  const received = Buffer.from(
    verificationCodeHash(targetHash, input.purpose, input.code),
    "hex",
  );
  const valid =
    expected.length === received.length && timingSafeEqual(expected, received);
  if (!valid) {
    await db.verificationCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }
  const consumed = await db.verificationCode.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count)
    await db.verificationCode.updateMany({
      where: {
        channel: input.channel,
        purpose: input.purpose,
        targetHash,
        accountId: input.accountId,
        sessionHash: input.sessionHash,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });
  return consumed.count === 1;
}

export async function sendVerificationCode(
  channel: VerificationChannel,
  target: string,
  code: string,
) {
  const url =
    channel === "EMAIL"
      ? process.env.AUTH_EMAIL_WEBHOOK_URL
      : process.env.SMS_WEBHOOK_URL;
  const webhookSecret =
    channel === "EMAIL"
      ? process.env.AUTH_EMAIL_WEBHOOK_SECRET
      : process.env.SMS_WEBHOOK_SECRET;
  if (!url || !webhookSecret) {
    if (process.env.NODE_ENV !== "production") return { simulated: true };
    throw new Error("CHANNEL_UNAVAILABLE");
  }
  if (!url.startsWith("https://")) throw new Error("CHANNEL_UNAVAILABLE");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify({
      channel: channel.toLowerCase(),
      to: target,
      template: channel === "EMAIL" ? "login-code" : "phone-bind-code",
      code,
      expiresInMinutes: 10,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("CHANNEL_UNAVAILABLE");
  return { simulated: false };
}
