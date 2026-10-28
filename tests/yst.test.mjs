import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
  newDocument,
  split,
  combine,
  encrypt,
  decrypt,
  unwrapOwner,
  digest,
  randomToken,
} from "../src/lib/yst-crypto.ts";
import {
  lookupHash,
  normalizeEmail,
  normalizePhone,
  protect,
} from "../src/lib/pii.ts";

process.loadEnvFile?.();
const payload = {
  people: [
    {
      id: "p1",
      name: "老周",
      contact: "zhou@example.test",
      relation: "大学室友",
      message: "谢谢你记得我。",
    },
  ],
  letters: [{ id: "l1", name: "妈妈", content: "愿你平安。🌱" }],
  arrangements: [{ id: "a1", title: "猫", content: "请小林照顾。" }],
};
const phrase = "only-local-reading-phrase-2026";
let original, cards;
test("真实加密核心：中文与emoji、口令封装、双信钥、篡改和版本更新", async () => {
  original = await newDocument(payload, phrase);
  cards = await split(original.key, original.doc.keyVersion);
  assert.equal(await unwrapOwner(original.doc.owner, phrase), original.key);
  await assert.rejects(() => unwrapOwner(original.doc.owner, "wrong"));
  assert.deepEqual(await combine(cards, original.doc), payload);
  await assert.rejects(() => combine([cards[0]], original.doc));
  await assert.rejects(() => combine([cards[0], cards[0]], original.doc));
  const corrupt = structuredClone(original.doc);
  corrupt.cipher.ciphertext = "AAAA" + corrupt.cipher.ciphertext.slice(4);
  await assert.rejects(() => combine(cards, corrupt));
  const changed = {
    ...payload,
    letters: [{ id: "l2", name: "妈妈", content: "更新后的第二句话" }],
  };
  const updated = {
    ...original.doc,
    cipher: await encrypt(changed, original.key),
  };
  assert.deepEqual(
    await combine(cards, updated),
    changed,
    "普通修改保持原信钥有效",
  );
  const rotated = await newDocument(changed, phrase),
    newCards = await split(rotated.key, rotated.doc.keyVersion);
  await assert.rejects(
    () => combine(cards, rotated.doc),
    "旧凭证不得开启新版本",
  );
  await assert.rejects(() => combine([cards[0], newCards[1]], rotated.doc));
  assert.deepEqual(await combine(newCards, rotated.doc), changed);
});
test("API：账号隔离、持久化、冲突、邀请确认、轮换撤销、恢复边界", async () => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  const email = `yst_test_${Date.now()}@example.test`;
  const req = async (
    path,
    data,
    cookie = "",
    method = "POST",
    origin = base,
  ) => {
    const r = await fetch(base + path, {
      method: data === undefined ? "GET" : method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  let createdId;
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const codeHash = (targetHash, purpose, code) =>
    createHmac(
      "sha256",
      process.env.PII_ENCRYPTION_KEY || "有所托-local-development-code-key",
    )
      .update(`${purpose}\0${targetHash}\0${code}`)
      .digest("hex");
  const addCode = async ({
    channel,
    purpose,
    target,
    code,
    accountId,
    sessionHash,
  }) => {
    const targetHash = lookupHash(channel.toLowerCase(), target);
    await db.verificationCode.create({
      data: {
        channel,
        purpose,
        targetHash,
        targetEncrypted: protect(target),
        codeHash: codeHash(targetHash, purpose, code),
        accountId,
        sessionHash,
        requestIpHash: lookupHash("request-ip", "test"),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  };
  try {
    assert.equal((await req("/api/document")).status, 401);
    assert.equal((await req("/api/vault")).status, 410);
    assert.equal((await req("/api/auth/wechat")).status, 503);
    const loginCode = "314159";
    await addCode({
      channel: "EMAIL",
      purpose: "LOGIN",
      target: normalizeEmail(email),
      code: loginCode,
    });
    assert.equal(
      (
        await req("/api/auth/email", {
          action: "verify",
          email,
          code: "000000",
          name: "自动化验收用户",
        })
      ).status,
      401,
    );
    const a = await req("/api/auth/email", {
      action: "verify",
      email,
      code: loginCode,
      name: "自动化验收用户",
    });
    assert.equal(a.status, 200);
    createdId = a.body.id;
    const cookie = a.cookie;
    assert.ok(cookie);
    assert.equal(a.body.email, email);
    const sessionHash = sha(cookie.split("=")[1]);
    assert.equal(
      (await req("/api/document", undefined, "yst_session=forged")).status,
      401,
    );
    assert.equal(
      (
        await req(
          "/api/document",
          { doc: original.doc, revision: 0 },
          cookie,
          "POST",
          "https://untrusted.example",
        )
      ).status,
      403,
    );
    const save = await req(
      "/api/document",
      { doc: original.doc, revision: 0 },
      cookie,
    );
    assert.equal(save.status, 200, JSON.stringify(save.body));
    assert.equal(
      (await req("/api/document", { doc: original.doc, revision: 0 }, cookie))
        .status,
      409,
    );
    const tokens = [randomToken(), randomToken()],
      rot = await newDocument(payload, phrase),
      newCards = await split(rot.key, rot.doc.keyVersion);
    const trustees = await Promise.all(
      newCards.map(async (c, i) => ({
        name: "验收托付人" + i,
        contact: "trustee" + i + "@example.test",
        invite: tokens[i],
        proof: await digest(c.share),
      })),
    );
    await db.loginSession.update({
      where: { hash: sessionHash },
      data: { verifiedAt: new Date(Date.now() - 20 * 60000) },
    });
    assert.equal(
      (
        await req(
          "/api/document",
          { doc: rot.doc, revision: 1, trustees },
          cookie,
        )
      ).status,
      403,
    );
    const sensitiveCode = "271828";
    await addCode({
      channel: "EMAIL",
      purpose: "SENSITIVE",
      target: normalizeEmail(email),
      code: sensitiveCode,
      accountId: createdId,
      sessionHash,
    });
    assert.equal(
      (
        await req(
          "/api/auth/email",
          { action: "verify-sensitive", code: sensitiveCode },
          cookie,
        )
      ).status,
      200,
    );
    const config = await req(
      "/api/document",
      { doc: rot.doc, revision: 1, trustees },
      cookie,
    );
    assert.equal(config.status, 200, JSON.stringify(config.body));
    assert.equal(
      (await req("/api/invitation", { token: tokens[0], action: "document" }))
        .status,
      403,
    );
    for (let i = 0; i < 2; i++) {
      assert.equal(
        (await req("/api/invitation", { token: tokens[i], action: "accept" }))
          .status,
        200,
      );
      assert.equal(
        (
          await req("/api/invitation", {
            token: tokens[i],
            action: "confirm",
            proof: await digest(newCards[1 - i].share),
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await req("/api/invitation", {
            token: tokens[i],
            action: "confirm",
            proof: trustees[i].proof,
          })
        ).status,
        200,
      );
    }
    const snap = await req("/api/document", undefined, cookie);
    assert.ok(snap.body.trustees.every((t) => t.confirmed));
    assert.equal(snap.body.doc.contentVersion, 2);
    const accessible = await req("/api/invitation", {
      token: tokens[0],
      action: "document",
    });
    assert.equal(accessible.body.doc.owner, undefined);
    assert.deepEqual(await combine(newCards, accessible.body.doc), payload);
    const modified = {
      ...payload,
      arrangements: [
        { id: "a2", title: "新安排", content: "按更新后的交代。" },
      ],
    };
    const editDoc = {
      ...config.body.doc,
      cipher: await encrypt(modified, rot.key),
    };
    assert.equal(
      (await req("/api/document", { doc: editDoc, revision: 2 }, cookie))
        .status,
      200,
    );
    const latest = await req("/api/invitation", {
      token: tokens[0],
      action: "document",
    });
    assert.deepEqual(await combine(newCards, latest.body.doc), modified);
    const next = await newDocument(modified, phrase),
      nextCards = await split(next.key, next.doc.keyVersion);
    const nextTrustees = await Promise.all(
      nextCards.map(async (c, i) => ({
        ...trustees[i],
        invite: randomToken(),
        proof: await digest(c.share),
      })),
    );
    assert.equal(
      (
        await req(
          "/api/document",
          { doc: next.doc, revision: 3, trustees: nextTrustees },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (await req("/api/invitation", { token: tokens[0], action: "document" }))
        .status,
      404,
    );
    await assert.rejects(() => combine(newCards, next.doc));
    const checkin = await req("/api/checkin", { action: "checkin" }, cookie);
    assert.equal(checkin.status, 200);
    const phone = normalizePhone("138 0013 8000");
    const phoneCode = "161803";
    await addCode({
      channel: "SMS",
      purpose: "PHONE_BIND",
      target: phone,
      code: phoneCode,
      accountId: createdId,
      sessionHash,
    });
    assert.equal(
      (
        await req(
          "/api/account/phone",
          { action: "verify", phone, code: phoneCode, consent: false },
          cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/api/account/phone",
          { action: "verify", phone, code: phoneCode, consent: true },
          cookie,
        )
      ).status,
      200,
    );
    const withPhone = await req("/api/document", undefined, cookie);
    assert.equal(withPhone.body.phone, "138****8000");
    assert.equal(withPhone.body.phoneVerified, true);
    const binding = await req(
      "/api/wechat/bind",
      { action: "request" },
      cookie,
    );
    assert.equal(binding.status, 200);
    assert.equal(binding.body.simulated, true);
    assert.match(binding.body.token, /^[0-9a-f]{64}$/);
    assert.equal(
      (
        await req(
          "/api/wechat/bind",
          { action: "simulate", token: binding.body.token },
          cookie,
        )
      ).status,
      200,
    );
    const withWechat = await req("/api/document", undefined, cookie);
    assert.equal(withWechat.body.wechatBound, true);
    assert.equal(withWechat.body.wechatSubscribed, true);
    assert.equal(
      (
        await req(
          "/api/checkin",
          { action: "settings", hour: 21, enabled: true },
          cookie,
        )
      ).status,
      200,
    );
    const mockMessage = await req("/api/wechat/test-message", {}, cookie);
    assert.equal(mockMessage.status, 200);
    assert.match(mockMessage.body.url, /^\/api\/wechat\/checkin\?/);
    const oneTap = await fetch(base + mockMessage.body.url, {
      redirect: "manual",
    });
    assert.equal(oneTap.status, 307);
    assert.match(oneTap.headers.get("location"), /checkin-success\?status=ok/);
    const reused = await fetch(base + mockMessage.body.url, {
      redirect: "manual",
    });
    assert.equal(reused.status, 307);
    assert.match(reused.headers.get("location"), /status=expired/);
    assert.equal((await req("/api/schedule", {})).status, 401);
    const stored = await db.account.findUnique({ where: { id: createdId } });
    assert.ok(!stored.document.includes("妈妈"));
    assert.ok(!stored.document.includes(phrase));
    assert.ok(!stored.document.includes(nextCards[0].share));
    assert.ok(stored.emailEncrypted && !stored.emailEncrypted.includes(email));
    assert.ok(stored.phoneEncrypted && !stored.phoneEncrypted.includes(phone));
    assert.ok(
      stored.wechatOpenIdEncrypted &&
        !stored.wechatOpenIdEncrypted.includes(`mock:${createdId}`),
    );
    const storedTrustees = await db.invitation.findMany({
      where: { accountId: createdId },
    });
    assert.ok(
      storedTrustees.every(
        (trustee) =>
          trustee.contactEncrypted &&
          !/^trustee\d@example\.test$/.test(trustee.contact) &&
          !trustee.contactEncrypted.includes("@example.test"),
      ),
    );
    const offline = await fetch(base + "/api/offline");
    assert.equal(offline.status, 200);
    const html = await offline.text();
    assert.ok(html.includes("connect-src"));
    assert.ok(!html.includes("/*__SECRETS__*/"));
    await db.loginSession.update({
      where: { hash: sessionHash },
      data: { verifiedAt: new Date(Date.now() - 20 * 60000) },
    });
    assert.equal((await req("/api/document", {}, cookie, "DELETE")).status, 403);
    const deleteCode = "141421";
    await addCode({
      channel: "EMAIL",
      purpose: "SENSITIVE",
      target: normalizeEmail(email),
      code: deleteCode,
      accountId: createdId,
      sessionHash,
    });
    assert.equal(
      (
        await req(
          "/api/auth/email",
          { action: "verify-sensitive", code: deleteCode },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal((await req("/api/document", {}, cookie, "DELETE")).status, 200);
    assert.equal(
      (await req("/api/account", { action: "logout" }, cookie)).status,
      200,
    );
    assert.equal((await req("/api/document", undefined, cookie)).status, 401);
  } finally {
    await db.verificationCode.deleteMany({
      where: { targetHash: lookupHash("email", normalizeEmail(email)) },
    });
    if (createdId) await db.account.delete({ where: { id: createdId } });
    await db.$disconnect();
  }
});
