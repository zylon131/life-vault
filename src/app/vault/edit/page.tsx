"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Check, ArrowRight } from "lucide-react";
import { useVault } from "@/components/VaultProvider";
import {
  Workspace,
  AccountGate,
  Field,
  Message,
} from "@/components/Workspace";
import {
  NotebookData,
  sample40Notebook,
  countNotebookSections,
  DEFAULT_PROLOGUE,
} from "@/lib/notebook";

type ChapterKey =
  | "prologue"
  | "portrait"
  | "farewell"
  | "people"
  | "letters"
  | "belongings"
  | "clues";

const CHAPTER_META: Record<
  ChapterKey,
  {
    folio: string;
    title: string;
    subtitle: string;
  }
> = {
  prologue: {
    folio: "序章",
    title: "致我最信任的你们俩",
    subtitle: "两位挚友确认你已离开并打开手记时，第一眼看到的开篇托付词。",
  },
  portrait: {
    folio: "第一篇 · 模样",
    title: "我想被记住的样子",
    subtitle: "拒绝呆板的证件照与公文悼词，留下你最舒展的模样与偏爱。",
  },
  farewell: {
    folio: "第二篇 · 告别",
    title: "我想要的告别与尊严",
    subtitle: "从最后一步的身体尊严，到不落俗套的告别氛围与朋友小聚。",
  },
  people: {
    folio: "第三篇 · 知会",
    title: "请替我通知的人",
    subtitle: "散落在人生不同阶段、家人未必认识的老友，别让我不告而别。",
  },
  letters: {
    folio: "第四篇 · 家书",
    title: "请替我转达的话",
    subtitle: "留给世界的谢幕词、朋友圈最后一条动态，以及写给亲友的信。",
  },
  belongings: {
    folio: "第五篇 · 旧物与私密",
    title: "旧物托付、宠物与私密抹去",
    subtitle: "心爱之物交给懂它的人；只想带进风里的秘密请挚友提前替我销毁。",
  },
  clues: {
    folio: "第六篇 · 线索",
    title: "未尽之事与家底线索",
    subtitle: "不留亏欠的人情债，以及家人不知道的保单、账户与收尾线索。",
  },
};

