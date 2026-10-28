"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Feather, RefreshCw } from "lucide-react";
import { api, useVault } from "@/components/VaultProvider";
import { Field, Message } from "@/components/Workspace";

export default function Login() {
  const v = useVault();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/api/auth/email", {
        action: "request",
        email,
      });
      setSent(true);
      setCooldown(60);
      setDevCode(result.devCode || "");
      setMessage(
        "验证码已寄出，十分钟内有效。本地体验可直接复制下方显示的六位验证码。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap workspace">
      <div className="auth-layout">
        <div className="auth-story">
          <p className="eyebrow">深夜书房</p>
          <h1>
            把那场体面的谢幕写好，
            <br />
            然后轻装去生活。
          </h1>
          <p>
            凭验证码即可随时推门而入。生前绝对静默，在你平安生活的每一天，系统不会惊动任何亲友。
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!sent) {
              await requestCode();
              return;
            }
            setError("");
            setBusy(true);
            try {
              await v.login({
                action: "verify",
                name,
                email,
                code,
              });
              setCode("");
              router.push("/vault/edit");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="auth-letter-mark" aria-hidden="true">
            <Feather size={21} strokeWidth={1.4} />
          </div>
          <p className="eyebrow">推门入座</p>
          <h2>
            {sent ? "输入六位验证码。" : "留下常用邮箱，打开私人手记。"}
          </h2>

          {v.user && (
            <div className="notice">
              当前已登录为 {v.user.name}。{" "}
              <Link className="text-button" href="/vault/edit">
                进入手记
              </Link>
            </div>
          )}

          {!sent ? (
            <>
              <Field
                label="常用邮箱"
                value={email}
                onChange={setEmail}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
              />
              <Field
                label="落款称呼"
                value={name}
                onChange={setName}
                placeholder="例如：林深"
                autoComplete="name"
              />
            </>
          ) : (
            <div className="auth-code-slip">
              <span>验证码已发往</span>
              <strong>{email}</strong>
              <Field
                label="六位验证码"
                value={code}
                onChange={(value) =>
                  setCode(value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                required
              />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setDevCode("");
                  setMessage("");
                  setCooldown(0);
                }}
              >
                更换邮箱地址
              </button>
            </div>
          )}

          {devCode && (
            <div className="notice">
              本地体验验证码（点击或输入即可）：<strong>{devCode}</strong>
              <button
                type="button"
                className="text-button"
                style={{ marginLeft: 12 }}
                onClick={() => setCode(devCode)}
              >
                一键填入
              </button>
            </div>
          )}

          <Message text={message} />
          <Message error text={error} />

          <button className="button full" disabled={busy}>
            {busy
              ? sent
                ? "正在打开书房…"
                : "正在发送…"
              : sent
                ? "验证并打开《人生谢幕手记》"
                : "获取六位验证码"}{" "}
            <ArrowRight size={16} />
          </button>

          {sent && (
            <button
              type="button"
              className="text-button auth-resend"
              disabled={busy || cooldown > 0}
              onClick={() => void requestCode()}
            >
              <RefreshCw size={14} />
              {cooldown > 0 ? `${cooldown} 秒后可重发` : "重新发送验证码"}
            </button>
          )}

          <p className="small muted auth-consent">
            继续即表示你已了解
            <Link className="text-button" href="/privacy" target="_blank">
              隐私与托付边界说明
            </Link>
            。
          </p>
        </form>
      </div>
    </div>
  );
}
