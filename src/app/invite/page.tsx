import Link from "next/link";
import { ArrowRight, Feather } from "lucide-react";

export default function Invite() {
  return (
    <div className="wrap workspace">
      <article className="support-letter">
        <p className="eyebrow">一份郑重的嘱托</p>
        <Feather size={32} strokeWidth={1.2} style={{ marginTop: 20 }} />
        <h1>
          有人把这一生最后的体面与牵挂，
          <br />
          托付给了你。
        </h1>
        <p>
          在平平安安的日子里，这本手记始终安静封存。当你收到这封带有旧日往事的来信时，说明我们已经连续多日无法联系上他本人。
        </p>
        <p>
          如果他只是住院或远行，请帮他轻点暂停；如果他确实已经离开，请与另一位受托挚友共同确认，拆开他留下的《人生谢幕手记》。
        </p>
        <div className="row" style={{ marginTop: 28 }}>
          <Link className="button" href="/unlock">
            前往确认并查看手记 <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </div>
  );
}
