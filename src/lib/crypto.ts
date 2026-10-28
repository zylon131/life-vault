/**
 * LifeVault Zero-Knowledge Cryptographic Core
 * 零知识端到端加密与沙米尔门限核心引擎
 * 
 * 原则：所有明文仅在用户的浏览器本地内存中处理，绝不传输或泄露到任何服务器。
 */

export interface VaultMessage {
  id: string;
  recipientName: string;
  recipientContact?: string;
  content: string;
  createdAt: string;
}

export interface FuneralWish {
  bgmTitle: string;
  bgmArtist: string;
  bgmLink?: string;
  dressingPreference: string;
  burialPreference: string;
  petArrangement?: string;
  digitalLegacyAction: string;
  customWords?: string;
}

export interface FriendContact {
  id: string;
  name: string;
  relation: string;
  phoneOrEmail: string;
  noticeMessage: string;
}

export interface VaultPayload {
  version: number;
  updatedAt: string;
  userDisplayName: string;
  messages: VaultMessage[];
  funeral: FuneralWish;
  friendsToNotify: FriendContact[];
}

export interface EncryptedVaultResult {
  ciphertext: string; // Base64
  iv: string; // Base64
  authTag: string; // SHA-256 Digest
  itemCount: number;
}

// 动态安全加载沙米尔门限库（防止 Next.js SSR 构建阶段顶层初始化报错）
async function getSecrets() {
  const mod = await import('secrets.js-grempe');
  const secretsLib = mod.default || mod;
  return secretsLib;
}

// 辅助工具：Uint8Array <-> Hex / Base64
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function bufToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 客户端端到端加密整个保险箱明文
 */
export async function encryptAndSplitVault(
  payload: VaultPayload,
  threshold: number = 2,
  totalShares: number = 2
): Promise<{
  encryptedData: EncryptedVaultResult;
  shares: string[];
}> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API 不可用，请在支持现代安全协议的环境中运行');
  }

  // 1. 生成 256-bit AES-GCM 密钥
  const masterKey = await cryptoObj.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await cryptoObj.subtle.exportKey('raw', masterKey);
  const masterKeyHex = bufToHex(rawKey);

  // 2. 本地 AES-GCM 加密
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const plaintext = JSON.stringify(payload);
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const cipherBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    encodedPlaintext
  );

  // 计算 SHA-256 完整性哈希校验码
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', cipherBuffer);
  const authTag = bufToHex(hashBuffer).substring(0, 32);

  // 3. Shamir 门限切分密钥
  const secrets = await getSecrets();
  const shares = secrets.share(masterKeyHex, totalShares, threshold);

  const itemCount =
    payload.messages.length +
    payload.friendsToNotify.length +
    (payload.funeral.bgmTitle ? 1 : 0);

  return {
    encryptedData: {
      ciphertext: bufToBase64(cipherBuffer),
      iv: bufToBase64(iv.buffer),
      authTag,
      itemCount,
    },
    shares,
  };
}

/**
 * 联合解密保险箱
 */
export async function combineAndDecryptVault(
  shares: string[],
  ciphertextBase64: string,
  ivBase64: string
): Promise<VaultPayload> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API 不可用，请在支持现代安全协议的环境中运行');
  }

  // 门限验证：必须提供至少 2 个非空碎片
  const validShares = shares.filter((s) => s && s.trim().length > 0);
  if (validShares.length < 2) {
    throw new Error('门限验证失败：必须同时提供两位信使的钥匙碎片才能合成解密主密钥');
  }

  // 1. 通过沙米尔算法合成 MasterKey Hex
  const secrets = await getSecrets();
  let combinedKeyHex: string;
  try {
    combinedKeyHex = secrets.combine(validShares);
  } catch (err: any) {
    throw new Error('密钥碎片格式无效或已被损坏，无法合成解密钥匙');
  }

  if (!combinedKeyHex || combinedKeyHex.length < 64) {
    throw new Error('钥匙碎片不匹配，无法还原主密钥');
  }

  // 2. 导入还原出的 MasterKey
  const rawKey = hexToBuf(combinedKeyHex);
  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const cipherBuffer = base64ToBuf(ciphertextBase64);
  const iv = base64ToBuf(ivBase64);

  // 3. 本地解密
  try {
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cryptoKey,
      cipherBuffer
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    const payload = JSON.parse(decryptedText) as VaultPayload;
    return payload;
  } catch (err: any) {
    throw new Error('解密失败：钥匙碎片无法匹配此加密档案，或档案已被篡改损坏');
  }
}

/**
 * 单独生成一组测试碎片工具方法
 */
export async function generateSampleShares(): Promise<string[]> {
  const secrets = await getSecrets();
  const mockKeyHex = '8f3b147a90e25c81d3f4567890abcdef1234567890abcdef1234567890abcdef';
  return secrets.share(mockKeyHex, 2, 2);
}

/**
 * 现场实时纯文本沙米尔门限切分（供首页沙盒与交互式演示使用）
 */
export async function splitSecretTextDirectly(text: string): Promise<string[]> {
  const secrets = await getSecrets();
  const hex = secrets.str2hex(encodeURIComponent(text));
  return secrets.share(hex, 2, 2);
}

/**
 * 现场实时沙米尔碎片合成还原纯文本
 */
export async function combineSecretTextDirectly(shares: string[]): Promise<string> {
  const secrets = await getSecrets();
  const combinedHex = secrets.combine(shares);
  const rawStr = secrets.hex2str(combinedHex);
  return decodeURIComponent(rawStr);
}

