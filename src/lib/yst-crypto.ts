export type Person = {
  id: string;
  name: string;
  contact: string;
  relation: string;
  circle?: string;
  message: string;
};
export type Letter = {
  id: string;
  name: string;
  contact?: string;
  content: string;
  relayName?: string;
  relayContact?: string;
};
export type Arrangement = {
  id: string;
  title: string;
  content: string;
  handlerName?: string;
  handlerContact?: string;
};
export type Payload = {
  people: Person[];
  letters: Letter[];
  arrangements: Arrangement[];
};
export type Cipher = { ciphertext: string; iv: string };
export type Envelope = Cipher & { salt: string };
export type Document = {
  format: "yst-1";
  keyVersion: string;
  contentVersion: number;
  updatedAt: string;
  cipher: Cipher;
  owner: Envelope;
  count: number;
};
export type KeyCard = {
  format: "yst-key-1";
  keyVersion: string;
  slot: number;
  share: string;
};
export const emptyPayload = (): Payload => ({
  people: [],
  letters: [],
  arrangements: [],
});
export const countItems = (p: Payload) =>
  p.people.length + p.letters.length + p.arrangements.length;
export const to64 = (b: ArrayBuffer | Uint8Array) => {
  let s = "";
  for (const v of new Uint8Array(b)) s += String.fromCharCode(v);
  return btoa(s);
};
export const from64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
export async function digest(s: string) {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
  );
}
async function aes(key: string) {
  return crypto.subtle.importKey("raw", from64(key), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function passwordKey(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: from64(salt), iterations: 600000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encrypt(payload: Payload, key: string): Promise<Cipher> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    iv: to64(iv),
    ciphertext: to64(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await aes(key),
        new TextEncoder().encode(JSON.stringify(payload)),
      ),
    ),
  };
}
export async function decrypt(cipher: Cipher, key: string): Promise<Payload> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: from64(cipher.iv) },
    await aes(key),
    from64(cipher.ciphertext),
  );
  const p = JSON.parse(new TextDecoder().decode(plain));
  if (
    !Array.isArray(p.people) ||
    !Array.isArray(p.letters) ||
    !Array.isArray(p.arrangements)
  )
    throw new Error("交代文件格式不完整");
  return p;
}
export async function wrapOwner(
  key: string,
  password: string,
): Promise<Envelope> {
  const salt = to64(crypto.getRandomValues(new Uint8Array(16))),
    iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    salt,
    iv: to64(iv),
    ciphertext: to64(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await passwordKey(password, salt),
        from64(key),
      ),
    ),
  };
}
export async function unwrapOwner(owner: Envelope, password: string) {
  try {
    return to64(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: from64(owner.iv) },
        await passwordKey(password, owner.salt),
        from64(owner.ciphertext),
      ),
    );
  } catch {
    throw new Error("查看口令不正确，请重新输入。邮箱验证码不能代替查看口令。");
  }
}
export async function newDocument(payload: Payload, password: string) {
  const key = to64(crypto.getRandomValues(new Uint8Array(32)));
  const doc: Document = {
    format: "yst-1",
    keyVersion: crypto.randomUUID(),
    contentVersion: 1,
    updatedAt: new Date().toISOString(),
    cipher: await encrypt(payload, key),
    owner: await wrapOwner(key, password),
    count: countItems(payload),
  };
  return { key, doc };
}

let browserSecrets: Promise<any> | null = null;

async function secretsLibrary() {
  if (typeof window === "undefined") {
    const loaded = await import("secrets.js-grempe");
    const first = (loaded as any).default || loaded;
    return first.default || first;
  }

  const globalSecrets = (window as any).secrets;
  if (globalSecrets) return globalSecrets;
  if (!browserSecrets) {
    browserSecrets = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/secrets.min.js";
      script.async = true;
      script.dataset.ystSecrets = "true";
      script.onload = () => {
        const loaded = (window as any).secrets;
        if (loaded) resolve(loaded);
        else reject(new Error("信钥组件没有正确载入"));
      };
      script.onerror = () => reject(new Error("信钥组件暂时无法载入"));
      document.head.appendChild(script);
    });
  }
  return browserSecrets;
}

export async function split(
  key: string,
  keyVersion: string,
): Promise<KeyCard[]> {
  const secrets = await secretsLibrary();
  return secrets
    .share(hex(from64(key)), 2, 2)
    .map((share: string, slot: number) => ({
      format: "yst-key-1",
      keyVersion,
      slot,
      share,
    }));
}
export function parseCard(raw: string): KeyCard {
  const card = JSON.parse(raw.trim());
  if (
    card.format !== "yst-key-1" ||
    ![0, 1].includes(card.slot) ||
    typeof card.keyVersion !== "string" ||
    typeof card.share !== "string" ||
    !/^[0-9a-f]+$/i.test(card.share)
  )
    throw new Error("信钥格式不正确，请粘贴完整信钥或导入信钥文件。");
  return card;
}
export async function combine(cards: KeyCard[], doc: Document) {
  if (
    cards.length !== 2 ||
    cards[0].slot === cards[1].slot ||
    cards[0].share === cards[1].share ||
    cards.some((c) => c.keyVersion !== doc.keyVersion)
  )
    throw new Error("需要同一版本的两份不同信钥，请检查是否拿错了文件。");
  try {
    const secrets = await secretsLibrary();
    const key = String(secrets.combine(cards.map((c) => c.share)));
    if (!/^[0-9a-f]{64}$/i.test(key)) throw new Error();
    return await decrypt(
      doc.cipher,
      to64(Uint8Array.from(key.match(/../g)!, (v) => parseInt(v, 16))),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    throw new Error(
      process.env.NODE_ENV === "development"
        ? `无法开启（本地调试：${detail || "解密校验没有通过"}）`
        : "无法开启，请确认信钥与这份交代匹配，文件没有损坏。",
    );
  }
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
