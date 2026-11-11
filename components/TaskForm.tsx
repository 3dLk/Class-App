"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, IconButton, Input, Select, Sheet, SquareChoice, TextArea } from "./ui";
import { useStore } from "@/lib/store";
import { toDateTimeInput, uid } from "@/lib/date";
import { TASK_TYPES, type Task } from "@/lib/types";

export function emptyTask(): Task {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 0, 0);
  return { id: uid(), title: "", type: "devoir", due: toDateTimeInput(d), courseId: null, done: false, notes: "", createdAt: Date.now() };
}

export default function TaskForm({ initial, onClose }: { initial: Task; onClose: () => void }) {
  const { data, saveTask, deleteTask } = useStore();
  const [t, setT] = useState<Task>(initial);
  const [error, setError] = useState("");
  const exists = data.tasks.some((x) => x.id === initial.id);

  const submit = () => {
    if (!t.title.trim()) return setError("Le titre est requis.");
    if (!t.due) return setError("La date limite est requise.");
    saveTask({ ...t, title: t.title.trim() });
    onClose();
  };

  const remove = () => {
    if (confirm(`Supprimer « ${t.title || "cette tâche"} » ?`)) {
      deleteTask(t.id);
      onClose();
    }
  };

  return (
    <Sheet
      open
      title={exists ? "Modifier" : "Nouvelle tâche"}
      onClose={onClose}
      footer={
        <>
          {exists && <IconButton icon={Trash2} label="Supprimer la tâche" onClick={remove} className="h-12 w-12 text-alert" />}
          <Button variant="primary" className="flex-1" onClick={submit}>
            Enregistrer
          </Button>
        </>
      }
    >
      <Field label="Titre" htmlFor="t-title">
        <Input
          id="t-title"
          value={t.title}
          onChange={(e) => setT({ ...t, title: e.target.value })}
          placeholder="TP2 de programmation"
          autoComplete="off"
        />
      </Field>

      <Field label="Type">
        <SquareChoice options={TASK_TYPES} value={t.type} onChange={(type) => setT({ ...t, type })} cols={2} />
      </Field>

      <Field label="Date limite" htmlFor="t-due">
        <Input id="t-due" type="datetime-local" value={t.due} onChange={(e) => setT({ ...t, due: e.target.value })} />
      </Field>

      <Field label="Cours associé" htmlFor="t-course">
        <Select
          id="t-course"
          value={t.courseId ?? ""}
          onChange={(e) => setT({ ...t, courseId: e.target.value || null })}
        >
          <option value="">Aucun</option>
          {[...data.courses]
            .sort((a, b) => a.name.localeCompare(b.name, "fr"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </Field>

      <Field label="Statut">
        <SquareChoice
          options={[
            { value: "todo", label: "À faire" },
            { value: "done", label: "Terminé" },
          ]}
          value={t.done ? "done" : "todo"}
          onChange={(v) => setT({ ...t, done: v === "done" })}
        />
      </Field>

      <Field label="Notes" htmlFor="t-notes">
        <TextArea
          id="t-notes"
          rows={5}
          value={t.notes}
          onChange={(e) => setT({ ...t, notes: e.target.value })}
          placeholder="Chapitres à réviser, consignes, matériel..."
        />
      </Field>

      {error && <p className="border border-alert/60 px-3 py-2 text-sm text-alert">{error}</p>}
    </Sheet>
  );
}
