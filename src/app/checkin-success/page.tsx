import Link from "next/link";
import { Check, Sun } from "lucide-react";

const errors: Record<string, { title: string; copy: string }> = {
  invalid: { title: "这条链接不完整", copy: "请回到有所托服务号，打开最新的一条报平安消息。" },
  expired: { title: "这条提醒已经用过或过期", copy: "每条消息只能确认一次，请打开今天最新的提醒。" },
  "wrong-wechat": { title: "不是绑定的微信号", copy: "请使用与有所托账号绑定的微信打开这条消息。" },
  unavailable: { title: "暂时没有记下来", copy: "微信服务暂时不可用，请稍后再打开这条消息。" },
};

export default function CheckInResult({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const error = searchParams.status && searchParams.status !== "ok"
    ? errors[searchParams.status] || errors.invalid
    : null;
  return (
    <main className="wrap workspace checkin-result">
      <div className="checkin-result-mark" aria-hidden="true">
        {error ? <Sun size={34} strokeWidth={1.2} /> : <Check size={36} strokeWidth={1.4} />}
      </div>
      <p className="eyebrow">有所托 · 微信报平安</p>
      <h1>{error ? error.title : "今天的平安，已经收到了。"}</h1>
      <p>{error ? error.copy : "不用登录网站，也不用再做什么。愿今天也有一件小小的好事。"}</p>
      <Link className="text-button" href="/">
        {error ? "返回有所托" : "可以安心关掉这一页"}
      </Link>
    </main>
  );
}
