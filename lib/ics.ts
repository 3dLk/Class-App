import type { AppData } from "./types";
import { TASK_TYPES } from "./types";
import { isoWeekday, pad, parseLocal } from "./date";

const TZID = "America/Toronto"; // Quebec = heure de l'Est

// Definition de fuseau requise par la norme quand on utilise TZID
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Repli des lignes a 75 octets (RFC 5545 §3.1) */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let len = 0;
  for (const ch of line) {
    const l = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // les lignes suivantes commencent par un espace
    if (len + l > limit) {
      out.push(cur);
      cur = "";
      len = 0;
    }
    cur += ch;
    len += l;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}${pad(d.getUTCSeconds())}Z`;
}

const BYDAY = ["", "MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export function buildIcs(data: AppData): string {
  const { courses, tasks, settings } = data;
  const now = utcStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Class App//Horaire Cegep//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Horaire Cégep",
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
  ];

  const sessionStart = parseLocal(settings.sessionStart);
  const sessionEnd = parseLocal(`${settings.sessionEnd}T23:59`);

  for (const c of courses) {
    for (const s of c.slots) {
      // Premiere occurrence a partir du debut de session
      const first = new Date(sessionStart);
      while (isoWeekday(first) !== s.day) first.setDate(first.getDate() + 1);
      const [sh, sm] = s.start.split(":").map(Number);
      const [eh, em] = s.end.split(":").map(Number);
      const start = new Date(first.getFullYear(), first.getMonth(), first.getDate(), sh, sm);
      const end = new Date(first.getFullYear(), first.getMonth(), first.getDate(), eh, em);
      if (start > sessionEnd) continue;

      const desc = [c.code && `Code : ${c.code}`, c.teacher && `Enseignant : ${c.teacher}`].filter(Boolean).join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:course-${c.id}-${s.id}@class-app`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=${TZID}:${localStamp(start)}`,
        `DTEND;TZID=${TZID}:${localStamp(end)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[s.day]};UNTIL=${utcStamp(sessionEnd)}`,
        `SUMMARY:${esc(c.name)}`,
        ...(s.room ? [`LOCATION:${esc(s.room)}`] : []),
        ...(desc ? [`DESCRIPTION:${esc(desc)}`] : []),
        "CATEGORIES:Cours",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(c.name)}`,
        `TRIGGER:-PT${Math.max(0, settings.courseLeadMinutes)}M`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }

  for (const t of tasks) {
    if (t.done) continue;
    const due = parseLocal(t.due);
    const end = new Date(due.getTime() + 30 * 60000);
    const course = courses.find((c) => c.id === t.courseId);
    const label = TASK_TYPES.find((x) => x.value === t.type)?.label ?? "Tâche";
    const summary = `[${label}] ${t.title}${course ? ` - ${course.name}` : ""}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@class-app`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${TZID}:${localStamp(due)}`,
      `DTEND;TZID=${TZID}:${localStamp(end)}`,
      `SUMMARY:${esc(summary)}`,
      ...(t.notes ? [`DESCRIPTION:${esc(t.notes)}`] : []),
      `CATEGORIES:${esc(label)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(summary)}`,
      `TRIGGER:-PT${Math.max(0, settings.taskLeadHours)}H`,
      "END:VALARM",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(summary)}`,
      "TRIGGER:-PT1H",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * Sur iPhone, ouvrir un .ics dans Safari affiche directement l'ecran
 * "Ajouter tous les evenements" de Calendrier. En mode PWA (ecran d'accueil),
 * on passe par le menu de partage si disponible, sinon telechargement classique.
 */
export async function exportIcs(data: AppData): Promise<"shared" | "downloaded"> {
  const content = buildIcs(data);
  const filename = "horaire-cegep.ics";
  const file = new File([content], filename, { type: "text/calendar" });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Horaire Cégep" });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "shared";
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
