"use client";
import { publicDb } from "@/lib/supabase/public";
import type { EpisodeInput } from "@/lib/schemas";
import type { AdminRow, EpisodeRow, Kind } from "@/lib/types";

/**
 * Everything the admin panel can do, behind one interface:
 * - "supabase": the browser calls the `admin_*` database functions with a session token
 *   (works on GitHub Pages: no server of our own needed);
 * - "demo": our /api/admin routes over the in-memory store (local dev without Supabase).
 */
export type Me = { email: string; owner: boolean };
export type TeamMember = {
  email: string;
  is_owner: boolean;
  active: boolean;
  invite_pending: boolean;
  invite_expires_at: string | null;
  added_by: string | null;
  created_at: string;
};
export type Invite = { email: string; code: string; expires_at: string };

export interface Backend {
  mode: "supabase" | "demo";
  rows(kind: Kind): Promise<AdminRow[]>;
  patch(kind: Kind, id: string, changes: Record<string, unknown>): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  episodes(): Promise<EpisodeRow[]>;
  saveEpisode(input: EpisodeInput, id?: string): Promise<void>;
  deleteEpisode(id: string): Promise<void>;
  logout(): Promise<void>;
  /** Team management exists only with Supabase. */
  team?: {
    list(): Promise<TeamMember[]>;
    invite(email: string): Promise<Invite>;
    remove(email: string): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
  };
}

// ------------------------------------------------------------------ messages
const ERRORS: Record<string, string> = {
  invalid: "Неверный email или пароль.",
  invalid_code: "Код не подходит. Проверь email и код или попроси новый.",
  locked: "Слишком много попыток. Подожди 15 минут.",
  needs_invite: "Для этого email ещё не задан пароль. Попроси у владельца ссылку-приглашение.",
  weak: "Пароль должен быть не короче 8 символов.",
  expired: "Код истёк. Попроси у владельца новый.",
  email: "Проверь email: похоже, в нём опечатка.",
  self: "Это твой собственный аккаунт.",
  owner: "Владельца удалить нельзя.",
  owner_only: "Это может сделать только владелец.",
  rate_limited: "Слишком часто. Подожди немного.",
};
const message = (code: string) => ERRORS[code] ?? `Ошибка: ${code}`;

// ------------------------------------------------------------------ supabase (RPC)
const TOKEN_KEY = "skv:admin-token";

export const savedToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const saveToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

type Session = { token: string; email: string; is_owner: boolean };

async function signInCall(fn: "admin_login" | "admin_claim", args: Record<string, string>, invalid: string): Promise<Me> {
  const { data, error } = await publicDb().rpc(fn, args);
  if (error) throw new Error("Нет связи с базой. Проверь интернет и попробуй ещё раз.");
  if (data?.error) throw new Error(message(data.error === "invalid" ? invalid : data.error));
  const s = data as Session;
  saveToken(s.token);
  return { email: s.email, owner: s.is_owner };
}

export const rpcLogin = (email: string, password: string) =>
  signInCall("admin_login", { p_email: email, p_password: password }, "invalid");

export const rpcClaim = (email: string, code: string, password: string) =>
  signInCall("admin_claim", { p_email: email, p_code: code, p_password: password }, "invalid_code");

/** Restore the saved session. Null when there is none or it expired. */
export async function rpcMe(): Promise<Me | null> {
  const token = savedToken();
  if (!token) return null;
  const { data, error } = await publicDb().rpc("admin_me", { p_token: token });
  if (error) {
    if (/unauthorized/.test(error.message)) saveToken(null);
    else throw new Error("Нет связи с базой. Проверь интернет и обнови страницу.");
    return null;
  }
  return { email: data.email, owner: data.is_owner };
}

export function rpcBackend(onAuthLost: () => void): Backend {
  const db = publicDb();
  async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await db.rpc(fn, { p_token: savedToken(), ...args });
    if (error) {
      if (/unauthorized/.test(error.message)) {
        saveToken(null);
        onAuthLost();
        throw new Error("Сессия закончилась. Войди заново.");
      }
      if (/owner_only/.test(error.message)) throw new Error(message("owner_only"));
      throw new Error(error.message);
    }
    if (data && typeof data === "object" && !Array.isArray(data) && "error" in data) throw new Error(message(String(data.error)));
    return data as T;
  }
  const photoUrl = (path: string | null) => (path ? db.storage.from("news-photos").getPublicUrl(path).data.publicUrl : null);

  return {
    mode: "supabase",
    async rows(kind) {
      const rows = await call<Record<string, unknown>[]>("admin_rows", { p_kind: kind });
      return rows.map((r) => (kind === "news" ? { kind, ...r, photo_url: photoUrl(r.photo_path as string | null) } : { kind, ...r }) as AdminRow);
    },
    patch: (kind, id, changes) => call("admin_patch", { p_kind: kind, p_id: id, p_changes: changes }),
    remove: (kind, id) => call("admin_delete_row", { p_kind: kind, p_id: id }),
    episodes: () => call<EpisodeRow[]>("admin_episodes"),
    saveEpisode: async (input, id) => {
      await call("admin_save_episode", { p_id: id ?? null, p_data: input });
    },
    deleteEpisode: (id) => call("admin_delete_episode", { p_id: id }),
    async logout() {
      await call("admin_logout").catch(() => {});
      saveToken(null);
    },
    team: {
      list: () => call<TeamMember[]>("admin_team"),
      invite: (email) => call<Invite>("admin_invite", { p_email: email }),
      remove: async (email) => {
        await call("admin_remove", { p_email: email });
      },
      changePassword: async (oldPassword, newPassword) => {
        await call("admin_change_password", { p_old: oldPassword, p_new: newPassword });
      },
    },
  };
}

// ------------------------------------------------------------------ demo (server routes)
export function demoBackend(onAuthLost: () => void): Backend {
  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
    if (res.status === 401) {
      onAuthLost();
      throw new Error("Сессия закончилась. Войди заново.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error ?? "Ошибка сервера");
    return data as T;
  }
  return {
    mode: "demo",
    rows: async (kind) => (await api<{ rows: AdminRow[] }>(`/api/admin/rows?kind=${kind}`)).rows,
    patch: async (kind, id, changes) => {
      await api("/api/admin/rows", { method: "PATCH", body: JSON.stringify({ kind, id, ...changes }) });
    },
    remove: async (kind, id) => {
      await api(`/api/admin/rows?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    episodes: async () => (await api<{ rows: EpisodeRow[] }>("/api/admin/episodes")).rows,
    saveEpisode: async (input, id) => {
      await api("/api/admin/episodes", { method: "POST", body: JSON.stringify({ ...input, id }) });
    },
    deleteEpisode: async (id) => {
      await api(`/api/admin/episodes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    async logout() {
      await fetch("/api/admin/logout", { method: "POST" });
    },
  };
}

export async function demoLogin(password: string) {
  const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
  if (res.ok) return;
  throw new Error(res.status === 429 ? message("locked") : "Неверный пароль.");
}

export async function demoMe(): Promise<{ me: Me | null; available: boolean }> {
  const res = await fetch("/api/admin/me", { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { admin?: { email: string } | null; available?: boolean };
  return { me: data.admin ? { email: data.admin.email, owner: true } : null, available: !!data.available };
}
