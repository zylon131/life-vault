"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  Payload,
  Document,
  emptyPayload,
  newDocument,
  unwrapOwner,
  decrypt,
  encrypt,
  countItems,
} from "@/lib/yst-crypto";
import {
  NotebookData,
  TrustedPerson,
  WatchSettings,
  emptyNotebook,
} from "@/lib/notebook";

export type Trustee = {
  slot: number;
  name: string;
  contact: string;
  accepted: boolean;
  confirmed: boolean;
};

export type Snapshot = {
  doc: Partial<Document> & { count?: number };
  notebook: NotebookData;
  silentTrustees: TrustedPerson[];
  watch: WatchSettings;
  revision: number;
  trustees: Trustee[];
  lastCheckInAt: string;
  interval: number;
  reminderEnabled: boolean;
  phone: string;
  phoneVerified: boolean;
  wechatBound: boolean;
  wechatSubscribed: boolean;
  reminderHour: number;
  wechatAvailable: boolean;
  wechatSimulation: boolean;
  notificationsAvailable: boolean;
};

type User = { id: string; email: string; name: string };

export async function api(url: string, data?: unknown, method = "POST") {
  const r = await fetch(
    url,
    data === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const b = await r.json();
  if (!r.ok) throw new Error(b.error || "请求没有完成，请重试");
  return b;
}

type State = {
  user: User | null;
  snapshot: Snapshot | null;
  loading: boolean;
  error: string;
  notebook: NotebookData;
  silentTrustees: TrustedPerson[];
  watch: WatchSettings;
  payload: Payload | null;
  key: string;
  dirty: boolean;
  refresh: () => Promise<void>;
  login: (b: unknown) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (pass: string) => Promise<void>;
  lock: () => void;
  update: (p: Payload) => void;
  updateNotebook: (n: NotebookData) => void;
  saveNotebook: (n?: NotebookData) => Promise<void>;
  saveSilentTrustees: (t: TrustedPerson[]) => Promise<void>;
  saveWatch: (w: Partial<WatchSettings>) => Promise<void>;
  actAsTrustee: (
    slot: 0 | 1,
    type: "pause" | "confirm_passing" | "reset",
    reason?: string,
  ) => Promise<void>;
  save: (pass?: string) => Promise<void>;
  commit: (
    doc: Document,
    key: string,
    p: Payload,
    extra?: object,
  ) => Promise<void>;
};

const Context = createContext<State>(null!);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notebook, setNotebook] = useState<NotebookData>(emptyNotebook());
  const [silentTrustees, setSilentTrustees] = useState<TrustedPerson[]>([]);
  const [watch, setWatch] = useState<WatchSettings>({
    intervalDays: 14,
    stage: "QUIET_WRITING",
    vacationPaused: false,
  });
  const [payload, setPayload] = useState<Payload | null>(null);
  const [key, setKey] = useState("");
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const busy = useRef(false);

  const lock = useCallback(() => {
    setPayload(null);
    setKey("");
    setDirty(false);
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const r = await fetch("/api/account", { cache: "no-store" });
      if (r.status === 401) {
        setUser(null);
        setSnapshot(null);
        setNotebook(emptyNotebook());
        setSilentTrustees([]);
        lock();
        return;
      }
      if (!r.ok) throw new Error("暂时无法读取账号，请重试");
      setUser(await r.json());
      const s: Snapshot = await api("/api/document");
      setSnapshot(s);
      if (s.notebook) setNotebook(s.notebook);
      if (s.silentTrustees) setSilentTrustees(s.silentTrustees);
      if (s.watch) setWatch(s.watch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "暂时无法读取手记");
    } finally {
      setLoading(false);
    }
  }, [lock]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty]);

  async function login(b: unknown) {
    await api("/api/auth/email", b);
    lock();
    await refresh();
  }

  async function logout() {
    if (
      dirty &&
      !window.confirm("还有未保存的手记修改。退出会丢弃未保存内容，确定退出吗？")
    )
      return;
    await api("/api/account", { action: "logout" });
    lock();
    setUser(null);
    setSnapshot(null);
    router.push("/");
  }

  async function unlock(pass: string) {
    if (snapshot?.doc.format === "yst-1" && snapshot.doc.owner) {
      const k = await unwrapOwner(snapshot.doc.owner, pass);
      const p = await decrypt(snapshot.doc.cipher!, k);
      setKey(k);
      setPayload(p);
    } else setPayload(emptyPayload());
  }

  async function saveNotebook(customNotebook?: NotebookData) {
    if (busy.current) throw new Error("正在保存手记，请稍候");
    busy.current = true;
    try {
      const target = customNotebook || notebook;
      const res = await api("/api/document", {
        mode: "notebook",
        notebook: target,
      });
      setNotebook(res.notebook);
      setWatch(res.watch);
      setDirty(false);
      await refresh();
    } finally {
      busy.current = false;
    }
  }

  async function saveSilentTrustees(nextTrustees: TrustedPerson[]) {
    if (busy.current) throw new Error("正在保存信任人，请稍候");
    busy.current = true;
    try {
      const res = await api("/api/document", {
        mode: "notebook",
        silentTrustees: nextTrustees,
      });
      setSilentTrustees(res.silentTrustees);
      setWatch(res.watch);
      await refresh();
    } finally {
      busy.current = false;
    }
  }

  async function saveWatch(nextWatch: Partial<WatchSettings>) {
    const merged: WatchSettings = { ...watch, ...nextWatch };
    const res = await api("/api/document", {
      mode: "notebook",
      watch: merged,
    });
    setWatch(res.watch);
    await refresh();
  }

  async function actAsTrustee(
    slot: 0 | 1,
    type: "pause" | "confirm_passing" | "reset",
    reason?: string,
  ) {
    const res = await api("/api/document", {
      mode: "notebook",
      trusteeAction: { slot, type, reason },
    });
    setSilentTrustees(res.silentTrustees);
    setWatch(res.watch);
    await refresh();
  }

  async function commit(
    doc: Document,
    k: string,
    p: Payload,
    extra: object = {},
  ) {
    if (!snapshot) throw new Error("请先登录");
    const b = await api("/api/document", {
      doc,
      revision: snapshot.revision,
      ...extra,
    });
    setKey(k);
    setPayload(p);
    setDirty(false);
    setSnapshot({ ...snapshot, doc: b.doc, revision: b.revision });
    await refresh();
  }

  async function save(pass?: string) {
    if (busy.current) throw new Error("正在保存，请稍候");
    if (!payload || countItems(payload) < 1)
      throw new Error("先写下一条内容，再保存");
    busy.current = true;
    try {
      if (snapshot?.doc.format === "yst-1" && key) {
        const doc = {
          ...snapshot.doc,
          cipher: await encrypt(payload, key),
          count: countItems(payload),
        } as Document;
        await commit(doc, key, payload);
      } else {
        const { key: k, doc } = await newDocument(
          payload,
          pass || "default-local-phrase",
        );
        await commit(doc, k, payload);
      }
    } finally {
      busy.current = false;
    }
  }

  return (
    <Context.Provider
      value={{
        user,
        snapshot,
        loading,
        error,
        notebook,
        silentTrustees,
        watch,
        payload,
        key,
        dirty,
        refresh,
        login,
        logout,
        unlock,
        lock,
        update: (p) => {
          setPayload(p);
          setDirty(true);
        },
        updateNotebook: (n) => {
          setNotebook(n);
          setDirty(true);
        },
        saveNotebook,
        saveSilentTrustees,
        saveWatch,
        actAsTrustee,
        save,
        commit,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useVault = () => useContext(Context);
