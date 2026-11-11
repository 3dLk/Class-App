import type { Weekday } from "./types";

export const pad = (n: number) => String(n).padStart(2, "0");

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Jour ISO (1 = lundi ... 7 = dimanche) */
export function isoWeekday(d: Date): Weekday {
  const js = d.getDay();
  return (js === 0 ? 7 : js) as Weekday;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "YYYY-MM-DDTHH:MM" (heure locale) -> Date */
export function parseLocal(value: string): Date {
  const [date, time = "00:00"] = value.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toDateTimeInput(d: Date): string {
  return `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const dayFmt = new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short" });
export function formatDue(d: Date): string {
  return `${dayFmt.format(d).replace(/\./g, "")} / ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Texte relatif court : "Dans 3 h", "Demain", "En retard de 2 j" */
export function relative(d: Date, now = new Date()): string {
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(diffMin);
  let txt: string;
  if (abs < 60) txt = `${abs} min`;
  else if (abs < 60 * 24) txt = `${Math.round(abs / 60)} h`;
  else txt = `${Math.round(abs / 1440)} j`;
  return diffMin >= 0 ? `Dans ${txt}` : `Retard ${txt}`;
}

/** Prochaine occurrence (aujourd'hui inclus) d'un jour de semaine a une heure donnee */
export function nextOccurrence(day: Weekday, hhmm: string, from = new Date()): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h, m);
  let delta = day - isoWeekday(from);
  if (delta < 0 || (delta === 0 && d.getTime() < from.getTime())) delta += 7;
  d.setDate(d.getDate() + delta);
  return d;
}

/** Date par defaut de fin de session (approx. Cegep : automne -> mi-decembre, hiver -> mi-mai) */
export function defaultSession(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 7) return { start: `${y}-08-20`, end: `${y}-12-20` };
  if (m <= 4) return { start: `${y}-01-15`, end: `${y}-05-20` };
  return { start: toDateInput(now), end: `${y}-08-15` };
}
