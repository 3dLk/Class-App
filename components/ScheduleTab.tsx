"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, MapPin, Plus, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { isoWeekday, toMinutes } from "@/lib/date";
import { WEEKDAYS, type Course, type Slot, type Weekday } from "@/lib/types";
import CourseForm, { emptyCourse } from "./CourseForm";
import { Button, cx, Empty, SectionTitle } from "./ui";

type Entry = { course: Course; slot: Slot };

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function ScheduleTab() {
  const { data } = useStore();
  const now = useNow();
  const today = isoWeekday(now);
  const [day, setDay] = useState<Weekday>(today > 5 ? 1 : today);
  const [editing, setEditing] = useState<Course | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<Weekday, Entry[]>();
    for (const course of data.courses)
      for (const slot of course.slots) {
        const list = map.get(slot.day) ?? [];
        list.push({ course, slot });
        map.set(slot.day, list);
      }
    for (const list of map.values()) list.sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start));
    return map;
  }, [data.courses]);

  // Lundi-vendredi toujours visibles ; samedi/dimanche seulement si utilises
  const days = WEEKDAYS.filter((d) => d.value <= 5 || byDay.has(d.value));

  // Cours en cours ou prochain cours aujourd'hui
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayList = byDay.get(today) ?? [];
  const current = todayList.find((e) => toMinutes(e.slot.start) <= nowMin && nowMin < toMinutes(e.slot.end));
  const next = todayList.find((e) => toMinutes(e.slot.start) > nowMin);

  const list = byDay.get(day) ?? [];

  return (
    <div>
      {data.courses.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-px border border-line-strong bg-line-strong">
          <StatusBlock label="En cours" entry={current} now={nowMin} mode="current" />
          <StatusBlock label="Prochain" entry={next} now={nowMin} mode="next" />
        </div>
      )}

      <div
        className="grid gap-px border border-line-strong bg-line-strong"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((d) => {
          const active = d.value === day;
          const count = byDay.get(d.value)?.length ?? 0;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => setDay(d.value)}
              aria-pressed={active}
              className={cx(
                "relative flex aspect-square flex-col items-center justify-center gap-1 transition-colors",
                active ? "bg-fg text-bg" : "bg-surface text-fg active:bg-surface-2",
              )}
            >
              <span className="text-[12px] font-bold tracking-[0.1em]">{d.short}</span>
              <span className={cx("tabular text-[10px]", active ? "text-bg/60" : "text-dim")}>
                {count > 0 ? String(count).padStart(2, "0") : "--"}
              </span>
              {d.value === today && (
                <span className={cx("absolute left-0 top-0 h-1.5 w-full", active ? "bg-bg/40" : "bg-fg")} aria-label="Aujourd'hui" />
              )}
            </button>
          );
        })}
      </div>

      <SectionTitle
        right={
          <button
            type="button"
            onClick={() => setEditing(emptyCourse(day))}
            className="flex h-8 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-fg"
          >
            <Plus size={14} aria-hidden /> Ajouter
          </button>
        }
      >
        {WEEKDAYS.find((d) => d.value === day)?.long}
      </SectionTitle>

      {list.length === 0 ? (
        <Empty
          icon={CalendarDays}
          title="Aucun cours"
          text={data.courses.length === 0 ? "Commence par ajouter tes cours de la session." : "Journée libre."}
        />
      ) : (
        <ul className="border border-line-strong">
          {list.map(({ course, slot }) => {
            const live = day === today && current?.slot.id === slot.id;
            return (
              <li key={slot.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEditing(course)}
                  className={cx("flex w-full items-stretch text-left active:bg-surface-2", live && "bg-surface-2")}
                >
                  <div className={cx("tabular flex w-20 shrink-0 flex-col justify-center border-r border-line px-3 py-3 font-mono", live && "border-l-4 border-l-fg")}>
                    <span className="text-[15px] font-semibold">{slot.start}</span>
                    <span className="text-[12px] text-muted">{slot.end}</span>
                  </div>
                  <div className="min-w-0 flex-1 px-3 py-3">
                    <p className="truncate font-semibold">{course.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
                      {slot.room && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} aria-hidden /> {slot.room}
                        </span>
                      )}
                      {course.teacher && (
                        <span className="flex items-center gap-1">
                          <User size={13} aria-hidden /> {course.teacher}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center pr-3 text-dim">
                    <ChevronRight size={18} aria-hidden />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>Mes cours</SectionTitle>
      {data.courses.length === 0 ? (
        <Button variant="primary" icon={Plus} className="w-full" onClick={() => setEditing(emptyCourse(day))}>
          Ajouter un cours
        </Button>
      ) : (
        <ul className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong">
          {[...data.courses]
            .sort((a, b) => a.name.localeCompare(b.name, "fr"))
            .map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  className="flex h-full min-h-24 w-full flex-col justify-between bg-surface p-3 text-left active:bg-surface-2"
                >
                  <BookOpen size={16} className="text-dim" aria-hidden />
                  <div className="mt-3">
                    <p className="line-clamp-2 text-[14px] font-semibold leading-tight">{c.name}</p>
                    <p className="tabular mt-1 text-[11px] uppercase tracking-wider text-muted">
                      {c.code || `${c.slots.length} plage${c.slots.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          {data.courses.length % 2 === 1 && (
            <li>
              <button
                type="button"
                onClick={() => setEditing(emptyCourse(day))}
                className="flex h-full min-h-24 w-full items-center justify-center gap-2 bg-bg text-[11px] font-semibold uppercase tracking-wider text-muted active:bg-surface-2"
              >
                <Plus size={16} aria-hidden /> Ajouter
              </button>
            </li>
          )}
        </ul>
      )}

      {editing && <CourseForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StatusBlock({ label, entry, now, mode }: { label: string; entry?: Entry; now: number; mode: "current" | "next" }) {
  let meta = "";
  if (entry) {
    const mins = mode === "current" ? toMinutes(entry.slot.end) - now : toMinutes(entry.slot.start) - now;
    const txt = mins >= 60 ? `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")}` : `${mins} min`;
    meta = mode === "current" ? `Fin dans ${txt}` : `Dans ${txt}`;
  }
  return (
    <div className={cx("min-h-28 p-3", entry && mode === "current" ? "bg-fg text-bg" : "bg-surface")}>
      <p className={cx("text-[10px] font-semibold uppercase tracking-[0.16em]", entry && mode === "current" ? "text-bg/60" : "text-muted")}>
        {label}
      </p>
      {entry ? (
        <>
          <p className="mt-2 line-clamp-2 text-[15px] font-bold leading-tight">{entry.course.name}</p>
          <p className="tabular mt-1 font-mono text-[12px] opacity-70">
            {entry.slot.start}
            {entry.slot.room ? ` / ${entry.slot.room}` : ""}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider opacity-70">{meta}</p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-dim">{mode === "next" ? "Plus rien aujourd'hui" : "Aucun cours"}</p>
      )}
    </div>
  );
}
