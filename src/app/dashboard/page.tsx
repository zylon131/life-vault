"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sun, Check } from "lucide-react";
import { useVault, api } from "@/components/VaultProvider";
import { Workspace, AccountGate, Message } from "@/components/Workspace";
import { countNotebookSections } from "@/lib/notebook";

export default function Dashboard() {
  const v = useVault();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const s = v.snapshot;
  const stats = countNotebookSections(v.notebook);
  const trusteesConfigured =
    v.silentTrustees.length === 2 &&
    v.silentTrustees.every((t) => t.name && t.contact && t.secretMemory);
  const ready = stats.totalItems > 0 && trusteesConfigured;

  return (
    <AccountGate>
      <Workspace
        title={v.user?.name + "的书房"}
        description="把重要的事安顿好，剩下的日子，轻装去生活。"
        actions={
          <Link className="button light" href="/vault/edit">
            翻开手记 <ArrowRight size={15} />
          </Link>
        }
      >
        <div className="stack">
          <div className="dashboard-welcome">
            <div>
              <h2>牵挂有处安放，今天也去晒晒太阳。</h2>
              <p style={{ marginTop: 6 }}>
                上次报平安：
                {s ? new Date(s.lastCheckInAt).toLocaleString("zh-CN") : "—"} ·
                每 {v.watch.intervalDays || 14} 天温和问候一次
              </p>
            </div>
            <button
              className="checkin-orbit"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr("");
                try {
                  await api("/api/checkin", { action: "checkin" });
                  await v.saveWatch({
                    stage: trusteesConfigured
                      ? "PEACEFUL_WATCH"
                      : "QUIET_WRITING",
                  });
                  setMsg("已记下你的平安，愿今天也有好心情。");
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sun size={20} strokeWidth={1.35} /> 报个平安
            </button>
          </div>

          <Message text={msg} />
          <Message error text={err} />

          <div className="stat-grid">
            <div className="stat">
              <span>人生谢幕手记</span>
              <strong>{stats.filledChapters} / 6 篇</strong>
              <span>已写下 {stats.totalItems} 处嘱托</span>
            </div>
            <div className="stat">
              <span>托付之人</span>
              <strong>{trusteesConfigured ? "2 位" : "待填写"}</strong>
              <span>
                {trusteesConfigured
                  ? `${v.silentTrustees[0].name} · ${v.silentTrustees[1].name}`
                  : "生前静默，不发打扰通知"}
              </span>
            </div>
            <div className="stat">
              <span>日常问候</span>
              <strong>{v.watch.intervalDays || 14} 天</strong>
              <span>失联先向你本人递进确认</span>
            </div>
          </div>

          <div className="workspace-grid">
            <section className="panel">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>手记进度</h2>
                <span className={"status " + (!ready ? "pending" : "")}>
                  {ready ? "已妥帖安顿" : "可慢慢补全"}
                </span>
              </div>

              {[
                [
                  "写下《人生谢幕手记》",
                  stats.totalItems > 0
                    ? `已写 ${stats.filledChapters} 篇，随时可回来修改`
                    : "从一首歌、一张照片或一个名字开始",
                  "/vault/edit",
                  stats.totalItems > 0,
                ],
                [
                  "留下两位托付之人",
                  trusteesConfigured
                    ? `已登记 ${v.silentTrustees[0].name} 与 ${v.silentTrustees[1].name}`
                    : "记下联系方式与只有你们知道的一句往事",
                  "/vault/keys",
                  trusteesConfigured,
                ],
                [
                  "日常守望设置",
                  `每 ${v.watch.intervalDays || 14} 天温和问候一次`,
                  "/guardian",
                  true,
                ],
                [
                  "开启预览",
                  "看看当那一天到来时，他们两位看到的画面",
                  "/unlock",
                  ready,
                ],
              ].map(([title, desc, url, done]) => (
                <div className="list-row" key={String(title)}>
                  <div className="row">
                    {done ? (
                      <Check size={19} />
                    ) : (
                      <span
                        style={{
                          width: 19,
                          height: 19,
                          border: "1px solid #b5a895",
                          borderRadius: "50%",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                  </div>
                  <Link href={String(url)} aria-label={String(title)}>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              ))}
            </section>

            <aside className="stack">
              <div className="side-note">
                <h3>生前静默</h3>
                <p>
                  在你正常生活的每一天，两位托付之人不会收到任何消息。这本手记只安静地陪着你。
                </p>
              </div>
            </aside>
          </div>
        </div>
      </Workspace>
    </AccountGate>
  );
}
