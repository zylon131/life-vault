import { db } from "./db";
import { deliver } from "./notifications";
import { reveal } from "./pii";
import { hash, token } from "./auth";

export async function createWechatCheckInLink(accountId: string) {
  const raw = token();
  await db.wechatCheckInLink.create({
    data: {
      tokenHash: hash(raw),
      accountId,
      expiresAt: new Date(Date.now() + 36 * 60 * 60_000),
    },
  });
  return raw;
}

export async function recordCheckIn(accountId: string) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("账号不存在");
  const previousAt = account.lastCheckInAt;
  const now = new Date();
  await db.account.update({
    where: { id: accountId },
    data: { lastCheckInAt: now },
  });
  const alertKey = `${accountId}:${previousAt.toISOString()}:ALERT`;
  const alert = await db.delivery.findUnique({ where: { eventKey: alertKey } });
  if (alert?.status === "SENT") {
    const trustees = await db.invitation.findMany({
      where: { accountId, accepted: true, confirmed: true },
    });
    await deliver(
      accountId,
      `${accountId}:${previousAt.toISOString()}:RECOVERED`,
      "RECOVERED",
      trustees.map((trustee) =>
        trustee.contactEncrypted
          ? reveal(trustee.contactEncrypted)
          : trustee.contact,
      ),
      account.displayName,
    );
  }
  return now;
}
