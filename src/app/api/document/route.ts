import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  account,
  fail,
  hash,
  recentlyVerified,
  sameOrigin,
  jsonBody,
} from "@/lib/auth";
import { maskContact, protect, reveal } from "@/lib/pii";
import { wechatConfigured, wechatSimulationAvailable } from "@/lib/wechat";
import {
  NotebookData,
  TrustedPerson,
  WatchSettings,
  emptyNotebook,
  countNotebookSections,
} from "@/lib/notebook";

export const dynamic = "force-dynamic";

function validCipher(c: any) {
  return (
    c &&
    typeof c.iv === "string" &&
    /^[A-Za-z0-9+/]{16}$/.test(c.iv) &&
    typeof c.ciphertext === "string" &&
    c.ciphertext.length >= 24 &&
    c.ciphertext.length < 1000000 &&
    /^[A-Za-z0-9+/]+=*$/.test(c.ciphertext)
  );
}

function sameEnvelope(left: any, right: any) {
  return (
    left?.iv === right?.iv &&
    left?.ciphertext === right?.ciphertext &&
    left?.salt === right?.salt
  );
}

function decodeStoredNotebook(rawDoc: any): {
  notebook: NotebookData;
  silentTrustees: TrustedPerson[];
  watch: WatchSettings;
} {
  let notebook = emptyNotebook();
  let silentTrustees: TrustedPerson[] = [];
  let watch: WatchSettings = {
    intervalDays: 14,
    stage: "QUIET_WRITING",
    vacationPaused: false,
  };

  if (rawDoc?.notebookEncrypted) {
    try {
      notebook = {
        ...emptyNotebook(),
        ...JSON.parse(reveal(rawDoc.notebookEncrypted)),
      };
    } catch {
      notebook = emptyNotebook();
    }
  }
  if (rawDoc?.silentTrusteesEncrypted) {
    try {
      silentTrustees = JSON.parse(reveal(rawDoc.silentTrusteesEncrypted));
    } catch {
      silentTrustees = [];
    }
  }
  if (rawDoc?.watch) {
    watch = {
      intervalDays: rawDoc.watch.intervalDays || 14,
      stage: rawDoc.watch.stage || "QUIET_WRITING",
      vacationPaused: Boolean(rawDoc.watch.vacationPaused),
      pausedNote: rawDoc.watch.pausedNote || "",
    };
  }
  return { notebook, silentTrustees, watch };
}

