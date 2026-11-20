"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/contracts/api";
import type { ThinkingController } from "@/lib/speech/controller";
import { makeVisible, useSessionStore } from "@/store/session-store";

// ---------- Local storage backed values (hydration-safe via useSyncExternalStore) ----------
type LocalStore<T> = { get: () => T; set: (v: T) => void; subscribe: (fn: () => void) => () => void; server: T };
const localStores = new Map<string, LocalStore<unknown>>();

export function createLocalStore<T>(key: string, fallback: T, parse: (raw: string) => T | undefined, serialize: (v: T) => string): LocalStore<T> {
  const existing = localStores.get(key);
  if (existing) return existing as LocalStore<T>;
  const listeners = new Set<() => void>();
  let cached: T | undefined;
  const store: LocalStore<T> = {
    server: fallback,
    get: () => {
      if (cached !== undefined) return cached;
      try {
        const raw = localStorage.getItem(key);
        cached = raw === null ? fallback : (parse(raw) ?? fallback);
      } catch {
        cached = fallback;
      }
      return cached;
    },
    set: (v) => {
      cached = v;
      try {
        localStorage.setItem(key, serialize(v));
      } catch {
        /* ignore */
      }
      for (const l of listeners) l();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
  localStores.set(key, store as LocalStore<unknown>);
  return store;
}

export function useLocalValue<T>(store: LocalStore<T>): [T, (v: T) => void] {
  const value = useSyncExternalStore(store.subscribe, store.get, () => store.server);
  return [value, store.set];
}

// ---------- Theme ----------
export type Theme = "dark" | "light";
const themeStore = createLocalStore<Theme>(
  "thinkspace.theme",
  "dark",
  (raw) => (raw === "light" || raw === "dark" ? raw : undefined),
  (v) => v,
);

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useLocalValue(themeStore);
  const setTheme = useCallback(
    (t: Theme) => {
      set(t);
      if (t === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    },
    [set],
  );
  return [theme, setTheme];
}

// ---------- Health ----------
let healthCache: HealthResponse | null = null;
export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(healthCache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    api
      .health(ac.signal)
      .then((h) => {
        healthCache = h;
        setHealth(h);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "health unavailable");
      });
    return () => ac.abort();
  }, []);
  return { health, error };
}

// ---------- Controller context ----------
export const ControllerContext = createContext<ThinkingController | null>(null);
export function useController() {
  const c = useContext(ControllerContext);
  if (!c) throw new Error("useController outside workspace");
  return c;
}

// ---------- Time cursor filter ----------
export function useVisible() {
  const atMsById = useSessionStore((s) => s.atMsById);
  const cursor = useSessionStore((s) => s.timeCursor);
  return useMemo(() => makeVisible(atMsById, cursor), [atMsById, cursor]);
}

// ---------- Media query ----------
export function useMediaQuery(query: string, initial = false) {
  const [match, setMatch] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

// ---------- Local storage flag ----------
export function useLocalFlag(key: string): [boolean | null, (v: boolean) => void] {
  const store = createLocalStore<boolean | null>(key, false, (raw) => raw === "1", (v) => (v ? "1" : "0"));
  // server snapshot is null (unknown) so the UI does not flash before hydration
  const value = useSyncExternalStore(store.subscribe, store.get, () => null);
  return [value, store.set];
}

// ---------- Formatting ----------
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const langTag = (l: string) => (l === "mixed" ? "MIXED" : l === "unknown" ? "—" : l.toUpperCase());
