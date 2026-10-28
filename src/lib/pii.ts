import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "crypto";

function key() {
  const configured = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production")
      throw new Error("PII_ENCRYPTION_KEY is required in production");
    return createHash("sha256")
      .update("有所托-local-development-pii-key")
      .digest();
  }
  const decoded = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (decoded.length !== 32)
    throw new Error("PII_ENCRYPTION_KEY must be 32 bytes");
  return decoded;
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (
    email.length < 5 ||
    email.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new Error("请输入有效的邮箱地址");
  return email;
}

export function normalizePhone(value: string) {
  let phone = value.replace(/[\s()-]/g, "");
  if (phone.startsWith("0086")) phone = phone.slice(4);
  if (phone.startsWith("+86")) phone = phone.slice(3);
  if (!/^1[3-9]\d{9}$/.test(phone))
    throw new Error("请输入有效的中国大陆手机号");
  return "+86" + phone;
}

export function lookupHash(kind: string, value: string) {
  return createHmac("sha256", key())
    .update(kind + "\0" + value)
    .digest("hex");
}

export function protect(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function reveal(value: string) {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || ciphertext === undefined)
    throw new Error("Encrypted personal data is malformed");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, Math.min(5, local.length - visible.length)))}@${domain}`;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/^\+86/, "");
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export function maskContact(contact: string) {
  const value = contact.trim();
  if (value.includes("@")) {
    try {
      return maskEmail(normalizeEmail(value));
    } catch {
      return "已加密联系方式";
    }
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 7)
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return value.length > 2 ? value[0] + "***" + value.at(-1) : "已加密联系方式";
}
