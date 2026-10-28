"use client";
import { useId, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useVault } from "./VaultProvider";

export function Message({ error, text }: { error?: boolean; text: string }) {
  return text ? (
    <div
      className={"notice " + (error ? "error" : "success")}
      role={error ? "alert" : "status"}
    >
      {text}
    </div>
  ) : null;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  area = false,
  required = false,
  autoComplete,
  inputMode,
  maxLength,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  area?: boolean;
  required?: boolean;
  autoComplete?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  maxLength?: number;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {area ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows || 4}
          maxLength={40000}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          required={required}
          autoComplete={
            autoComplete || (type === "password" ? "off" : undefined)
          }
          inputMode={inputMode}
          maxLength={maxLength || (type === "password" ? 128 : 300)}
        />
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Subnav() {
  const p = usePathname();
  return (
    <nav className="subnav" aria-label="书房导航">
      {[
        ["书房", "/dashboard"],
        ["手记", "/vault/edit"],
        ["托付之人", "/vault/keys"],
        ["日常守望", "/guardian"],
        ["开启预览", "/unlock"],
      ].map(([n, h]) => (
        <Link key={h} href={h} aria-current={p === h ? "page" : undefined}>
          {n}
        </Link>
      ))}
    </nav>
  );
}

export function Workspace({
  title,
  description,
  children,
  actions,
  eyebrow = "私人书房",
}: {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="wrap workspace">
      <Subnav />
      <header className="page-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function AccountGate({ children }: { children: ReactNode }) {
  const v = useVault();
  if (v.loading)
    return (
      <div className="loading" role="status">
        正在推开书房门…
      </div>
    );
  if (v.error)
    return (
      <div className="wrap workspace">
        <Message error text={v.error} />
        <button className="button" onClick={() => v.refresh()}>
          重新加载
        </button>
      </div>
    );
  if (!v.user)
    return (
      <div className="wrap workspace">
        <div className="auth-layout">
          <div className="auth-story">
            <p className="eyebrow">无人打扰的角落</p>
            <h1>
              推开书房门，
              <br />
              回到你自己的手记。
            </h1>
            <p>凭验证码即可随时查看与修改，平时绝不惊动任何亲友。</p>
          </div>
          <div className="auth-form">
            <h2>进入私人书房</h2>
            <p className="muted small" style={{ marginBottom: 24 }}>
              输入邮箱并使用六位验证码。首次验证将自动为你建立书房。
            </p>
            <Link href="/login" className="button">
              验证并进入 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  return <>{children}</>;
}

export function ContentGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
