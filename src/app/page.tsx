import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowDown } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="reveal">
              <p className="eyebrow">写给人生中场的私密手记</p>
              <h1>
                有些事现在说太早，
                <br />
                但完全不说，
                <br />
                又怕哪天<span>来不及。</span>
              </h1>
              <p className="hero-copy">
                不想后事落入俗套，不想对老友不告而别，
                <br />
                也有些平时嫌矫情、始终没说出口的话。
                <br />
                活着时，这里替你安静封存，不惊动任何人；
                <br />
                离开后，经由两位挚友共同印证，替你体面开口。
              </p>
              <div className="hero-actions">
                <Link href="/vault/edit" className="button">
                  开始写手记 <ArrowRight size={16} />
                </Link>
                <a href="#what-to-leave" className="text-button">
                  读一读手记篇章 <ArrowDown size={15} />
                </a>
              </div>
            </div>

            <div
              className="letter-scene reveal"
              style={{ animationDelay: ".15s" }}
            >
              <div className="letter-under" />
              <div className="letter-paper">
                <div className="letter-top">
                  <span>人生谢幕手记 · 摘录</span>
                  <span className="postmark">
                    有所托
                    <br />
                    私密封存
                  </span>
                </div>
                <div className="letter-body">
                  <p>别拿我呆板的证件照当遗照，用那张在川西大笑的侧脸就好。</p>
                  <p>
                    不要哭丧和吹拉弹唱，放李宗盛的《山丘》。哪怕你们看到时葬礼已经办过，也请挑个晴朗的周末，叫上几个真朋友替我喝一杯。
                  </p>
                  <p>
                    请告诉大学室友老陈：我先走一步了，当年天台喝过的啤酒，我一直记得。
                  </p>
                </div>
                <div className="letter-sign">—— 写于四十岁的一个夜晚</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIX CHAPTERS */}
      <section className="section" id="what-to-leave">
        <div className="wrap">
          <p className="eyebrow">序章与六大篇章</p>
          <h2 className="section-title">把真正在乎的事，留在安静的纸页上。</h2>
          <p className="section-intro">
            好端端的日子里，这些话跟父母、伴侣或朋友提都不合适。写在这里，想到哪一页就写哪一页，随时可以回来改。
          </p>

          <div className="chapter-grid">
            {[
              [
                "第一篇 · 模样",
                "我想被记住的样子",
                "拒绝呆板的证件照与公文式的悼词。留下你最舒展的一张照片，写下你眼中的自己，以及最爱的一首歌、一部电影、一杯酒。",
                "“以后想我的时候，听听这首歌、喝一杯酒，就算见一面了。”",
                "/vault/edit?chapter=portrait",
              ],
              [
                "第二篇 · 告别",
                "我想要的告别与尊严",
                "若到弥留之际，是否拒绝无谓的创伤插管？向往怎样的告别氛围，拒绝哪些世俗套路？哪怕错过传统葬礼，也请知己再小聚一次。",
                "“不要黑纱与哀乐。挑个天气好的周末，叫上几个真朋友聊聊我的趣事。”",
                "/vault/edit?chapter=farewell",
              ],
              [
                "第三篇 · 知会",
                "请替我通知的人",
                "那些散落在人生不同阶段、家人根本不认识的老友与知己。记下他们的名字与联络方式，别让我在他们的世界里不告而别。",
                "“请替我给老陈打个电话，告诉他这一生认识他我很开心。”",
                "/vault/edit?chapter=people",
              ],
              [
                "第四篇 · 家书",
                "请替我转达的话",
                "留给这个世界的一句谢幕词、想在微信朋友圈发出的最后一条动态，以及写给父母、伴侣、孩子与挚友的信。",
                "“人间晃荡数十载，见过春风，淋过暴雨，也爱过对的人。我先散场啦。”",
                "/vault/edit?chapter=letters",
              ],
              [
                "第五篇 · 旧物与私密",
                "旧物托付、宠物与私密抹去",
                "心爱的吉他、批注的书、猫狗交给哪个懂它的人？书房哪个抽屉的旧日记或私人文件夹，请挚友先一步替我销毁，守住最后的体面。",
                "“书桌右下角抽屉里的旧信件，请你们俩先帮我静静销毁，不必拆看。”",
                "/vault/edit?chapter=belongings",
              ],
              [
                "第六篇 · 线索",
                "未尽之事与家底线索",
                "不留交易密码，只留清晰的收尾线索：哪份人情或债务不能带着亏欠走？哪家公司的电子保单、账户与重要证件放在哪里？",
                "“两份寿险电子保单在常用邮箱星标夹里，别让家人在悲痛中跑断腿。”",
                "/vault/edit?chapter=clues",
              ],
            ].map(([folio, title, desc, quote, url]) => (
              <article className="chapter" key={folio}>
                <div>
                  <span className="chapter-folio">{folio}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <div>
                  <div className="chapter-example">{quote}</div>
                  <Link href={url}>
                    翻到这一页 <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SILENT TRUST & DUAL CONFIRMATION */}
      <section className="section trust-section" id="trust-model">
        <div className="wrap">
          <p className="eyebrow">平时不惊动，到那天不落空</p>
          <h2 className="section-title">为什么托付给两个人？</h2>
          <p className="section-intro">
            人生的最后一份嘱托太重，不该让一个人独自承担。选一位至亲、再选一位知根知底的挚友——当那一天真的到来，由他们两人共同印证你的离开，彼此商量着，替你把没做完的事做完。
          </p>

          <div className="steps-editorial">
            <div className="step-item">
              <span className="step-num">01</span>
              <h3>生前不惊动，只留一句往事</h3>
              <p>
                在平平安安的日子里，这里永远安静，他们不会知道这本手记的存在。你只需为每人写下一句只有你们俩才懂的往事——等到真正需要联系他们的那一天，看到这句话，他们便知道这是你亲笔留下的心意。
              </p>
            </div>

            <div className="step-item">
              <span className="step-num">02</span>
              <h3>半月一问候，失联先找你本人</h3>
              <p>
                平时每十四天向你轻轻问一声安好。即便哪天你忘了回应，也不会贸然惊动亲友，而是先在数日内通过微信、短信与邮件向你本人反复确认。只要你点一下，一切如常。
              </p>
            </div>

            <div className="step-item">
              <span className="step-num">03</span>
              <h3>两人共印证，毫无保留地托付</h3>
              <p>
                唯有当你本人彻底失去回音，这封信才会送到他们两人面前。若你只是住院或远行，任一人轻点“暂时不便”即可按住；当两人都确认你已离开，整本手记便向他们彻底敞开——因为毫无保留的信任，才托得起这一程郑重的送别。
              </p>
            </div>
          </div>

          <div className="trust-preview-bar">
            <span>想看看那一天到来时，两位挚友会收到怎样的信、读到怎样的手记？</span>
            <Link href="/unlock" className="text-button">
              预览托付开启的那一刻 <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* LIFE STORY */}
      <section className="life-story" aria-labelledby="life-story-title">
        <div className="wrap life-story-grid">
          <div className="life-story-copy">
            <p className="eyebrow">心里有底的从容</p>
            <h2 id="life-story-title">
              写完合上手记，
              <br />
              去晒太阳、喝酒、见朋友。
            </h2>
            <p>
              把最坏的可能安顿好，不是因为悲观，而是为了给余下的岁月松绑。当那些放不下的人和话都有了妥帖的去处，今天仍是很好的一天。
            </p>
          </div>
          <figure className="life-story-image">
            <Image
              src="/images/homepage-life-still-v1.png"
              alt="阳光照进窗边的桌面，信纸、杯子和绿植安静地摆放着"
              width={1536}
              height={1024}
              sizes="(max-width: 800px) calc(100vw - 40px), 62vw"
            />
            <figcaption>牵挂有处安放，今天好好生活。</figcaption>
          </figure>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap faq">
          <p className="eyebrow">心里可能会有的顾虑</p>
          <h2 className="section-title">动笔之前，先让你安心。</h2>
          {[
            [
              "我现在写下那两位托付之人，他们会收到消息吗？",
              "不会。在你平平安安生活的每一天，我们绝不会向他们发出任何声音。这份未雨绸缪只留在你的书房里，不会给身边人添半分心理负担。",
            ],
            [
              "既然平时从未提起，将来联系他们时，他们怎么确信真是我留下的？",
              "你在记下他们名字时，会为每个人写一段只有你们两人知道的往事或旧日默契。将来那封信送到他们面前时，第一眼看到的就是这段话——那是只有你才写得出来的语气与记忆。",
            ],
            [
              "万一我只是生病住院、或者远行没看手机，会被误拆开吗？",
              "不会。超过问候期后，我们会先用好几天的时间，通过不同渠道找你本人；即便最后联系到那两位挚友，信里也留着「他只是暂时不便，先缓缓」的选项，任何一人按住，手记便继续安静封存。",
            ],
            [
              "如果他们读到手记时，传统的葬礼已经办过了怎么办？",
              "世俗的仪式或许仓促，但真正在乎你的人还在。哪怕传统的告别已经结束，他们依然能按你的心愿，在某个晴朗的周末约上三五知己替你喝一杯；更重要的是，他们能替你通知远方的故人，把你留下的信一封封送到。",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CLOSING */}
      <section className="closing">
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          在无人打扰的角落
        </p>
        <h2>把那场不想俗套的谢幕，提前写好。</h2>
        <p>不必一次写完。今天只写下一首歌、一个名字，也很好。</p>
        <Link href="/vault/edit" className="button">
          翻开我的手记 <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
