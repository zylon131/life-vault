# 04. 技术选型与开发实施路径

> 历史技术草案：开发请以 [有所托 PRD v1.0](./PRD.md) 为准。本文数据库及代码示例不是当前实施规范，尤其不得使用服务端 submittedShare 保存原始信钥；旧里程碑与套餐不再适用。

> **“以现代极简全栈架构，实现最高等级的端加密与最低难度的日常运维。”**

---

## 一、 系统技术选型

为了实现快速迭代、跨端自适应（手机/PC）、极高安全性和极低运维成本，推荐采用现代化的全栈技术栈：

```
                    ┌────────────────────────────────────────────────────────┐
                    │                      用户交互端                        │
                    │   Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui │
                    │   + Web Crypto API (本地 AES-256) + secrets.js (Shamir)│
                    └───────────────────────────┬────────────────────────────┘
                                                │ HTTPS (仅传输密文 Blob)
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                      后端服务层                        │
                    │          Node.js / Hono 或 Next.js Server Actions      │
                    │               Prisma ORM + PostgreSQL / SQLite         │
                    └───────────────────────────┬────────────────────────────┘
                                                │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   定时调度引擎   │          │   安全存储引擎   │          │   多通道触达网关 │
│ BullMQ / Upstash │          │ 阿里云 OSS / S3  │          │  微信服务号 Webhook
│ (检测失联状态机) │          │ (只存加密文件)   │          │  阿里云短信/语音 
└──────────────────┘          └──────────────────┘          │  Resend 邮件通道 │
                                                            └──────────────────┘
```

- **前端架构**：Next.js 14+ (React) + Tailwind CSS + PWA 支持。
  - 支持手机浏览器流畅全屏体验，亦可一键“添加到主屏幕”。
- **加密核心**：基于浏览器原生标准 `window.crypto.subtle` + `secrets.js-grempe`（成熟可靠的纯 JS 版 Shamir 秘密共享库）。
- **后端服务**：Next.js API Routes / Hono（轻量高效、支持 Serverless / Edge 部署）。
- **数据库**：PostgreSQL（通过 Supabase 或自建服务器）+ Prisma ORM。
- **定时调度与队列**：Upstash QStash 或 Redis BullMQ，每小时扫描超时未打卡用户并执行梯度状态跃迁。

---

## 二、 核心数据库实体模型（Prisma Schema）

```prisma
// 用户核心表
model User {
  id              String         @id @default(cuid())
  email           String         @unique
  phone           String?        @unique
  wechatOpenId    String?        @unique
  createdAt       DateTime       @default(now())
  
  // 状态机与打卡机制
  lastCheckInAt   DateTime       @default(now())     // 上次平安打卡时间
  checkInInterval Int            @default(72)        // 期望打卡周期(小时)，如 24h/72h
  status          UserStatus     @default(ACTIVE)    // ACTIVE, WARNING, ALERT, CONFIRMING, UNLOCKED
  
  // 订阅状态
  tier            SubscriptionTier @default(FREE)
  tierExpireAt    DateTime?
  
  // 关联的加密保险箱
  vault           Vault?
  trustees        Trustee[]
}

enum UserStatus {
  ACTIVE       // 正常平安
  WARNING      // 轻度超时 (Day 1-2)
  ALERT        // 红色预警 (Day 3, 已外呼电话)
  CONFIRMING   // 信使核查中 (已通知两位信使)
  UNLOCKED     // 两位信使均验证通过，已正式解密
}

enum SubscriptionTier {
  FREE
  GUARDIAN
  LIFETIME
}

// 加密保险箱（只存储密文，零知识存储）
model Vault {
  id              String      @id @default(cuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  encryptedData   String      // 浏览器加密后的主密文 (Base64)
  iv              String      // AES-GCM 初始向量 (Base64)
  authTag         String      // 校验标签，防篡改
  
  threshold       Int         @default(2) // 门限值：默认 2
  totalShares     Int         @default(2) // 总碎片数：默认 2
  
  updatedAt       DateTime    @updatedAt
}

// 信任人/信使表
model Trustee {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name            String      // 信使昵称，如“发小张三”
  relation        String      // 关系，如“挚友/兄弟”
  contactChannel  String      // 手机号或邮箱
  
  // 信使状态
  confirmedDeath  Boolean     @default(false) // 是否已确认立遗愿者身故
  submittedShare  String?     // 确认身故后提交的该信使保管的密钥碎片(Base64)
  
  createdAt       DateTime    @default(now())
}
```

---

## 三、 零知识端到端加解密 TypeScript 核心实现示例

在客户端本地运行的核心加解密流水线：

```typescript
// utils/crypto-vault.ts
import secrets from 'secrets.js-grempe';

/**
 * 1. 本地生成高强度 AES-256-GCM 密钥并加密敏感内容
 */
export async function encryptVault(contentPlaintext: string) {
  // 生成 256 位强随机密钥
  const masterKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 导出密钥原始二进制并转为 Hex 字符串
  const rawKey = await window.crypto.subtle.exportKey('raw', masterKey);
  const masterKeyHex = bufToHex(rawKey);

  // 生成 IV (12 字节标准)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedContent = new TextEncoder().encode(contentPlaintext);

  // 执行 AES-GCM 加密
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encodedContent
  );

  // 2. 利用 Shamir 算法将 MasterKey 拆分为 2 个碎片 (2-of-2 门限)
  // 必须 2 个碎片齐全才能合成
  const shares = secrets.share(masterKeyHex, 2, 2);

  return {
    ciphertextBase64: bufToBase64(cipherBuffer),
    ivBase64: bufToBase64(iv),
    shareA: shares[0], // 交给信使 A
    shareB: shares[1], // 交给信使 B
  };
}

/**
 * 2. 两位信使在浏览器端输入各自碎片，合成主密钥并解密明文
 */
export async function decryptVault(
  shareA: string,
  shareB: string,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  // 通过拉格朗日插值合成出 MasterKey Hex
  const combinedKeyHex = secrets.combine([shareA, shareB]);

  const rawKey = hexToBuf(combinedKeyHex);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const cipherBuffer = base64ToBuf(ciphertextBase64);
  const iv = base64ToBuf(ivBase64);

  // 解密明文
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    cipherBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// 辅助转换方法
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes.buffer;
}
function bufToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}
```

---

## 四、 极速实施与发布里程碑（Roadmap）

- **第 1 周：MVP 极简安全核心闭环**
  - 完成 Web 端 UI（自适应移动端）；
  - 跑通浏览器端 AES-256 加密与 Shamir 2-of-2 钥匙分割；
  - 实现信使凭证卡片导出（可打印 PDF / 复制口令）。
- **第 2 周：低侵入打卡与定时预警状态机**
  - 接入微信服务号（用户扫码关注即绑定），每天定时推送打卡模板；
  - 接入邮件打卡（点击专属 Token 链接 1 秒打卡）；
  - 后端 CRON Job 每日定时扫描，更新预警状态。
- **第 3 周：支付接入与合规保障**
  - 接入微信扫码支付 / 支付宝（国内）与 Stripe（海外）；
  - 完善免责声明与服务条款；
  - 灰度发布，在即刻、小红书进行故事化种子测试。
