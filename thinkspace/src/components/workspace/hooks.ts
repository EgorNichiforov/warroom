"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/contracts/api";
import type { ThinkingController } from "@/lib/speech/controller";
import { makeVisible, useSessionStore } from "@/store/session-store";

// ---------- Theme ----------
export type Theme = "dark" | "light";
const THEME_KEY = "thinkspace.theme";

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setThemeState(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, []);
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
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setValue(localStorage.getItem(key) === "1");
    } catch {
      setValue(false);
    }
  }, [key]);
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set];
}

// ---------- Formatting ----------
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const langTag = (l: string) => (l === "mixed" ? "MIXED" : l === "unknown" ? "—" : l.toUpperCase());
