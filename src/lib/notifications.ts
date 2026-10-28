import { db } from "./db";
export async function deliver(
  accountId: string,
  eventKey: string,
  kind: string,
  recipients: string[],
  name: string,
) {
  if (
    !process.env.NOTIFICATION_WEBHOOK_URL ||
    !process.env.NOTIFICATION_WEBHOOK_SECRET
  )
    return false;
  if (!process.env.NOTIFICATION_WEBHOOK_URL.startsWith("https://"))
    throw new Error("Notification endpoint must use HTTPS");
  const row = await db.delivery.upsert({
    where: { eventKey },
    create: { accountId, eventKey },
    update: {},
  });
  if (row.status === "SENT") return true;
  const lease = await db.delivery.updateMany({
    where: {
      id: row.id,
      OR: [
        { status: { in: ["PENDING", "FAILED"] } },
        {
          status: "SENDING",
          createdAt: { lt: new Date(Date.now() - 5 * 60000) },
        },
      ],
    },
    data: { status: "SENDING", createdAt: new Date() },
  });
  if (!lease.count) return false;
  try {
    const res = await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.NOTIFICATION_WEBHOOK_SECRET,
        "Idempotency-Key": eventKey,
      },
      body: JSON.stringify({
        eventKey,
        kind,
        recipients,
        name,
        url: (process.env.APP_ORIGIN || "") + "/dashboard",
        message:
          kind === "REMINDER"
            ? "请完成一次报平安。"
            : kind === "FALLBACK"
              ? "微信里还没有收到你的平安确认，方便时请打开有所托报个平安。"
            : kind === "RECOVERED"
              ? "已恢复报平安，本次联系核查结束。"
              : "暂时未完成报平安，请尝试联系确认近况。未报平安不代表发生意外。",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("Delivery rejected");
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
