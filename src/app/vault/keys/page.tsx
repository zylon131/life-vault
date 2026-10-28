"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useVault } from "@/components/VaultProvider";
import {
  AccountGate,
  Field,
  Message,
  Workspace,
} from "@/components/Workspace";
import { TrustedPerson } from "@/lib/notebook";

const EMPTY_TRUSTEES: [TrustedPerson, TrustedPerson] = [
  {
    slot: 0,
    name: "",
    relation: "",
    contact: "",
    secretMemory: "",
    confirmedPassing: false,
  },
  {
    slot: 1,
    name: "",
    relation: "",
    contact: "",
    secretMemory: "",
    confirmedPassing: false,
  },
];

function SilentTrusteesPage() {
  const v = useVault();
  const [list, setList] = useState<[TrustedPerson, TrustedPerson]>(
    EMPTY_TRUSTEES,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (v.silentTrustees && v.silentTrustees.length === 2) {
      setList([
        { ...EMPTY_TRUSTEES[0], ...v.silentTrustees[0], slot: 0 },
        { ...EMPTY_TRUSTEES[1], ...v.silentTrustees[1], slot: 1 },
      ]);
    }
  }, [v.silentTrustees]);

  const isConfigured =
    list.every(
      (t) =>
        t.name.trim() && t.contact.trim() && t.secretMemory.trim(),
    ) && list[0].contact.trim() !== list[1].contact.trim();

  function updateSlot(
    slot: 0 | 1,
    field: keyof TrustedPerson,
    value: string,
  ) {
    setList((prev) => {
      const next: [TrustedPerson, TrustedPerson] = [{ ...prev[0] }, { ...prev[1] }];
      next[slot] = { ...next[slot], [field]: value };
      return next;
    });
    setMessage("");
  }

  function fillSampleTrustees() {
    setList([
      {
        slot: 0,
        name: "林夏",
        relation: "伴侣",
        contact: "138-0013-8001",
        secretMemory:
          "夏夏，还记得 2016 年我们在鼓浪屿迷路，蹲在路边分吃一碗沙茶面吗？看到这句话，你就知道这是我亲笔留给你的手记了。",
        confirmedPassing: false,
      },
      {
        slot: 1,
        name: "陈默（老陈）",
        relation: "二十年挚友",
        contact: "139-0013-9002",
        secretMemory:
          "老陈，还记得 2018 年我们在成都暴雨里吃着火锅唱《山丘》吗？那晚我们聊起的人生后半场，我都写在这本手记里了。",
        confirmedPassing: false,
      },
    ]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (
      list.some(
        (t) =>
          !t.name.trim() || !t.contact.trim() || !t.secretMemory.trim(),
      )
    ) {
      setError("请写下两位托付之人的称呼、联络方式，以及属于你们的那段往事。");
      return;
    }
    if (list[0].contact.trim() === list[1].contact.trim()) {
      setError("请填写两位不同的人。");
      return;
    }
    setBusy(true);
    try {
      await v.saveSilentTrustees(list);
      setMessage("已妥善封存。在平平安安的日子里，不会向他们发出任何打扰。");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-grid">
      <div className="stack">
        <form className="panel" onSubmit={handleSave}>
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2>选两位你这辈子最信得过的人</h2>
              <p className="small">
                平时他们不会收到任何消息。直到有一天你真正失联，这封带着旧日往事的信才会送到他们面前。
              </p>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={fillSampleTrustees}
            >
              填入范本参考
            </button>
          </div>

          <div className="trustee-grid">
            {([0, 1] as const).map((slot) => {
              const t = list[slot];
              return (
                <div className="trustee-card-box" key={slot}>
                  <p className="eyebrow" style={{ marginBottom: 14 }}>
                    第{slot === 0 ? "一" : "二"}位托付之人
                  </p>
                  <Field
                    label="称呼"
                    value={t.name}
                    onChange={(val) => updateSlot(slot, "name", val)}
                    placeholder={slot === 0 ? "例如：林夏" : "例如：老陈"}
                    required
                  />
                  <Field
                    label="关系"
                    value={t.relation}
                    onChange={(val) => updateSlot(slot, "relation", val)}
                    placeholder={slot === 0 ? "例如：伴侣" : "例如：二十年挚友"}
                  />
                  <Field
                    label="联络方式"
                    value={t.contact}
                    onChange={(val) => updateSlot(slot, "contact", val)}
                    placeholder="常用手机号或邮箱"
                    required
                  />
                  <Field
                    label="只有你们两人知道的一段往事"
                    value={t.secretMemory}
                    onChange={(val) =>
                      updateSlot(slot, "secretMemory", val)
                    }
                    area
                    rows={4}
                    placeholder={
                      slot === 0
                        ? "例如：还记得 2016 年我们在鼓浪屿迷路分吃一碗沙茶面吗？"
                        : "例如：还记得 2018 年我们在成都暴雨里吃火锅吗？"
                    }
                    hint="将来第一次联系他时，这段话会写在信的开头，让他一眼认出是你。"
                    required
                  />
                </div>
              );
            })}
          </div>

          <Message error text={error} />
          <Message text={message} />

          <div
            className="row"
            style={{
              justifyContent: "space-between",
              marginTop: 20,
              flexWrap: "wrap",
            }}
          >
            <span className="small muted">
              保存后静默封存，平时绝不惊动对方。
            </span>
            <button className="button" disabled={busy}>
              <Check size={16} /> {busy ? "正在封存…" : "保存托付之人"}
            </button>
          </div>
        </form>
      </div>

      <aside className="stack">
        <div className="side-note">
          <h3>为什么托付给两个人？</h3>
          <p>
            人生的最后一份嘱托太重，不该让一个人独自承担。
          </p>
          <p style={{ marginTop: 12 }}>
            选一位至亲，再选一位知根知底的挚友——哪怕家人正忙于应付世俗的葬礼，你的朋友也能替你通知远方的故人、把没说出口的话一一带到。
          </p>
        </div>

        <div className="side-note">
          <h3>毫无保留的分量</h3>
          <p>
            当他们两人都确认你已离开，整本手记便向他们彻底敞开。正因这份毫不设防的信任，他们才会郑重地替你走完最后一程。
          </p>
          {isConfigured && (
            <Link
              href="/unlock"
              className="text-button"
              style={{ marginTop: 12 }}
            >
              预览他们收到的信与手记 <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function KeysPage() {
  return (
    <AccountGate>
      <Workspace
        title="托付之人"
        description="平时静默封存，只在真正需要的那一天，替你敲响他们两人的门。"
      >
        <SilentTrusteesPage />
      </Workspace>
    </AccountGate>
  );
}
