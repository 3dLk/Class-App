"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardList, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDue, parseLocal, relative } from "@/lib/date";
import { TASK_TYPES, type Task, type TaskType } from "@/lib/types";
import TaskForm, { emptyTask } from "./TaskForm";
import { Button, cx, Empty, SectionTitle, SquareChoice } from "./ui";

type Filter = "todo" | "done" | "all";
type TypeFilter = TaskType | "all";

function bucket(due: Date, now: Date): string {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday.getTime() + 86400000);
  const startAfter = new Date(startToday.getTime() + 2 * 86400000);
  const in7 = new Date(startToday.getTime() + 8 * 86400000);
  if (due < now) return "En retard";
  if (due < startTomorrow) return "Aujourd'hui";
  if (due < startAfter) return "Demain";
  if (due < in7) return "7 prochains jours";
  return "Plus tard";
}

export default function TasksTab() {
  const { data, toggleTask } = useStore();
  const [filter, setFilter] = useState<Filter>("todo");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const now = new Date();

  const counts = useMemo(
    () => ({ todo: data.tasks.filter((t) => !t.done).length, done: data.tasks.filter((t) => t.done).length }),
    [data.tasks],
  );

  // Tri automatique : echeance la plus proche en premier ; les terminees a la fin
  const groups = useMemo(() => {
    const ref = new Date();
    const list = data.tasks
      .filter((t) => (filter === "all" ? true : filter === "done" ? t.done : !t.done))
      .filter((t) => typeFilter === "all" || t.type === typeFilter)
      .sort((a, b) => Number(a.done) - Number(b.done) || parseLocal(a.due).getTime() - parseLocal(b.due).getTime());
    const out: { name: string; items: Task[] }[] = [];
    for (const t of list) {
      const name = t.done ? "Terminé" : bucket(parseLocal(t.due), ref);
      const g = out[out.length - 1];
      if (g && g.name === name) g.items.push(t);
      else out.push({ name, items: [t] });
    }
    return out;
  }, [data.tasks, filter, typeFilter]);

  const courseName = (id: string | null) => data.courses.find((c) => c.id === id)?.name;

  return (
    <div>
      <SquareChoice<Filter>
        options={[
          { value: "todo", label: `À faire ${String(counts.todo).padStart(2, "0")}` },
          { value: "done", label: `Terminé ${String(counts.done).padStart(2, "0")}` },
          { value: "all", label: "Tout" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {[{ value: "all" as TypeFilter, label: "Tous types" }, ...TASK_TYPES].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTypeFilter(o.value)}
            className={cx(
              "h-9 shrink-0 border px-3 text-[11px] font-semibold uppercase tracking-wider",
              typeFilter === o.value ? "border-fg bg-fg text-bg" : "border-line-strong text-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="mt-6 space-y-3">
          <Empty
            icon={ClipboardList}
            title={filter === "done" ? "Rien de terminé" : "Aucune échéance"}
            text="Ajoute un devoir, un examen ou une période d'étude avec sa date limite."
          />
          <Button variant="primary" icon={Plus} className="w-full" onClick={() => setEditing(emptyTask())}>
            Nouvelle tâche
          </Button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.name}>
            <SectionTitle right={<span className="tabular text-[11px] text-dim">{String(g.items.length).padStart(2, "0")}</span>}>
              <span className={g.name === "En retard" ? "text-alert" : undefined}>{g.name}</span>
            </SectionTitle>
            <ul className="border border-line-strong">
              {g.items.map((t) => {
                const due = parseLocal(t.due);
                const late = !t.done && due < now;
                const typeLabel = TASK_TYPES.find((x) => x.value === t.type)?.label;
                const cn = courseName(t.courseId);
                return (
                  <li key={t.id} className="flex items-stretch border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleTask(t.id)}
                      aria-label={t.done ? "Marquer à faire" : "Marquer terminé"}
                      aria-pressed={t.done}
                      className="flex w-14 shrink-0 items-center justify-center border-r border-line active:bg-surface-2"
                    >
                      <span
                        className={cx(
                          "flex h-6 w-6 items-center justify-center border-2",
                          t.done ? "border-fg bg-fg text-bg" : late ? "border-alert" : "border-line-strong",
                        )}
                      >
                        {t.done && <Check size={16} strokeWidth={3} aria-hidden />}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="min-w-0 flex-1 px-3 py-3 text-left active:bg-surface-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            "shrink-0 border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            t.type === "examen" ? "border-fg bg-fg text-bg" : "border-line-strong text-muted",
                          )}
                        >
                          {typeLabel}
                        </span>
                        {cn && <span className="truncate text-[12px] text-muted">{cn}</span>}
                      </div>
                      <p className={cx("mt-1.5 font-semibold leading-snug", t.done && "text-dim line-through")}>{t.title}</p>
                      <div className="tabular mt-1 flex items-center justify-between gap-2 font-mono text-[12px]">
                        <span className="text-muted">{formatDue(due)}</span>
                        {!t.done && <span className={late ? "text-alert" : "text-fg"}>{relative(due, now)}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* Bouton d'ajout flottant carre, au-dessus de la barre d'onglets */}
      {groups.length > 0 && (
        <button
          type="button"
          onClick={() => setEditing(emptyTask())}
          aria-label="Nouvelle tâche"
          className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center border border-fg bg-fg text-bg shadow-[4px_4px_0_0_#000] active:bg-muted"
          style={{ bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}
        >
          <Plus size={26} strokeWidth={2.25} aria-hidden />
        </button>
      )}

      {editing && <TaskForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
