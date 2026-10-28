import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { VaultProvider } from "@/components/VaultProvider";

export const metadata: Metadata = {
  title: {
    default: "有所托 · 有些事现在说太早，但完全不说又怕来不及",
    template: "%s · 有所托",
  },
  description:
    "写给人生中场的私密手记。活着时安静保密，不惊动任何亲友；离开后，经由两位挚友确认，替你体面开口。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <VaultProvider>
          <Navbar />
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <div className="wrap">
              <div className="footer-top">
                <Link href="/" className="brand">
                  <span className="brand-mark" aria-hidden="true" />
                  <span className="brand-name">有所托</span>
                </Link>
                <span className="small muted">
                  平时不惊动任何人 · 到那天替你体面开口
                </span>
                <div className="footer-links">
                  <Link href="/pricing">缘起</Link>
                  <Link href="/unlock">开启预览</Link>
                  <Link href="/privacy">边界说明</Link>
                </div>
              </div>
              <div className="footer-bottom">
                <span>© {new Date().getFullYear()} 有所托</span>
                <span>把最坏的可能安顿好，然后轻装去生活</span>
              </div>
            </div>
          </footer>
        </VaultProvider>
      </body>
    </html>
  );
}
