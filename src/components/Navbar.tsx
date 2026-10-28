"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useVault } from "./VaultProvider";

export default function Navbar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const v = useVault();

  const links = v.user
    ? [
        ["书房", "/dashboard"],
        ["手记", "/vault/edit"],
        ["托付之人", "/vault/keys"],
        ["日常守望", "/guardian"],
        ["开启预览", "/unlock"],
      ]
    : [
        ["手记篇章", "/#what-to-leave"],
        ["托付方式", "/#trust-model"],
        ["开启预览", "/unlock"],
        ["缘起", "/pricing"],
      ];

  return (
    <header className="nav-header">
      <a href="#main-content" className="sr-only">
        跳到内容
      </a>
      <div className="wrap nav-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">有所托</span>
        </Link>
        <nav className="nav-links" aria-label="主导航">
          {links.map(([name, url]) => (
            <Link
              href={url}
              key={url}
              aria-current={path === url ? "page" : undefined}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="nav-end">
          {v.user ? (
            <>
              <Link className="small muted" href="/dashboard">
                {v.user.name}
              </Link>
              <button className="text-button" onClick={() => v.logout()}>
                离开
              </button>
            </>
          ) : (
            <Link href="/login" className="button light small-button">
              进入书房
            </Link>
          )}
          <button
            className="menu-button"
            aria-label={open ? "关闭菜单" : "打开菜单"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav" aria-label="移动导航">
          {links.map(([name, url]) => (
            <Link key={url} href={url} onClick={() => setOpen(false)}>
              {name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
