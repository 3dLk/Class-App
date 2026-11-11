"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { useReminders } from "@/lib/notifications";
import ScheduleTab from "./ScheduleTab";
import TasksTab from "./TasksTab";
import SettingsTab from "./SettingsTab";
import { cx } from "./ui";

type TabId = "horaire" | "taches" | "reglages";

const TABS: { id: TabId; label: string; title: string; icon: LucideIcon }[] = [
  { id: "horaire", label: "Horaire", title: "Horaire", icon: CalendarDays },
  { id: "taches", label: "Devoirs", title: "Devoirs et examens", icon: ClipboardList },
  { id: "reglages", label: "Réglages", title: "Réglages", icon: SlidersHorizontal },
];

const TAB_KEY = "classapp:tab";

export default function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { ready, data } = useStore();
  const [tab, setTab] = useState<TabId>("horaire");
  useReminders(data, ready);

  useEffect(() => {
    const saved = localStorage.getItem(TAB_KEY) as TabId | null;
    if (saved && TABS.some((t) => t.id === saved)) setTab(saved);
  }, []);

  const select = (id: TabId) => {
    setTab(id);
    localStorage.setItem(TAB_KEY, id);
    window.scrollTo({ top: 0 });
  };

  const current = TABS.find((t) => t.id === tab)!;
  const pending = data.tasks.filter((t) => !t.done).length;
  const today = new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date())
    .replace(/\./g, "");

  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-end justify-between gap-3 px-4 pb-2.5">
          <h1 className="truncate text-[22px] font-bold leading-none tracking-tight">{current.title}</h1>
          <span suppressHydrationWarning className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {today}
          </span>
        </div>
      </header>

      <main className="pb-tabbar mx-auto max-w-xl px-4 pt-5">
        {!ready ? (
          <div className="space-y-px" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse bg-surface" />
            ))}
          </div>
        ) : tab === "horaire" ? (
          <ScheduleTab />
        ) : tab === "taches" ? (
          <TasksTab />
        ) : (
          <SettingsTab />
        )}
      </main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-bg" aria-label="Navigation principale">
        <div className="mx-auto grid max-w-xl grid-cols-3" style={{ height: "var(--tabbar-h)" }}>
          {TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex flex-col items-center justify-center gap-1 border-r border-line last:border-r-0 transition-colors",
                  active ? "text-fg" : "text-dim active:text-muted",
                )}
              >
                {active && <span className="absolute inset-x-0 top-0 h-0.5 bg-fg" />}
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{t.label}</span>
                {t.id === "taches" && pending > 0 && (
                  <span className="tabular absolute right-[calc(50%-26px)] top-2 min-w-5 border border-bg bg-fg px-1 text-center font-mono text-[10px] font-bold leading-4 text-bg">
                    {pending > 99 ? "99" : pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