export async function GET(req: NextRequest) {
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  const trustees = await db.invitation.findMany({
    where: { accountId: a.id },
    select: {
      slot: true,
      name: true,
      contact: true,
      contactEncrypted: true,
      accepted: true,
      confirmed: true,
    },
    orderBy: { slot: "asc" },
  });
  const parsedDoc = JSON.parse(a.document || "{}");
  const { notebook, silentTrustees, watch } = decodeStoredNotebook(parsedDoc);
  const stats = countNotebookSections(notebook);

  return NextResponse.json({
    doc: {
      ...parsedDoc,
      notebookEncrypted: undefined,
      silentTrusteesEncrypted: undefined,
      count: parsedDoc.count ?? stats.totalItems,
    },
    notebook,
    silentTrustees,
    watch,
    revision: a.revision,
    trustees: trustees.map((trustee) => ({
      ...trustee,
      contactEncrypted: undefined,
      contact: trustee.contactEncrypted
        ? reveal(trustee.contactEncrypted)
        : trustee.contact,
    })),
    lastCheckInAt: a.lastCheckInAt,
    interval: a.checkInInterval,
    reminderEnabled: a.reminderEnabled,
    phone: a.phonePreview || "",
    phoneVerified: !!a.phoneVerifiedAt,
    wechatBound: !!a.wechatBoundAt,
    wechatSubscribed: a.wechatSubscribed,
    reminderHour: a.wechatReminderHour,
    wechatAvailable: wechatConfigured() || wechatSimulationAvailable(),
    wechatSimulation: wechatSimulationAvailable(),
    notificationsAvailable:
      !!process.env.NOTIFICATION_WEBHOOK_URL &&
      !!process.env.NOTIFICATION_WEBHOOK_SECRET,
  });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  try {
    const b = await jsonBody(req);
    const old = JSON.parse(a.document || "{}");

    // New v2.0 Human-Centered Notebook Flow (No 12-char passphrase, no JSON key files)
    if (b.mode === "notebook") {
      const current = decodeStoredNotebook(old);
      const nextNotebook: NotebookData = b.notebook
        ? { ...emptyNotebook(), ...b.notebook }
        : current.notebook;
      const nextSilentTrustees: TrustedPerson[] = Array.isArray(
        b.silentTrustees,
      )
        ? b.silentTrustees.slice(0, 2).map((t: any, idx: number) => ({
            slot: (idx === 0 ? 0 : 1) as 0 | 1,
            name: String(t.name || "").trim().slice(0, 40),
            relation: String(t.relation || "").trim().slice(0, 60),
            contact: String(t.contact || "").trim().slice(0, 120),
            secretMemory: String(t.secretMemory || "").trim().slice(0, 500),
            confirmedPassing: Boolean(t.confirmedPassing),
            confirmedAt: t.confirmedAt || undefined,
            pausedAt: t.pausedAt || undefined,
            pauseReason: t.pauseReason || undefined,
          }))
        : current.silentTrustees;

      const stats = countNotebookSections(nextNotebook);
      const hasTwoTrustees =
        nextSilentTrustees.length === 2 &&
        nextSilentTrustees.every(
          (t) => t.name && t.contact && t.secretMemory,
        );

      let nextWatch: WatchSettings = b.watch
        ? {
            intervalDays: Number(b.watch.intervalDays) || 14,
            stage: b.watch.stage || current.watch.stage,
            vacationPaused: Boolean(b.watch.vacationPaused),
            pausedNote: String(b.watch.pausedNote || "").slice(0, 200),
          }
        : current.watch;

      // Auto-upgrade from QUIET_WRITING to PEACEFUL_WATCH once notebook + 2 trustees are set
      if (
        nextWatch.stage === "QUIET_WRITING" &&
        stats.totalItems > 0 &&
        hasTwoTrustees
      ) {
        nextWatch = { ...nextWatch, stage: "PEACEFUL_WATCH" };
      }

      // Handle trustee decision simulation/action (pause vs confirm_passing)
      if (b.trusteeAction) {
        const slot = b.trusteeAction.slot === 1 ? 1 : 0;
        if (b.trusteeAction.type === "pause") {
          nextSilentTrustees.forEach((t) => {
            t.confirmedPassing = false;
            t.confirmedAt = undefined;
          });
          if (nextSilentTrustees[slot]) {
            nextSilentTrustees[slot].pausedAt = new Date().toISOString();
            nextSilentTrustees[slot].pauseReason =
              b.trusteeAction.reason || "暂时不方便看手机（住院/出差/忙碌）";
          }
          nextWatch.stage = "PEACEFUL_WATCH";
        } else if (b.trusteeAction.type === "confirm_passing") {
          if (nextSilentTrustees[slot]) {
            nextSilentTrustees[slot].confirmedPassing = true;
            nextSilentTrustees[slot].confirmedAt = new Date().toISOString();
            nextSilentTrustees[slot].pausedAt = undefined;
          }
          const bothConfirmed =
            nextSilentTrustees.length === 2 &&
            nextSilentTrustees.every((t) => t.confirmedPassing);
          nextWatch.stage = bothConfirmed
            ? "ENTRUSTED_OPEN"
            : "DUAL_CONFIRMING";
        } else if (b.trusteeAction.type === "reset") {
          nextSilentTrustees.forEach((t) => {
            t.confirmedPassing = false;
            t.confirmedAt = undefined;
            t.pausedAt = undefined;
          });
          nextWatch.stage = hasTwoTrustees ? "PEACEFUL_WATCH" : "QUIET_WRITING";
        }
      }

      const updatedDoc = {
        ...old,
        format: old.format || "yst-2",
        contentVersion: (old.contentVersion || 0) + 1,
        updatedAt: new Date().toISOString(),
        count: stats.totalItems,
        notebookEncrypted: protect(JSON.stringify(nextNotebook)),
        silentTrusteesEncrypted: protect(JSON.stringify(nextSilentTrustees)),
        watch: nextWatch,
      };

      await db.account.update({
        where: { id: a.id },
        data: {
          document: JSON.stringify(updatedDoc),
          revision: { increment: 1 },
          checkInInterval: (nextWatch.intervalDays || 14) * 24,
        },
      });

      return NextResponse.json({
        doc: {
          ...updatedDoc,
          notebookEncrypted: undefined,
          silentTrusteesEncrypted: undefined,
        },
        notebook: nextNotebook,
        silentTrustees: nextSilentTrustees,
        watch: nextWatch,
        revision: a.revision + 1,
      });
    }

    // Legacy v1 flow preserved for unit test compatibility (tests/yst.test.mjs)
    const d = b.doc;
    if (
      !d ||
      d.format !== "yst-1" ||
      !/^[0-9a-f-]{36}$/.test(d.keyVersion) ||
      !validCipher(d.cipher) ||
      !validCipher(d.owner) ||
      typeof d.owner.salt !== "string" ||
      !/^[A-Za-z0-9+/]{22}==$/.test(d.owner.salt) ||
      !Number.isInteger(d.count) ||
      d.count < 1 ||
      d.count > 3000
    )
      return fail("交代文件格式不正确");
    const rotating =
      !!old.format && old.format === "yst-1" && old.keyVersion !== d.keyVersion;
    if ((rotating || b.trustees) && !(await recentlyVerified(req)))
      return fail("请先用邮箱验证码确认这次敏感操作", 403);
    if (rotating && !b.trustees)
      return fail("更新信钥时需要重新设置两位托付人");
    if (b.trustees) {
      if (
        !rotating ||
        !Array.isArray(b.trustees) ||
        b.trustees.length !== 2 ||
        b.trustees[0].contact === b.trustees[1].contact
      )
        return fail("请设置两位不同托付人并更新密钥版本");
      for (const t of b.trustees)
        if (
          typeof t.name !== "string" ||
          !t.name.trim() ||
          t.name.length > 40 ||
          typeof t.contact !== "string" ||
          t.contact.length < 3 ||
          t.contact.length > 160 ||
          !/^[0-9a-f]{64}$/.test(t.invite) ||
          !/^[0-9a-f]{64}$/.test(t.proof)
        )
          return fail("托付人信息不完整");
    } else if (
      old.format === "yst-1" &&
      !sameEnvelope(d.owner, old.owner)
    )
      return fail("普通保存不能变更本人访问凭证");
    const doc = {
      format: "yst-1",
      keyVersion: d.keyVersion,
      contentVersion: (old.contentVersion || 0) + 1,
      updatedAt: new Date().toISOString(),
      cipher: { iv: d.cipher.iv, ciphertext: d.cipher.ciphertext },
      owner: {
        iv: d.owner.iv,
        ciphertext: d.owner.ciphertext,
        salt: d.owner.salt,
      },
      count: d.count,
    };
    await db.$transaction(async (tx) => {
      const r = await tx.account.updateMany({
        where: { id: a.id, revision: b.revision },
        data: { document: JSON.stringify(doc), revision: { increment: 1 } },
      });
      if (!r.count) throw new Error("CONFLICT");
      if (b.trustees) {
        await tx.invitation.deleteMany({ where: { accountId: a.id } });
        for (let slot = 0; slot < 2; slot++) {
          const t = b.trustees[slot];
          await tx.invitation.create({
            data: {
              accountId: a.id,
              hash: hash(t.invite),
              slot,
              keyVersion: doc.keyVersion,
              name: t.name.trim(),
              contact: maskContact(t.contact),
              contactEncrypted: protect(t.contact.trim()),
              proofHash: hash(t.proof),
            },
          });
        }
      }
    });
    return NextResponse.json({ doc, revision: a.revision + 1 });
  } catch (e) {
    return fail(
      e instanceof Error && e.message === "CONFLICT"
        ? "另一页面已修改交代，请刷新后重新操作"
        : "保存失败，上一份交代仍然保留，请重试",
      e instanceof Error && e.message === "CONFLICT" ? 409 : 400,
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return fail("请求来源不正确", 403);
  const a = await account(req);
  if (!a) return fail("请先登录", 401);
  if (!(await recentlyVerified(req)))
    return fail("请先用邮箱验证码确认删除操作", 403);
  await db.$transaction([
    db.invitation.deleteMany({ where: { accountId: a.id } }),
    db.account.update({
      where: { id: a.id },
      data: {
        document: "{}",
        revision: { increment: 1 },
        reminderEnabled: false,
      },
    }),
  ]);
  return NextResponse.json({ success: true });
}
