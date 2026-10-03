"use client";

// Lapisan data pelayar untuk /hasil, /banding dan /laporan: permintaan tersimpan (sessionStorage),
// pilihan banding, dan panggilan API dengan cache dalam memori supaya navigasi antara halaman
// tidak menilai semula katalog.
import * as React from "react";

import { WIZARD_STORAGE_KEY } from "../wizard/state";
import { ASSESS_REQUEST_KEY, COMPARE_SELECTION_KEY } from "../wizard/storage";
import type {
  ApiErrorBody,
  AssessRequest,
  AssessResponse,
  CompareResponse,
  SavedRequest,
} from "./types";

export const MAX_COMPARE = 3;

// ---------------------------------------------------------------------------
// Storan sesi (boleh disekat: semua akses dalam try/catch)

function readJSON<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* storan penuh atau disekat */
  }
}

const session = () => window.sessionStorage;

export function readSavedRequest(): SavedRequest | null {
  const s = readJSON<SavedRequest>(session, ASSESS_REQUEST_KEY);
  return s && s.request?.requirements && Array.isArray(s.summary) ? s : null;
}

export function writeSavedRequest(s: SavedRequest) {
  writeJSON(session, ASSESS_REQUEST_KEY, s);
}

/** Kunci keperluan (tanpa pilihan paparan) untuk mengikat pilihan banding. */
export const requirementsKey = (r: AssessRequest) => JSON.stringify(r.requirements);

// ---------------------------------------------------------------------------
// Panggilan API

export type ApiResult<T> =
  { ok: true; data: T; receivedAt: string } | { ok: false; message: string; details: string[] };

async function postJSON<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
    if (!res.ok || !json || (typeof json === "object" && "error" in json)) {
      const err = (json as ApiErrorBody | null)?.error;
      return {
        ok: false,
        message:
          err?.message ??
          (res.status >= 500
            ? "Pelayan tidak dapat memproses penilaian sekarang. Cuba lagi sebentar."
            : "Penilaian gagal."),
        details: err?.details?.map((d) => d.message) ?? [],
      };
    }
    return { ok: true, data: json as T, receivedAt: new Date().toISOString() };
  } catch {
    return {
      ok: false,
      message: "Tiada sambungan ke pelayan. Semak sambungan internet anda dan cuba lagi.",
      details: [],
    };
  }
}

const cache = new Map<string, Promise<ApiResult<unknown>>>();

function cachedPost<T>(url: string, body: unknown, force: boolean): Promise<ApiResult<T>> {
  const key = `${url}:${JSON.stringify(body)}`;
  if (force) cache.delete(key);
  let p = cache.get(key) as Promise<ApiResult<T>> | undefined;
  if (!p) {
    p = postJSON<T>(url, body);
    cache.set(key, p);
    // Ralat tidak dicache supaya "Cuba lagi" benar-benar menghantar semula.
    void p.then((r) => {
      if (!r.ok) cache.delete(key);
    });
  }
  return p;
}

export type LoadState<T> =
  | { kind: "loading" }
  | { kind: "no-request" }
  | { kind: "error"; message: string; details: string[] }
  | { kind: "done"; data: T; receivedAt: string };

function useApi<T>(url: string, body: unknown | null, ready: boolean) {
  const [state, setState] = React.useState<LoadState<T>>({ kind: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const bodyKey = body === null ? null : JSON.stringify(body);

  React.useEffect(() => {
    if (!ready) return;
    if (bodyKey === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bergantung pada storan pelayar
      setState({ kind: "no-request" });
      return;
    }
    let live = true;
    setState({ kind: "loading" });
    void cachedPost<T>(url, JSON.parse(bodyKey), attempt > 0).then((r) => {
      if (!live) return;
      setState(
        r.ok
          ? { kind: "done", data: r.data, receivedAt: r.receivedAt }
          : { kind: "error", message: r.message, details: r.details },
      );
    });
    return () => {
      live = false;
    };
  }, [url, bodyKey, attempt, ready]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}

/** Permintaan tersimpan (dibaca selepas mount kerana sessionStorage hanya wujud di pelayar). */
export function useSavedRequest() {
  const [saved, setSaved] = React.useState<SavedRequest | null>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- penyegerakan sekali dengan storan
    setSaved(readSavedRequest());
    setReady(true);
  }, []);

  const setDiversify = React.useCallback((diversifyPjh: boolean) => {
    setSaved((s) => {
      if (!s) return s;
      const next = {
        ...s,
        request: { ...s.request, options: { ...s.request.options, diversifyPjh } },
      };
      writeSavedRequest(next);
      // Selaraskan draf wizard supaya pilihan kekal jika pengguna kembali mengubah keperluan.
      const draft = readJSON<Record<string, unknown>>(
        () => window.localStorage,
        WIZARD_STORAGE_KEY,
      );
      if (draft)
        writeJSON(() => window.localStorage, WIZARD_STORAGE_KEY, { ...draft, diversifyPjh });
      return next;
    });
  }, []);

  return { saved, ready, setDiversify };
}

export function useAssessment() {
  const { saved, ready, setDiversify } = useSavedRequest();
  const api = useApi<AssessResponse>("/api/assess", saved?.request ?? null, ready);
  return { saved, setDiversify, ...api };
}

export function useComparison(saved: SavedRequest | null, ids: string[], ready: boolean) {
  const body =
    saved && ids.length >= 2
      ? { requirements: saved.request.requirements, candidateIds: ids }
      : null;
  return useApi<CompareResponse>("/api/compare", body, ready);
}

// ---------------------------------------------------------------------------
// Pilihan banding (dikongsi antara /hasil, /banding dan /laporan)

interface StoredSelection {
  key: string;
  ids: string[];
}

const listeners = new Set<() => void>();
let snapshotRaw: string | null | undefined;
let snapshot: StoredSelection | null = null;

function readSelection(): StoredSelection | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(COMPARE_SELECTION_KEY);
  } catch {
    raw = null;
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    try {
      snapshot = raw ? (JSON.parse(raw) as StoredSelection) : null;
    } catch {
      snapshot = null;
    }
  }
  return snapshot;
}

function writeSelection(sel: StoredSelection) {
  writeJSON(session, COMPARE_SELECTION_KEY, sel);
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];

export function useCompareSelection(key: string | null) {
  const stored = React.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readSelection,
    () => null,
  );
  const ids = key && stored?.key === key ? stored.ids : EMPTY;
  const set = (next: string[]) => key && writeSelection({ key, ids: next.slice(0, MAX_COMPARE) });
  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(0, MAX_COMPARE)),
    remove: (id: string) => set(ids.filter((x) => x !== id)),
    clear: () => set([]),
  };
}
