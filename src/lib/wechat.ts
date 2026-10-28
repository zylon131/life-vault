import { createHash } from "crypto";

type WechatApiResult = {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
  ticket?: string;
  msgid?: string | number;
  openid?: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export function wechatConfigured() {
  return !!(
    process.env.WECHAT_APP_ID &&
    process.env.WECHAT_APP_SECRET &&
    process.env.WECHAT_TOKEN &&
    process.env.WECHAT_CHECKIN_TEMPLATE_ID
  );
}

export function wechatSimulationAvailable() {
  return process.env.NODE_ENV !== "production" && !wechatConfigured();
}

export async function getWechatAccessToken() {
  if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET)
    throw new Error("微信服务号尚未配置");
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now())
    return cachedAccessToken.token;
  const query = new URLSearchParams({
    grant_type: "client_credential",
    appid: process.env.WECHAT_APP_ID,
    secret: process.env.WECHAT_APP_SECRET,
  });
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = (await response.json()) as WechatApiResult;
  if (!response.ok || !data.access_token || !data.expires_in)
    throw new Error(`获取微信接口凭证失败：${data.errmsg || response.status}`);
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in - 300) * 1000,
  };
  return data.access_token;
}

export async function createWechatBindingQr(scene: string) {
  const accessToken = await getWechatAccessToken();
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expire_seconds: 600,
        action_name: "QR_STR_SCENE",
        action_info: { scene: { scene_str: scene } },
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const data = (await response.json()) as WechatApiResult;
  if (!response.ok || !data.ticket)
    throw new Error(`生成微信绑定二维码失败：${data.errmsg || response.status}`);
  return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(data.ticket)}`;
}

export async function sendCheckInTemplateMessage(params: {
  openId: string;
  userName: string;
  checkInUrl: string;
  reminderTime: string;
}) {
  if (!process.env.WECHAT_CHECKIN_TEMPLATE_ID)
    throw new Error("微信报平安模板尚未配置");
  const accessToken = await getWechatAccessToken();
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: params.openId,
        template_id: process.env.WECHAT_CHECKIN_TEMPLATE_ID,
        url: params.checkInUrl,
        data: {
          first: { value: `${params.userName}，今晚也来报个平安。` },
          keyword1: { value: "每日平安确认" },
          keyword2: { value: params.reminderTime },
          remark: { value: "点开这条消息即可完成，不需要登录网站。" },
        },
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const data = (await response.json()) as WechatApiResult;
  if (!response.ok || data.errcode !== 0)
    throw new Error(`发送微信提醒失败：${data.errmsg || response.status}`);
  return String(data.msgid || "");
}

export async function exchangeWechatOAuthCode(code: string) {
  if (!process.env.WECHAT_APP_ID || !process.env.WECHAT_APP_SECRET)
    throw new Error("微信网页授权尚未配置");
  const query = new URLSearchParams({
    appid: process.env.WECHAT_APP_ID,
    secret: process.env.WECHAT_APP_SECRET,
    code,
    grant_type: "authorization_code",
  });
  const response = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?${query}`,
    { cache: "no-store", signal: AbortSignal.timeout(10000) },
  );
  const data = (await response.json()) as WechatApiResult;
  if (!response.ok || !data.openid)
    throw new Error(`验证微信身份失败：${data.errmsg || response.status}`);
  return data.openid;
}

export function verifyWechatSignature(
  signature: string,
  timestamp: string,
  nonce: string,
) {
  const configuredToken = process.env.WECHAT_TOKEN;
  if (!configuredToken || !signature || !timestamp || !nonce) return false;
  const value = [configuredToken, timestamp, nonce].sort().join("");
  return createHash("sha1").update(value).digest("hex") === signature;
}

function xmlValue(xml: string, tag: string) {
  const match = xml.match(
    new RegExp(
      `<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`,
    ),
  );
  return (match?.[1] || match?.[2] || "").trim();
}

export function parseWechatEvent(xml: string) {
  if (xml.length > 100_000) throw new Error("微信事件内容过大");
  return {
    fromUserName: xmlValue(xml, "FromUserName"),
    event: xmlValue(xml, "Event"),
    eventKey: xmlValue(xml, "EventKey"),
  };
}
