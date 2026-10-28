import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { digest, newDocument, split } from "../src/lib/yst-crypto.ts";
import {
  lookupHash,
  maskContact,
  normalizeEmail,
  protect,
} from "../src/lib/pii.ts";

process.loadEnvFile?.();

const db = new PrismaClient();
const email = normalizeEmail("demo@yousuotuo.test");
const viewPassphrase = "Yst-demo-2026!";
const emailHash = lookupHash("email", email);
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectRoot, "demo-output");
const hash = (value) => createHash("sha256").update(value).digest("hex");

const payload = {
  people: [
    {
      id: "demo-person-university",
      name: "老周",
      contact: "138 0013 8000",
      relation: "大学室友",
      circle: "大学同学群，以及当年摄影社的朋友",
      message:
        "请告诉大家，我很幸运和你们一起年轻过。若方便，也替我谢谢那几年一直照顾我的人。",
    },
    {
      id: "demo-person-work",
      name: "陈姐",
      contact: "chenjie@example.com",
      relation: "上一份工作的同事",
      circle: "曾经一起做“远山计划”的同事们",
      message: "请代我向大家说一声谢谢。那段并肩赶路的日子，我一直记得。",
    },
  ],
  letters: [
    {
      id: "demo-letter-mother",
      name: "妈妈",
      contact: "家人通讯录中的“妈妈”",
      content:
        "谢谢你让我一直知道，累了也有地方可以回去。以后请多为自己活一点，不要总担心我。",
      relayName: "姐姐林然",
      relayContact: "家庭微信群或 139 0000 1122",
    },
    {
      id: "demo-letter-friend",
      name: "阿宁",
      contact: "微信备注“阿宁·画室”",
      content:
        "那年分别时我没有好好道别。你送我的那本书，我其实读了很多遍。愿你以后一直画喜欢的画。",
      relayName: "老周",
      relayContact: "138 0013 8000",
    },
  ],
  arrangements: [
    {
      id: "demo-arrangement-cat",
      title: "照顾小猫米粒",
      content:
        "请先让米粒住在熟悉的家里。如果妹妹愿意，就由她继续照顾；猫粮和看诊记录放在书桌第二个抽屉。",
      handlerName: "妹妹小林",
      handlerContact: "139 0000 1122",
    },
    {
      id: "demo-arrangement-flowers",
      title: "阳台的花",
      content: "把长势好的几盆送给真正喜欢它们的人，不必为了纪念一直留着。",
      handlerName: "老周",
      handlerContact: "138 0013 8000",
    },
    {
      id: "demo-arrangement-farewell",
      title: "告别仪式",
      content:
        "一切从简。放一些我常听的歌，给来的人准备热茶；如果大家愿意，请聊聊我们一起经历过的开心事。",
      handlerName: "姐姐林然",
      handlerContact: "家庭微信群或 139 0000 1122",
    },
  ],
};

const trusteeDetails = [
  { name: "老周", contact: "138 0013 8000" },
  { name: "姐姐林然", contact: "linran@example.com" },
];

try {
  const { key, doc } = await newDocument(payload, viewPassphrase);
  const cards = await split(key, doc.keyVersion);
  const inviteTokens = ["1".repeat(64), "2".repeat(64)];
  const account = await db.account.upsert({
    where: { emailHash },
    update: {
      emailEncrypted: protect(email),
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      displayName: "测试用户小余",
      document: JSON.stringify(doc),
      revision: { increment: 1 },
    },
    create: {
      emailHash,
      emailEncrypted: protect(email),
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      displayName: "测试用户小余",
      document: JSON.stringify(doc),
      revision: 1,
    },
  });

  await db.$transaction(async (tx) => {
    await tx.invitation.deleteMany({ where: { accountId: account.id } });
    for (let slot = 0; slot < 2; slot += 1) {
      const trustee = trusteeDetails[slot];
      await tx.invitation.create({
        data: {
          accountId: account.id,
          hash: hash(inviteTokens[slot]),
          slot,
          keyVersion: doc.keyVersion,
          name: trustee.name,
          contact: maskContact(trustee.contact),
          contactEncrypted: protect(trustee.contact),
          proofHash: hash(await digest(cards[slot].share)),
          accepted: true,
          confirmed: true,
        },
      });
    }
  });

  await mkdir(outputDir, { recursive: true });
  await Promise.all(
    cards.map((card, index) =>
      writeFile(
        join(outputDir, `有所托-演示信钥-${index + 1}.json`),
        JSON.stringify(card, null, 2),
        "utf8",
      ),
    ),
  );
  await writeFile(
    join(outputDir, "演示说明.txt"),
    [
      "有所托完整封存演示",
      "",
      `测试账号：${email}`,
      `本人查看口令：${viewPassphrase}`,
      "",
      "本人查看：登录后进入 /vault/edit，输入查看口令。",
      "托付人共同开启：进入 /unlock，载入当前封存的交代，分别导入本目录下两份信钥。",
      `托付人一邀请：http://localhost:3000/invite#${inviteTokens[0]}`,
      `托付人二邀请：http://localhost:3000/invite#${inviteTokens[1]}`,
    ].join("\n"),
    "utf8",
  );

  console.log("Demo account refreshed:", email);
  console.log("Sealed items:", doc.count);
  console.log("View passphrase:", viewPassphrase);
  console.log("Trustees: accepted and key-confirmed (2/2)");
  console.log("Demo kit:", outputDir);
} finally {
  await db.$disconnect();
}
