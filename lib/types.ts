// 1 = lundi ... 7 = dimanche (norme ISO, plus simple pour un horaire scolaire)
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Slot {
  id: string;
  day: Weekday;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  room: string;
}

export interface Course {
  id: string;
  name: string;
  code: string; // ex: 420-1A1-SF (optionnel)
  teacher: string;
  slots: Slot[];
}

export type TaskType = "devoir" | "examen" | "etude" | "autre";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  due: string; // "YYYY-MM-DDTHH:MM" heure locale
  courseId: string | null;
  done: boolean;
  notes: string;
  createdAt: number;
}

export interface Settings {
  sessionStart: string; // "YYYY-MM-DD"
  sessionEnd: string; // "YYYY-MM-DD"
  notificationsEnabled: boolean;
  courseLeadMinutes: number; // rappel avant un cours
  taskLeadHours: number; // rappel avant une echeance
}

export interface AppData {
  version: 1;
  courses: Course[];
  tasks: Task[];
  settings: Settings;
}

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "devoir", label: "Devoir" },
  { value: "examen", label: "Examen" },
  { value: "etude", label: "Étudier" },
  { value: "autre", label: "Autre" },
];

export const WEEKDAYS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "LUN", long: "Lundi" },
  { value: 2, short: "MAR", long: "Mardi" },
  { value: 3, short: "MER", long: "Mercredi" },
  { value: 4, short: "JEU", long: "Jeudi" },
  { value: 5, short: "VEN", long: "Vendredi" },
  { value: 6, short: "SAM", long: "Samedi" },
  { value: 7, short: "DIM", long: "Dimanche" },
];
