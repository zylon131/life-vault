"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Copy, RotateCcw, ArrowRight } from "lucide-react";
import { useVault } from "@/components/VaultProvider";
import { Message } from "@/components/Workspace";
import {
  NotebookData,
  TrustedPerson,
  sample40Notebook,
  countNotebookSections,
} from "@/lib/notebook";

const SAMPLE_TRUSTEES: [TrustedPerson, TrustedPerson] = [
  {
    slot: 0,
    name: "林夏",
    relation: "伴侣",
    contact: "138****8001",
    secretMemory:
      "夏夏，还记得 2016 年我们在鼓浪屿迷路，蹲在路边分吃一碗沙茶面吗？看到这句话，你就知道这是我亲笔留给你的手记了。",
    confirmedPassing: false,
  },
  {
    slot: 1,
    name: "陈默（老陈）",
    relation: "二十年挚友",
    contact: "139****9002",
    secretMemory:
      "老陈，还记得 2018 年我们在成都暴雨里吃着火锅唱《山丘》吗？那晚我们聊起的人生后半场，我都写在这本手记里了。",
    confirmedPassing: false,
  },
];

export default function UnlockPage() {
  const v = useVault();
  const hasUserNotebook =
    v.user && countNotebookSections(v.notebook).totalItems > 0;
  const activeNotebook: NotebookData = hasUserNotebook
    ? v.notebook
    : sample40Notebook();

  const hasUserTrustees = v.user && v.silentTrustees.length === 2;
  const [localConfirmed, setLocalConfirmed] = useState<[boolean, boolean]>([
    false,
    false,
  ]);
  const [pausedBy, setPausedBy] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  const trustees: [TrustedPerson, TrustedPerson] = hasUserTrustees
    ? [
        {
          ...v.silentTrustees[0],
          confirmedPassing:
            v.silentTrustees[0].confirmedPassing || localConfirmed[0],
        },
        {
          ...v.silentTrustees[1],
          confirmedPassing:
            v.silentTrustees[1].confirmedPassing || localConfirmed[1],
        },
      ]
    : [
        { ...SAMPLE_TRUSTEES[0], confirmedPassing: localConfirmed[0] },
        { ...SAMPLE_TRUSTEES[1], confirmedPassing: localConfirmed[1] },
      ];

  const confirmedCount =
    (trustees[0].confirmedPassing ? 1 : 0) +
    (trustees[1].confirmedPassing ? 1 : 0);
  const bothConfirmed = confirmedCount === 2 && !pausedBy;

  async function handlePause(slot: 0 | 1) {
    const person = trustees[slot];
    setPausedBy(person.name);
    setLocalConfirmed([false, false]);
    setNotice(
      `${person.name} 选择了「他只是暂时不方便，先暂停」。本轮求证已中止，手记继续封存保密。`,
    );
    if (hasUserTrustees) {
      try {
        await v.actAsTrustee(slot, "pause");
      } catch {
        // Fallback
      }
    }
  }

  async function handleConfirmPassing(slot: 0 | 1) {
    const person = trustees[slot];
    setPausedBy("");
    const next: [boolean, boolean] = [...localConfirmed] as [boolean, boolean];
    next[slot] = true;
    setLocalConfirmed(next);
    if (hasUserTrustees) {
      try {
        await v.actAsTrustee(slot, "confirm_passing");
      } catch {
        // Fallback
      }
    }
    const willBeBoth =
      (slot === 0 ? true : trustees[0].confirmedPassing) &&
      (slot === 1 ? true : trustees[1].confirmedPassing);
    setNotice(
      willBeBoth
        ? "两位托付之人均已确认。手记已在下方完整展开。"
        : `已记录 ${person.name} 的确认（1/2）。待另一位托付之人确认后，手记将正式展开。`,
    );
  }

  async function handleReset() {
    setPausedBy("");
    setLocalConfirmed([false, false]);
    setNotice("");
    if (hasUserTrustees) {
      try {
        await v.actAsTrustee(0, "reset");
      } catch {
        // Fallback
      }
    }
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2500);
    } catch {
      // Ignore
    }
  }

  const authorName = v.user?.name || "林深";

  return (
    <div className="wrap workspace">
      <header className="page-head">
        <div>
          <p className="eyebrow">托付开启的那一刻</p>
          <h1>直到最后那一刻，才向他们两位缓缓展开。</h1>
          <p>
            唯有当你本人彻底失去回音，这封信才会送到两位托付之人面前。当他们两人都确认你已离开，整本手记便毫无保留地向他们敞开。
          </p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          {(confirmedCount > 0 || pausedBy) && (
            <button
              type="button"
              className="button light small-button"
              onClick={handleReset}
            >
              <RotateCcw size={14} /> 重置状态
            </button>
          )}
          <Link href="/vault/edit" className="button light small-button">
            返回手记
          </Link>
        </div>
      </header>

      <Message text={notice} />

      {/* DUAL CONFIRMATION */}
      <section className="panel">
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>两位托付之人收到的信</h2>
            <p className="small">
              如果只是住院或远行，任一人轻点「暂时不便」即可按住；唯有两人都确认离开，手记才会展开：
            </p>
          </div>
          <span className={`status ${bothConfirmed ? "" : "pending"}`}>
            {pausedBy
              ? "已暂停开启"
              : bothConfirmed
                ? "两人均已印证 · 手记已展开"
                : `${confirmedCount} / 2 已确认`}
          </span>
        </div>

        <div className="trustee-grid">
          {trustees.map((t, idx) => {
            const slot = (idx === 0 ? 0 : 1) as 0 | 1;
            return (
              <article
                key={slot}
                className={`confirm-card ${t.confirmedPassing ? "confirmed" : ""}`}
              >
                <div className="confirm-card-top">
                  <div>
                    <span className="confirm-slot-label">{t.relation}</span>
                    <h3>{t.name}</h3>
                  </div>
                  <span
                    className={`status ${t.confirmedPassing ? "" : "pending"}`}
                  >
                    {t.confirmedPassing ? "已确认" : "待确认"}
                  </span>
                </div>

                <div className="secret-memory-box">
                  <span className="secret-memory-label">
                    {authorName} 留给你的那句话：
                  </span>
                  <blockquote>“{t.secretMemory}”</blockquote>
                </div>

                <div className="confirm-actions">
                  <button
                    type="button"
                    className="button light full pause-btn"
                    onClick={() => handlePause(slot)}
                  >
                    他只是暂时不方便（住院/出差/忙），先暂停
                  </button>

                  <button
                    type="button"
                    className="button full"
                    disabled={t.confirmedPassing}
                    onClick={() => handleConfirmPassing(slot)}
                  >
                    <Check size={16} />
                    {t.confirmedPassing
                      ? "已确认他离开人世"
                      : "我已核实，确认他已经离开"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {!bothConfirmed && (
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid var(--line)",
              flexWrap: "wrap",
            }}
          >
            <span className="small muted">
              需两位托付之人均确认离开后，下方手记才会展开。
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setPausedBy("");
                setLocalConfirmed([true, true]);
              }}
            >
              直接预览两人确认后的完整手记 <ArrowRight size={14} />
            </button>
          </div>
        )}
      </section>

      {/* UNFOLDED BOOK */}
      {bothConfirmed && (
        <div className="unfolded-book reveal" style={{ marginTop: 32 }}>
          <section className="book-prologue">
            <div className="book-prologue-top">
              <span className="eyebrow">
                致 {trustees[0].name} 与 {trustees[1].name}
              </span>
              <span className="postmark">
                有所托
                <br />
                亲笔手记
              </span>
            </div>
            <h2>他把这一生最后的体面与牵挂，毫无保留地交给了你们两个人。</h2>
            <div className="book-prologue-body">
              {activeNotebook.prologue.openingWords
                .split("\n\n")
                .map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
            </div>
            <div className="book-prologue-sign">—— {authorName}</div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第一篇 · 模样</span>
              <h2>我想被记住的样子</h2>
            </div>
            <div className="book-block-grid">
              {activeNotebook.portrait.photoClue && (
                <div className="book-block">
                  <h3>最满意的一张照片</h3>
                  <p>{activeNotebook.portrait.photoClue}</p>
                </div>
              )}
              {activeNotebook.portrait.selfWords && (
                <div className="book-block">
                  <h3>我眼中的自己</h3>
                  <p>{activeNotebook.portrait.selfWords}</p>
                </div>
              )}
              {activeNotebook.portrait.favorites && (
                <div className="book-block full-span">
                  <h3>我的偏爱印记</h3>
                  <p className="pre-line">{activeNotebook.portrait.favorites}</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第二篇 · 告别</span>
              <h2>我想要的告别与尊严</h2>
            </div>
            <div className="book-block-grid">
              {activeNotebook.farewell.atmosphere && (
                <div className="book-block">
                  <h3>向往的告别氛围</h3>
                  <p className="pre-line">{activeNotebook.farewell.atmosphere}</p>
                </div>
              )}
              {activeNotebook.farewell.taboos && (
                <div className="book-block">
                  <h3>明确拒绝的世俗套路</h3>
                  <p className="pre-line">{activeNotebook.farewell.taboos}</p>
                </div>
              )}
              {activeNotebook.farewell.medicalDignity && (
                <div className="book-block">
                  <h3>生命最后一步的身体尊严</h3>
                  <p className="pre-line">
                    {activeNotebook.farewell.medicalDignity}
                  </p>
                </div>
              )}
              {activeNotebook.farewell.restingPlace && (
                <div className="book-block">
                  <h3>关于归宿</h3>
                  <p className="pre-line">
                    {activeNotebook.farewell.restingPlace}
                  </p>
                </div>
              )}
              {activeNotebook.farewell.missedCeremonyNote && (
                <div className="book-block full-span highlight-missed-ceremony">
                  <h3>如果你们看到时，世俗的葬礼已经办过了</h3>
                  <p className="pre-line">
                    {activeNotebook.farewell.missedCeremonyNote}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第三篇 · 知会</span>
              <h2>请替我通知的人</h2>
            </div>
            <div className="book-cards-list">
              {activeNotebook.people.map((p) => {
                const copyStr = `${p.name}，你好。我是${authorName}生前最信任的朋友。他已经先走一步了，生前特地在手记里嘱托我通知你（${p.circle || p.relation}）。他留给你的话是：“${p.message}”`;
                return (
                  <article className="book-item-card" key={p.id}>
                    <div className="book-item-top">
                      <div>
                        <h3>{p.name}</h3>
                        <p className="small muted">
                          {p.relation}
                          {p.circle ? ` · 请顺便转告：${p.circle}` : ""}
                        </p>
                        <p className="contact-line">{p.contact}</p>
                      </div>
                      <button
                        type="button"
                        className="button light small-button"
                        onClick={() => copyText(p.id, copyStr)}
                      >
                        <Copy size={14} />{" "}
                        {copiedId === p.id ? "已复制" : "复制通知话术"}
                      </button>
                    </div>
                    {p.message && (
                      <blockquote className="book-item-quote">
                        “{p.message}”
                      </blockquote>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第四篇 · 家书</span>
              <h2>请替我转达的话</h2>
            </div>

            <div className="book-block-grid" style={{ marginBottom: 22 }}>
              {activeNotebook.letters.worldFarewell && (
                <div className="book-block">
                  <h3>留给世界的一句话</h3>
                  <p className="serif-quote">
                    “{activeNotebook.letters.worldFarewell}”
                  </p>
                </div>
              )}
              {activeNotebook.letters.finalMomentPost && (
                <div className="book-block">
                  <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <h3>微信朋友圈最后一条动态</h3>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        copyText(
                          "moment",
                          activeNotebook.letters.finalMomentPost,
                        )
                      }
                    >
                      <Copy size={14} />{" "}
                      {copiedId === "moment" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="pre-line">
                    {activeNotebook.letters.finalMomentPost}
                  </p>
                </div>
              )}
            </div>

            <div className="book-cards-list">
              {activeNotebook.letters.items.map((l) => (
                <article className="book-letter-paper" key={l.id}>
                  <div className="book-item-top">
                    <div>
                      <h3>致：{l.recipient}</h3>
                      {l.contact && (
                        <p className="small muted">{l.contact}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="button light small-button"
                      onClick={() =>
                        copyText(
                          l.id,
                          `致 ${l.recipient}：\n\n${l.content}\n\n—— ${authorName}`,
                        )
                      }
                    >
                      <Copy size={14} />{" "}
                      {copiedId === l.id ? "已复制" : "复制信件"}
                    </button>
                  </div>
                  <div className="book-letter-content pre-line">
                    {l.content}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第五篇 · 旧物与私密</span>
              <h2>旧物托付、宠物与私密抹去</h2>
            </div>

            {activeNotebook.belongings.privateCleanup && (
              <div className="book-block highlight-private-cleanup">
                <h3>请先一步替我静静销毁的私密角落</h3>
                <p className="pre-line">
                  {activeNotebook.belongings.privateCleanup}
                </p>
              </div>
            )}

            <div className="book-cards-list" style={{ marginTop: 18 }}>
              {activeNotebook.belongings.items.map((item) => (
                <article className="book-item-card" key={item.id}>
                  <h3>{item.itemName}</h3>
                  <p className="contact-line">交给：{item.recipient}</p>
                  <p className="small muted" style={{ marginTop: 6 }}>
                    {item.note}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel book-chapter">
            <div className="book-chapter-head">
              <span className="chapter-folio">第六篇 · 线索</span>
              <h2>未尽之事与家底线索</h2>
            </div>

            <div className="book-block-grid">
              {activeNotebook.clues.debtsAndFavors && (
                <div className="book-block full-span">
                  <h3>未了的人情与往来账</h3>
                  <p className="pre-line">
                    {activeNotebook.clues.debtsAndFavors}
                  </p>
                </div>
              )}
              {activeNotebook.clues.assetClues && (
                <div className="book-block">
                  <h3>保单与资产线索</h3>
                  <p className="pre-line">{activeNotebook.clues.assetClues}</p>
                </div>
              )}
              {activeNotebook.clues.digitalClues && (
                <div className="book-block">
                  <h3>数字世界与设备线索</h3>
                  <p className="pre-line">
                    {activeNotebook.clues.digitalClues}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
