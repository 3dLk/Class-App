"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, IconButton, Input, Select, Sheet } from "./ui";
import { useStore } from "@/lib/store";
import { toMinutes, uid } from "@/lib/date";
import { WEEKDAYS, type Course, type Slot, type Weekday } from "@/lib/types";

function newSlot(day: Weekday = 1, room = ""): Slot {
  return { id: uid(), day, start: "08:00", end: "09:50", room };
}

export function emptyCourse(day?: Weekday): Course {
  return { id: uid(), name: "", code: "", teacher: "", slots: [newSlot(day)] };
}

export default function CourseForm({ initial, onClose }: { initial: Course; onClose: () => void }) {
  const { data, saveCourse, deleteCourse } = useStore();
  const [c, setC] = useState<Course>(initial);
  const [error, setError] = useState("");
  const exists = data.courses.some((x) => x.id === initial.id);

  const setSlot = (id: string, patch: Partial<Slot>) =>
    setC((prev) => ({ ...prev, slots: prev.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const submit = () => {
    if (!c.name.trim()) return setError("Le nom du cours est requis.");
    if (c.slots.length === 0) return setError("Ajoute au moins une plage horaire.");
    if (c.slots.some((s) => toMinutes(s.end) <= toMinutes(s.start)))
      return setError("L'heure de fin doit être après l'heure de début.");
    saveCourse({ ...c, name: c.name.trim(), code: c.code.trim(), teacher: c.teacher.trim() });
    onClose();
  };

  const remove = () => {
    if (confirm(`Supprimer le cours « ${c.name || "sans nom"} » ? Les tâches liées seront conservées.`)) {
      deleteCourse(c.id);
      onClose();
    }
  };

  return (
    <Sheet
      open
      title={exists ? "Modifier le cours" : "Nouveau cours"}
      onClose={onClose}
      footer={
        <>
          {exists && <IconButton icon={Trash2} label="Supprimer le cours" onClick={remove} className="h-12 w-12 text-alert" />}
          <Button variant="primary" className="flex-1" onClick={submit}>
            Enregistrer
          </Button>
        </>
      }
    >
      <Field label="Nom du cours" htmlFor="c-name">
        <Input
          id="c-name"
          value={c.name}
          onChange={(e) => setC({ ...c, name: e.target.value })}
          placeholder="Calcul différentiel"
          autoComplete="off"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code (optionnel)" htmlFor="c-code">
          <Input
            id="c-code"
            value={c.code}
            onChange={(e) => setC({ ...c, code: e.target.value })}
            placeholder="201-NYA-05"
            autoComplete="off"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Enseignant" htmlFor="c-teacher">
          <Input
            id="c-teacher"
            value={c.teacher}
            onChange={(e) => setC({ ...c, teacher: e.target.value })}
            placeholder="Nom"
            autoComplete="off"
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Plages horaires</span>
          <span className="tabular text-[11px] text-dim">{c.slots.length}</span>
        </div>
        <div className="space-y-3">
          {c.slots.map((s, i) => (
            <div key={s.id} className="border border-line-strong bg-surface">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="tabular text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Plage {String(i + 1).padStart(2, "0")}
                </span>
                {c.slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setC({ ...c, slots: c.slots.filter((x) => x.id !== s.id) })}
                    className="flex h-8 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted active:text-alert"
                  >
                    <Trash2 size={14} aria-hidden /> Retirer
                  </button>
                )}
              </div>
              <div className="space-y-3 p-3">
                <Field label="Jour">
                  <Select value={s.day} onChange={(e) => setSlot(s.id, { day: Number(e.target.value) as Weekday })}>
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.long}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Début">
                    <Input type="time" value={s.start} step={300} onChange={(e) => setSlot(s.id, { start: e.target.value })} />
                  </Field>
                  <Field label="Fin">
                    <Input type="time" value={s.end} step={300} onChange={(e) => setSlot(s.id, { end: e.target.value })} />
                  </Field>
                </div>
                <Field label="Local">
                  <Input
                    value={s.room}
                    onChange={(e) => setSlot(s.id, { room: e.target.value })}
                    placeholder="G-245"
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <Button
          icon={Plus}
          className="mt-3 w-full border-dashed"
          onClick={() => {
            const last = c.slots[c.slots.length - 1];
            const nextDay = last ? (Math.min(7, last.day + 2) as Weekday) : 1;
            setC({ ...c, slots: [...c.slots, newSlot(nextDay, last?.room ?? "")] });
          }}
        >
          Ajouter une plage
        </Button>
      </div>

      {error && <p className="border border-alert/60 px-3 py-2 text-sm text-alert">{error}</p>}
    </Sheet>
  );
}
