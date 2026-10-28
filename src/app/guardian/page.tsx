"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sun, QrCode } from "lucide-react";
import { api, useVault } from "@/components/VaultProvider";
import { AccountGate, Field, Message, Workspace } from "@/components/Workspace";

type Binding = {
  token?: string;
  qrUrl?: string;
  simulated: boolean;
  expiresAt: number;
};

function GuardianSettings() {
  const vault = useVault();
  const snapshot = vault.snapshot!;
  const watch = vault.watch;

  const [intervalDays, setIntervalDays] = useState(
    watch.intervalDays || 14,
  );
  const [vacationPaused, setVacationPaused] = useState(
    Boolean(watch.vacationPaused),
  );
  const [pausedNote, setPausedNote] = useState(watch.pausedNote || "");
  const [binding, setBinding] = useState<Binding | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [phoneDevCode, setPhoneDevCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIntervalDays(watch.intervalDays || 14);
    setVacationPaused(Boolean(watch.vacationPaused));
    setPausedNote(watch.pausedNote || "");
  }, [watch]);

  async function saveWatchConfig(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await vault.saveWatch({
        intervalDays,
        vacationPaused,
        pausedNote,
      });
      setMessage(
        vacationPaused
          ? "已开启暂缓模式，期间不会触发失联确认。"
          : `已保存：每 ${intervalDays} 天向你本人问候一次。`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function quickCheckIn() {
    setBusy(true);
    setError("");
    try {
      await api("/api/checkin", { action: "checkin" });
      await vault.saveWatch({
        stage:
          vault.silentTrustees.length === 2
            ? "PEACEFUL_WATCH"
            : "QUIET_WRITING",
      });
      setMessage("已记下你的平安，新的 14 天周期已重新开始。");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startBinding() {
    setBusy(true);
    setError("");
    try {
      setBinding(await api("/api/wechat/bind", { action: "request" }));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function simulateBinding() {
    if (!binding?.token) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/wechat/bind", {
        action: "simulate",
        token: binding.token,
      });
      setBinding(null);
      await vault.refresh();
      setMessage("微信已绑定。");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestPhoneCode() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/account/phone", {
        action: "request",
        phone,
      });
      setPhoneCodeSent(true);
      setPhoneDevCode(result.devCode || "");
      setMessage("验证码已发出。");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyPhone() {
    setBusy(true);
    setError("");
    try {
      await api("/api/account/phone", {
        action: "verify",
        phone,
        code: phoneCode,
        consent: phoneConsent,
      });
      await vault.refresh();
      setPhone("");
      setPhoneCode("");
      setPhoneCodeSent(false);
      setPhoneDevCode("");
      setPhoneConsent(false);
      setMessage("备用手机号已绑定。");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-grid">
      <div className="stack">
        <section className="panel dashboard-welcome">
          <div>
            <h2>今日安好</h2>
            <p style={{ marginTop: 6 }}>
              上次报平安：{new Date(snapshot.lastCheckInAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <button
            type="button"
            className="checkin-orbit"
            disabled={busy}
            onClick={quickCheckIn}
          >
            <Sun size={20} strokeWidth={1.4} /> 报个平安
          </button>
        </section>

        <Message error text={error} />
        <Message text={message} />

        <form className="panel" onSubmit={saveWatchConfig}>
          <h2>问候周期</h2>
          <p className="small" style={{ marginBottom: 18 }}>
            默认每 14 天向你本人温和问候一次。收到时轻点一下即可，不打扰日常。
          </p>

          <div className="field-row">
            <div className="field">
              <label htmlFor="interval-days">问候间隔</label>
              <select
                id="interval-days"
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
              >
                <option value={7}>每 7 天</option>
                <option value={14}>每 14 天（推荐）</option>
                <option value={30}>每 30 天</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vacation-note">远行备注（选填）</label>
              <input
                id="vacation-note"
                value={pausedNote}
                onChange={(e) => setPausedNote(e.target.value)}
                placeholder="例如：近期远行，信号不便"
              />
            </div>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={vacationPaused}
              onChange={(e) => setVacationPaused(e.target.checked)}
            />
            <span>开启远行暂缓模式（期间暂停问候与失联确认）</span>
          </label>

          <button className="button" disabled={busy}>
            <Check size={16} /> 保存设置
          </button>
        </form>

        <section className="panel">
          <h2>如果哪天你没有回应，会怎样推进？</h2>
          <p className="small" style={{ marginBottom: 18 }}>
            在去打扰那两位托付之人前，只会先向你本人由缓到急地确认：
          </p>
          <div className="escalation-list">
            {[
              [
                "第一步 · 温和问候",
                "满 14 天未回应时，向你本人发去问候：“最近比较忙吗？看到请点一下报个平安。”",
              ],
              [
                "第二步 · 多渠道找你",
                "仍无回音时，同步通过微信、短信与邮件找你本人：“已连续多日未收到你的消息，如一切安好请回复一声。”",
              ],
              [
                "第三步 · 最后一封确认信",
                "向你本人发出最后一次确认。只要你在任何一刻点一下，一切如常，亲友依然一无所知。",
              ],
              [
                "第四步 · 托付之人共同印证",
                "唯有你本人彻底失去回音，才会带着你写下的那段往事联系他们两位。当两人都确认你已离开，手记才会缓缓展开。",
              ],
            ].map(([title, desc]) => (
              <div className="escalation-item" key={title}>
                <strong>{title}</strong>
                <p style={{ marginTop: 4, fontSize: 14 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>本人备用联络方式（选填）</h2>
          <p className="small" style={{ marginBottom: 18 }}>
            绑定微信或本人手机号后，超期确认将同步发往这些通道，避免因漏看邮件而误触发。
          </p>

          <div style={{ marginBottom: 22 }}>
            {snapshot.wechatBound ? (
              <div className="wechat-bound">
                <span>已绑定微信服务通知</span>
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("/api/wechat/bind", { action: "unbind" });
                      await vault.refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  解除绑定
                </button>
              </div>
            ) : binding ? (
              <div className="wechat-binding">
                <div className="binding-qr simulated">
                  <QrCode size={48} strokeWidth={1.2} />
                </div>
                <div>
                  <p className="small" style={{ marginBottom: 12 }}>
                    扫码关注后即可在微信内一键报平安。
                  </p>
                  {binding.simulated && (
                    <button
                      className="button light small-button"
                      disabled={busy}
                      onClick={simulateBinding}
                    >
                      模拟完成绑定
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="button light small-button"
                disabled={busy || !snapshot.wechatAvailable}
                onClick={startBinding}
              >
                <QrCode size={15} /> 绑定微信服务通知
              </button>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (phoneCodeSent) void verifyPhone();
              else void requestPhoneCode();
            }}
          >
            <Field
              label={
                snapshot.phoneVerified
                  ? `已绑定手机（${snapshot.phone}），可更换`
                  : "本人备用手机号"
              }
              value={phone}
              onChange={setPhone}
              type="tel"
              inputMode="tel"
              placeholder="中国大陆手机号"
              required
            />
            {phoneCodeSent && (
              <>
                <Field
                  label="短信验证码"
                  value={phoneCode}
                  onChange={(value) =>
                    setPhoneCode(value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={phoneConsent}
                    onChange={(event) => setPhoneConsent(event.target.checked)}
                  />
                  <span>同意在超期未回应时向该号码发送本人确认短信。</span>
                </label>
              </>
            )}
            {phoneDevCode && (
              <div className="notice">
                本地验证码：<strong>{phoneDevCode}</strong>
              </div>
            )}
            <button className="button light small-button" disabled={busy}>
              {phoneCodeSent ? "验证并保存手机号" : "发送短信验证码"}
            </button>
          </form>
        </section>
      </div>

      <aside className="stack">
        <div className="side-note">
          <h3>从容而不打扰</h3>
          <p>
            每 14 天一次的节奏，既不会像每日打卡那样成为负担，也能在真正发生意外时留出稳妥的确认窗口。
          </p>
          <Link
            href="/unlock"
            className="text-button"
            style={{ marginTop: 12 }}
          >
            查看双人求证预览 <ArrowRight size={14} />
          </Link>
        </div>
      </aside>
    </div>
  );
}

export default function Guardian() {
  return (
    <AccountGate>
      <Workspace
        title="日常守望"
        description="平时每半个月温和问候一次；未回应时先向你本人由缓到急确认。"
      >
        <GuardianSettings />
      </Workspace>
    </AccountGate>
  );
}
