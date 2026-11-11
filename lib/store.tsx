"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppData, Course, Settings, Task } from "./types";
import { defaultSession } from "./date";

const STORAGE_KEY = "classapp:data:v1";

function initialData(): AppData {
  const s = defaultSession();
  return {
    version: 1,
    courses: [],
    tasks: [],
    settings: {
      sessionStart: s.start,
      sessionEnd: s.end,
      notificationsEnabled: false,
      courseLeadMinutes: 10,
      taskLeadHours: 24,
    },
  };
}

/** Valide grossierement des donnees importees / lues pour eviter de planter l'app */
export function sanitize(raw: unknown): AppData {
  const base = initialData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    courses: Array.isArray(r.courses)
      ? r.courses.map((c) => ({ ...c, code: c.code ?? "", slots: Array.isArray(c.slots) ? c.slots : [] }))
      : [],
    tasks: Array.isArray(r.tasks) ? r.tasks.map((t) => ({ ...t, notes: t.notes ?? "" })) : [],
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

interface Store {
  ready: boolean;
  data: AppData;
  saveCourse: (c: Course) => void;
  deleteCourse: (id: string) => void;
  saveTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (d: AppData) => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  // Lecture initiale (cote client seulement)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(sanitize(JSON.parse(raw)));
    } catch {
      /* donnees illisibles : on repart a neuf */
    }
    loaded.current = true;
    setReady(true);
  }, []);

  // Sauvegarde a chaque changement
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* stockage plein ou bloque */
    }
  }, [data]);

  // Synchronisation entre onglets / fenetres
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setData(sanitize(JSON.parse(e.newValue)));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveCourse = useCallback((c: Course) => setData((d) => ({ ...d, courses: upsert(d.courses, c) })), []);
  const deleteCourse = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        courses: d.courses.filter((c) => c.id !== id),
        tasks: d.tasks.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)),
      })),
    [],
  );
  const saveTask = useCallback((t: Task) => setData((d) => ({ ...d, tasks: upsert(d.tasks, t) })), []);
  const deleteTask = useCallback((id: string) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })), []);
  const toggleTask = useCallback(
    (id: string) => setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
    [],
  );
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [],
  );
  const replaceAll = useCallback((d: AppData) => setData(sanitize(d)), []);
  const resetAll = useCallback(() => setData(initialData()), []);

  const value = useMemo(
    () => ({ ready, data, saveCourse, deleteCourse, saveTask, deleteTask, toggleTask, updateSettings, replaceAll, resetAll }),
    [ready, data, saveCourse, deleteCourse, saveTask, deleteTask, toggleTask, updateSettings, replaceAll, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore doit etre utilise dans <StoreProvider>");
  return s;
}
