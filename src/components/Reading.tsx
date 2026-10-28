"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { Payload } from "@/lib/yst-crypto";
export default function Reading({ payload: p }: { payload: Payload }) {
  const [msg, setMsg] = useState("");
  async function copy(s: string) {
    try {
      await navigator.clipboard.writeText(s);
      setMsg("已复制，请按对方的意愿妥善转达。");
    } catch {
      setMsg("复制未完成，请手动选择文字复制。");
    }
  }
  return (
    <div className="reading">
      <p className="inline-message" role="status">
        {msg}
      </p>
      {p.people.length > 0 && (
        <section>
          <h2 className="section-title">请帮我通知这些人</h2>
          {p.people.map((x) => (
            <article className="reading-letter" key={x.id}>
              <h3>{x.name}</h3>
              <p className="meta">
                {x.relation} · {x.contact}
              </p>
              {x.circle && (
                <p className="reading-instruction">
                  请联系并通知：{x.circle}
                </p>
              )}
              <p>{x.message || "请按情况联系，告知近况。"}</p>
              <button
                className="text-button"
                onClick={() => copy(x.contact + "\n" + x.message)}
              >
                <Copy size={15} /> 复制联系方式与留言
              </button>
            </article>
          ))}
        </section>
      )}
      {p.letters.length > 0 && (
        <section>
          <h2 className="section-title">请替我带到的话</h2>
          {p.letters.map((x) => (
            <article className="reading-letter" key={x.id}>
              <h3>致 {x.name}</h3>
              {x.contact && <p className="meta">收信人线索：{x.contact}</p>}
              <p>{x.content}</p>
              {x.relayName && (
                <p className="reading-instruction">
                  请由 {x.relayName} 转达
                  {x.relayContact ? ` · ${x.relayContact}` : ""}
                </p>
              )}
              <button className="text-button" onClick={() => copy(x.content)}>
                <Copy size={15} /> 复制这段话
              </button>
            </article>
          ))}
        </section>
      )}
      {p.arrangements.length > 0 && (
        <section>
          <h2 className="section-title">请帮我安排这些事</h2>
          {p.arrangements.map((x) => (
            <article className="reading-letter" key={x.id}>
              <h3>{x.title || "一件放心不下的事"}</h3>
              <p>{x.content}</p>
              {x.handlerName && (
                <p className="reading-instruction">
                  希望交给 {x.handlerName} 处理
                  {x.handlerContact ? ` · ${x.handlerContact}` : ""}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