function NotebookEditor() {
  const v = useVault();
  const n = v.notebook;
  const [chapter, setChapter] = useState<ChapterKey>("portrait");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("chapter");
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (
      q &&
      [
        "prologue",
        "portrait",
        "farewell",
        "people",
        "letters",
        "belongings",
        "clues",
      ].includes(q)
    ) {
      setChapter(q as ChapterKey);
    } else if (tab === "people") {
      setChapter("people");
    } else if (tab === "letters") {
      setChapter("letters");
    } else if (tab === "arrangements") {
      setChapter("farewell");
    }
  }, []);

  const stats = countNotebookSections(n);
  const meta = CHAPTER_META[chapter];

  function patch(updater: (prev: NotebookData) => NotebookData) {
    v.updateNotebook(updater(n));
    setSaved("");
  }

  async function handleSave() {
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await v.saveNotebook();
      setSaved("手记已妥善保存。随时可以回来修改。");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fillInspiration() {
    if (
      stats.totalItems > 0 &&
      !window.confirm("用一份「四十岁手记范本」填入各篇章？你可以随后按自己的心意自由修改。")
    ) {
      return;
    }
    v.updateNotebook(sample40Notebook());
    setSaved("已填入范本，可按你的心意自由增删，改完记得点底部保存。");
  }

  return (
    <>
      <div className="workspace-grid">
        <div>
          <div className="chapter-nav-tabs" role="tablist" aria-label="手记篇章">
            {(Object.keys(CHAPTER_META) as ChapterKey[]).map((key) => {
              const item = CHAPTER_META[key];
              const isDone =
                key === "prologue"
                  ? stats.summary.prologue
                  : key === "portrait"
                    ? stats.summary.portrait
                    : key === "farewell"
                      ? stats.summary.farewell
                      : key === "people"
                        ? stats.summary.people > 0
                        : key === "letters"
                          ? stats.summary.letters > 0
                          : key === "belongings"
                            ? stats.summary.belongings
                            : stats.summary.clues;

              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={chapter === key}
                  className={`chapter-nav-btn ${chapter === key ? "active" : ""}`}
                  onClick={() => setChapter(key)}
                >
                  <div className="chapter-nav-top">
                    <span>{item.folio}</span>
                    {isDone && <em className="chapter-done-dot">●</em>}
                  </div>
                  <strong>{item.title}</strong>
                </button>
              );
            })}
          </div>

          <section className="panel notebook-sheet">
            <div className="form-chapter">
              <span>{meta.folio} · {meta.title}</span>
              <p>{meta.subtitle}</p>
            </div>

            {chapter === "prologue" && (
              <>
                <Field
                  label="写给两位受托挚友的开篇词"
                  value={n.prologue.openingWords}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      prologue: { openingWords: val },
                    }))
                  }
                  area
                  rows={8}
                  placeholder={DEFAULT_PROLOGUE}
                />
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      prologue: { openingWords: DEFAULT_PROLOGUE },
                    }))
                  }
                >
                  恢复默认开篇词
                </button>
              </>
            )}

            {chapter === "portrait" && (
              <>
                <Field
                  label="最满意的一张照片（别用呆板的证件照）"
                  value={n.portrait.photoClue}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      portrait: { ...prev.portrait, photoClue: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="告诉他们哪张照片里的你最自然舒展，存放在手机相册或电脑的哪个位置。"
                />
                <Field
                  label="我眼中的自己"
                  value={n.portrait.selfWords}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      portrait: { ...prev.portrait, selfWords: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="如果用几句话总结这几十年，你希望大家和孩子提起你时，记住一个怎样的你？"
                />
                <Field
                  label="我的偏爱印记（歌、酒、电影、季节）"
                  value={n.portrait.favorites}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      portrait: { ...prev.portrait, favorites: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="最爱的一首歌、一杯酒或一个地方。以后想我的时候，听听这首歌、喝一杯酒，就算见一面了。"
                />
              </>
            )}

            {chapter === "farewell" && (
              <>
                <Field
                  label="生命最后一步的身体尊严"
                  value={n.farewell.medicalDignity}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      farewell: { ...prev.farewell, medicalDignity: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="若陷入不可逆转的弥留，是否拒绝无谓的创伤性插管与折腾，让自己平静体面地离开？"
                />
                <Field
                  label="我向往的告别氛围"
                  value={n.farewell.atmosphere}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      farewell: { ...prev.farewell, atmosphere: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="放哪几首歌？摆什么花？穿哪件常穿的衣服？或者只请几个懂我的人聚在一起喝一杯？"
                />
                <Field
                  label="我明确拒绝的世俗套路"
                  value={n.farewell.taboos}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      farewell: { ...prev.farewell, taboos: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="写明哪些哭天抢地、吹拉弹唱或繁文缛节是你绝对不愿接受的。"
                />
                <Field
                  label="关于最后的归宿"
                  value={n.farewell.restingPlace}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      farewell: { ...prev.farewell, restingPlace: val },
                    }))
                  }
                  area
                  rows={2}
                  placeholder="海葬、树葬、撒向某片山海，或安放于何处。"
                />
                <Field
                  label="如果你们看到时，世俗的葬礼已经办过了"
                  value={n.farewell.missedCeremonyNote}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      farewell: { ...prev.farewell, missedCeremonyNote: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="挑一个晴朗的周末，叫上几个真朋友，按我喜欢的方式再小聚道别一次。"
                />
              </>
            )}

            {chapter === "people" && (
              <>
                {n.people.length === 0 ? (
                  <div className="empty-inline">
                    <p>大学室友、老同事、远方知己——有谁是你希望他知道一声的？</p>
                    <button
                      type="button"
                      className="button light small-button"
                      onClick={() =>
                        patch((prev) => ({
                          ...prev,
                          people: [
                            ...prev.people,
                            {
                              id: crypto.randomUUID(),
                              name: "",
                              relation: "",
                              circle: "",
                              contact: "",
                              message: "",
                            },
                          ],
                        }))
                      }
                    >
                      <Plus size={15} /> 留下一个名字
                    </button>
                  </div>
                ) : (
                  n.people.map((person, idx) => (
                    <article className="item-editor" key={person.id}>
                      <div className="item-editor-head">
                        <span className="small muted">
                          联系人 · {String(idx + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() =>
                            patch((prev) => ({
                              ...prev,
                              people: prev.people.filter(
                                (x) => x.id !== person.id,
                              ),
                            }))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="field-row">
                        <Field
                          label="称呼 / 姓名"
                          value={person.name}
                          onChange={(v) =>
                            patch((prev) => ({
                              ...prev,
                              people: prev.people.map((x) =>
                                x.id === person.id ? { ...x, name: v } : x,
                              ),
                            }))
                          }
                          placeholder="例如：老陈"
                        />
                        <Field
                          label="联系方式"
                          value={person.contact}
                          onChange={(v) =>
                            patch((prev) => ({
                              ...prev,
                              people: prev.people.map((x) =>
                                x.id === person.id ? { ...x, contact: v } : x,
                              ),
                            }))
                          }
                          placeholder="手机号、微信号或邮箱"
                        />
                      </div>
                      <div className="field-row">
                        <Field
                          label="关系"
                          value={person.relation}
                          onChange={(v) =>
                            patch((prev) => ({
                              ...prev,
                              people: prev.people.map((x) =>
                                x.id === person.id ? { ...x, relation: v } : x,
                              ),
                            }))
                          }
                          placeholder="例如：大学室友"
                        />
                        <Field
                          label="请他顺便知会的圈子（选填）"
                          value={person.circle}
                          onChange={(v) =>
                            patch((prev) => ({
                              ...prev,
                              people: prev.people.map((x) =>
                                x.id === person.id ? { ...x, circle: v } : x,
                              ),
                            }))
                          }
                          placeholder="例如：大学402寝室的兄弟们"
                        />
                      </div>
                      <Field
                        label="带给他的话"
                        value={person.message}
                        onChange={(v) =>
                          patch((prev) => ({
                            ...prev,
                            people: prev.people.map((x) =>
                              x.id === person.id ? { ...x, message: v } : x,
                            ),
                          }))
                        }
                        area
                        rows={3}
                        placeholder="我先走一步了，当年一起喝过的酒，我一直记得。"
                      />
                    </article>
                  ))
                )}
                {n.people.length > 0 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        people: [
                          ...prev.people,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            relation: "",
                            circle: "",
                            contact: "",
                            message: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus size={15} /> 再添一位朋友
                  </button>
                )}
              </>
            )}

            {chapter === "letters" && (
              <>
                <Field
                  label="留给这个世界的一句谢幕词"
                  value={n.letters.worldFarewell}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      letters: { ...prev.letters, worldFarewell: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="人间晃荡数十载，见过春风，淋过暴雨，也爱过对的人。不虚此行，诸位慢走。"
                />
                <Field
                  label="想在微信朋友圈发出的最后一条动态（选填）"
                  value={n.letters.finalMomentPost}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      letters: { ...prev.letters, finalMomentPost: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="配哪张图、发哪句话，跟所有认识的人潇洒挥手。"
                />
                <div className="form-chapter relay-chapter">
                  <span>写给具体的人的信</span>
                  <p>留给父母、伴侣、孩子或挚友的心里话。</p>
                </div>
                {n.letters.items.map((letter, idx) => (
                  <article className="item-editor" key={letter.id}>
                    <div className="item-editor-head">
                      <span className="small muted">
                        家书 · {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() =>
                          patch((prev) => ({
                            ...prev,
                            letters: {
                              ...prev.letters,
                              items: prev.letters.items.filter(
                                (x) => x.id !== letter.id,
                              ),
                            },
                          }))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="field-row">
                      <Field
                        label="致谁"
                        value={letter.recipient}
                        onChange={(v) =>
                          patch((prev) => ({
                            ...prev,
                            letters: {
                              ...prev.letters,
                              items: prev.letters.items.map((x) =>
                                x.id === letter.id ? { ...x, recipient: v } : x,
                              ),
                            },
                          }))
                        }
                        placeholder="例如：妻子林夏 / 女儿小禾"
                      />
                      <Field
                        label="转交线索（选填）"
                        value={letter.contact}
                        onChange={(v) =>
                          patch((prev) => ({
                            ...prev,
                            letters: {
                              ...prev.letters,
                              items: prev.letters.items.map((x) =>
                                x.id === letter.id ? { ...x, contact: v } : x,
                              ),
                            },
                          }))
                        }
                        placeholder="例如：家里人 / 满18岁时转交"
                      />
                    </div>
                    <Field
                      label="正文"
                      value={letter.content}
                      onChange={(v) =>
                        patch((prev) => ({
                          ...prev,
                          letters: {
                            ...prev.letters,
                            items: prev.letters.items.map((x) =>
                              x.id === letter.id ? { ...x, content: v } : x,
                            ),
                          },
                        }))
                      }
                      area
                      rows={5}
                      placeholder="像平时在夜里跟对方说话一样写下来……"
                    />
                  </article>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      letters: {
                        ...prev.letters,
                        items: [
                          ...prev.letters.items,
                          {
                            id: crypto.randomUUID(),
                            recipient: "",
                            relation: "",
                            contact: "",
                            content: "",
                          },
                        ],
                      },
                    }))
                  }
                >
                  <Plus size={15} /> 添一封信
                </button>
              </>
            )}

            {chapter === "belongings" && (
              <>
                <Field
                  label="请先一步替我静静抹去的私密角落"
                  value={n.belongings.privateCleanup}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      belongings: { ...prev.belongings, privateCleanup: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="书房哪个抽屉的旧日记、电脑里的哪个私人文件夹，请两位挚友在整理遗物时先一步替我销毁，不必拆看，守住最后的体面。"
                />
                <div className="form-chapter relay-chapter">
                  <span>心爱旧物与宠物的去向</span>
                  <p>那把吉他、批注的书、猫狗或绿植，希望交给哪个懂它的人？</p>
                </div>
                {n.belongings.items.map((item, idx) => (
                  <article className="item-editor" key={item.id}>
                    <div className="item-editor-head">
                      <span className="small muted">
                        旧物与生灵 · {String(idx + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() =>
                          patch((prev) => ({
                            ...prev,
                            belongings: {
                              ...prev.belongings,
                              items: prev.belongings.items.filter(
                                (x) => x.id !== item.id,
                              ),
                            },
                          }))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="field-row">
                      <Field
                        label="物品或宠物"
                        value={item.itemName}
                        onChange={(v) =>
                          patch((prev) => ({
                            ...prev,
                            belongings: {
                              ...prev.belongings,
                              items: prev.belongings.items.map((x) =>
                                x.id === item.id ? { ...x, itemName: v } : x,
                              ),
                            },
                          }))
                        }
                        placeholder="例如：马丁木吉他 / 橘猫"
                      />
                      <Field
                        label="交给谁"
                        value={item.recipient}
                        onChange={(v) =>
                          patch((prev) => ({
                            ...prev,
                            belongings: {
                              ...prev.belongings,
                              items: prev.belongings.items.map((x) =>
                                x.id === item.id ? { ...x, recipient: v } : x,
                              ),
                            },
                          }))
                        }
                        placeholder="例如：老陈（微信 chenmo_1986）"
                      />
                    </div>
                    <Field
                      label="叮嘱"
                      value={item.note}
                      onChange={(v) =>
                        patch((prev) => ({
                          ...prev,
                          belongings: {
                            ...prev.belongings,
                            items: prev.belongings.items.map((x) =>
                              x.id === item.id ? { ...x, note: v } : x,
                            ),
                          },
                        }))
                      }
                      area
                      rows={2}
                      placeholder="老陈懂琴，请他带走留个念想。"
                    />
                  </article>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    patch((prev) => ({
                      ...prev,
                      belongings: {
                        ...prev.belongings,
                        items: [
                          ...prev.belongings.items,
                          {
                            id: crypto.randomUUID(),
                            itemName: "",
                            recipient: "",
                            contact: "",
                            note: "",
                          },
                        ],
                      },
                    }))
                  }
                >
                  <Plus size={15} /> 添一件旧物或宠物
                </button>
              </>
            )}

            {chapter === "clues" && (
              <>
                <Field
                  label="未了的人情与往来账（别让我带着亏欠走）"
                  value={n.clues.debtsAndFavors}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      clues: { ...prev.clues, debtsAndFavors: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="谁曾雪中送炭帮过我、我还欠谁一份人情或款项？或者谁还欠我未结清的款项？"
                />
                <Field
                  label="家人可能不知道的保单与资产线索"
                  value={n.clues.assetClues}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      clues: { ...prev.clues, assetClues: val },
                    }))
                  }
                  area
                  rows={4}
                  placeholder="哪家保险公司的电子保单、哪些证券或银行账户、重要证件与合同放在哪里？"
                />
                <Field
                  label="数字世界与常用设备线索"
                  value={n.clues.digitalClues}
                  onChange={(val) =>
                    patch((prev) => ({
                      ...prev,
                      clues: { ...prev.clues, digitalClues: val },
                    }))
                  }
                  area
                  rows={3}
                  placeholder="手机与电脑密码线索放在哪本书里？社交账号与自动续费希望怎样处理？"
                />
              </>
            )}
          </section>
        </div>

        <aside className="stack">
          <div className="side-note">
            <h3>不知从何写起？</h3>
            <p>
              你可以先载入一份写好的四十岁手记范本，再顺着改成自己的话。
            </p>
            <button
              type="button"
              className="text-button"
              style={{ marginTop: 10 }}
              onClick={fillInspiration}
            >
              填入四十岁手记范本 <ArrowRight size={14} />
            </button>
          </div>

          <div className="side-note">
            <h3>安静书写</h3>
            <p>
              不必一次写完。目前已写 {stats.filledChapters} / 6 篇，平时只有你本人可见。
            </p>
            <Link
              className="text-button"
              href="/vault/keys"
              style={{ marginTop: 12 }}
            >
              去设置两位托付之人 <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>

      <Message error text={error} />
      <Message text={saved} />

      <div className="save-bar">
        <div>
          <span className="small">
            已写 {stats.filledChapters} 篇 · {stats.totalItems} 处嘱托
          </span>
          <p>{v.dirty ? "有未保存的修改" : "已保存在私人书房"}</p>
        </div>
        <div className="save-bar-actions">
          <Link href="/unlock" className="button light">
            开启预览
          </Link>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={handleSave}
          >
            <Check size={16} /> {busy ? "正在保存…" : "保存手记"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function EditPage() {
  return (
    <AccountGate>
      <Workspace
        title="人生谢幕手记"
        description="不必一次写完。这里只有你一个人，想到哪一页就写哪一页。"
      >
        <NotebookEditor />
      </Workspace>
    </AccountGate>
  );
}
