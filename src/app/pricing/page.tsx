import Link from "next/link";
import { ArrowRight, Feather } from "lucide-react";

export const metadata = { title: "为什么做有所托" };

export default function About() {
  return (
    <div className="wrap workspace">
      <article className="support-letter">
        <p className="eyebrow">一封来自四十岁同龄人的信</p>
        <h1>
          我今年四十岁，
          <br />
          我不想我的后事变得俗套，
          <br />
          但现在跟谁说都不合适。
        </h1>
        <p>
          做「有所托」的念头，源于我自己进入四十岁之后的真实感受。
        </p>
        <p>
          到了这个年纪，我们对自己是谁、喜欢什么，早有了笃定的审美。我看过一些葬礼的喧闹与程式化，甚至被并不真正懂逝者的人按世俗套路摆布。我心里很清楚：如果哪天我走了，我想要什么样的告别氛围、放哪几首歌、用哪张照片，哪些俗套的事千万别对我做。
        </p>
        <p>
          我也常常想起散落在人生不同阶段的朋友与知己。我的家人根本不认识他们，如果不留下一份名单，万一哪天我突然离开，在他们的世界里我只是莫名其妙地消失了；还有那些平时嫌矫情说不出口的话、书房抽屉里只想带进风里的秘密、家里人未必清楚的保单与人情线索……
        </p>
        <h2 className="serif" style={{ fontSize: 26, marginTop: 28 }}>
          为什么不在平时直接告诉家人和朋友？
        </h2>
        <p>
          因为我才四十岁，正值人生的中场。在好端端的日子里，跑去跟父母、伴侣或者好朋友交代这些，只会吓到他们，让人多想，甚至变成身边人的心理负担。
        </p>
        <p>
          所以我需要这样一个角落——<strong>在我平平安安生活的每一天，它替我安静封存，不惊动任何亲友。</strong>
          它只是每半个月温和地问我一声“今日安好”。唯有当有一天我真正失去了回音，多次向我本人确认都石沉大海之后，它才会带着我写下的那段旧日往事，去敲响我最信任的那两个人的门。
        </p>
        <p>
          之所以托付给两个人，是因为人生的最后一份嘱托太重，不该让一个人独自承担。当他们两人都确认我已经离开，这本手记便向他们毫无保留地敞开——哪怕那时传统的告别已经办完，他们依然懂我真正的心意，替我约几个老友喝上一杯，替我通知远方的故人，替我把最后的话一一带到。
        </p>
        <p className="signature">
          有所托 · 创作者手记
          <br />
          <span className="small muted">
            把最坏的可能安顿好，然后轻装去生活。
          </span>
        </p>
        <div className="row" style={{ gap: 16, marginTop: 26, flexWrap: "wrap" }}>
          <Link className="button" href="/vault/edit">
            <Feather size={16} /> 开始写手记
          </Link>
          <Link className="button light" href="/unlock">
            预览托付开启的那一刻 <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </div>
  );
}
