"use client";

import { useEffect } from "react";
import type { AppData } from "./types";
import { TASK_TYPES } from "./types";
import { nextOccurrence, parseLocal, relative } from "./date";

const SENT_KEY = "classapp:notified:v1";

export type NotifSupport = "ok" | "unsupported" | "needs-install";

export function notificationSupport(): NotifSupport {
  if (typeof window === "undefined") return "unsupported";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && !isStandalone()) return "needs-install"; // iOS : notifications seulement en mode ecran d'accueil (16.4+)
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return "ok";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Doit etre appele depuis un geste utilisateur (tap) sur iOS */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.requestPermission();
}

export async function notify(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  const options: NotificationOptions = { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

function loadSent(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSent(sent: Record<string, number>) {
  // Purge des cles de plus de 14 jours
  const limit = Date.now() - 14 * 86400000;
  for (const k of Object.keys(sent)) if (sent[k] < limit) delete sent[k];
  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

/** Calcule et envoie les rappels qui tombent dans la fenetre de prevenance */
export async function checkReminders(data: AppData) {
  const { settings, courses, tasks } = data;
  if (!settings.notificationsEnabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  const sent = loadSent();
  const todo: { key: string; title: string; body: string }[] = [];

  const sessionStart = parseLocal(settings.sessionStart);
  const sessionEnd = parseLocal(`${settings.sessionEnd}T23:59`);
  const courseLead = settings.courseLeadMinutes * 60000;

  for (const c of courses) {
    for (const s of c.slots) {
      const at = nextOccurrence(s.day, s.start, now);
      if (at < sessionStart || at > sessionEnd) continue;
      const diff = at.getTime() - now.getTime();
      if (diff >= 0 && diff <= courseLead) {
        const key = `c:${s.id}:${at.toISOString().slice(0, 10)}`;
        if (!sent[key]) {
          todo.push({
            key,
            title: `${c.name} à ${s.start}`,
            body: [s.room && `Local ${s.room}`, c.teacher].filter(Boolean).join(" - ") || relative(at, now),
          });
        }
      }
    }
  }

  const taskLead = settings.taskLeadHours * 3600000;
  for (const t of tasks) {
    if (t.done) continue;
    const due = parseLocal(t.due);
    const diff = due.getTime() - now.getTime();
    const label = TASK_TYPES.find((x) => x.value === t.type)?.label ?? "Tâche";
    // Deux paliers : 1 h avant (prioritaire), puis la fenetre choisie
    const tiers: [string, number][] = [
      ["1h", 3600000],
      ["lead", taskLead],
    ];
    for (const [tier, lead] of tiers) {
      if (diff >= 0 && diff <= lead) {
        const key = `t:${t.id}:${tier}:${t.due}`;
        if (!sent[key]) {
          todo.push({ key, title: `${label} : ${t.title}`, body: `Échéance ${relative(due, now).toLowerCase()}` });
          // Si le palier 1 h est atteint, on marque aussi le palier large pour eviter un doublon
          if (tier === "1h") sent[`t:${t.id}:lead:${t.due}`] = Date.now();
          break;
        }
      }
    }
  }

  for (const n of todo) {
    sent[n.key] = Date.now();
    await notify(n.title, n.body, n.key);
  }
  if (todo.length) saveSent(sent);
}

/**
 * Verifie les rappels a l'ouverture, au retour au premier plan et chaque minute.
 * Limite iOS : sans serveur de push, le code ne tourne que lorsque l'app est ouverte
 * ou recemment en arriere-plan. Pour des rappels garantis, utiliser l'export .ics.
 */
export function useReminders(data: AppData, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const run = () => void checkReminders(data);
    run();
    const id = window.setInterval(run, 60000);
    const onVis = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [data, ready]);
}
