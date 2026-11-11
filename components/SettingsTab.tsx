"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CalendarPlus, Download, RotateCcw, Share, SquarePlus, Upload } from "lucide-react";
import { useStore, sanitize } from "@/lib/store";
import { exportIcs } from "@/lib/ics";
import { isStandalone, notificationSupport, notify, requestPermission, type NotifSupport } from "@/lib/notifications";
import { Button, Field, Input, Select, SectionTitle } from "./ui";

export default function SettingsTab() {
  const { data, updateSettings, replaceAll, resetAll } = useStore();
  const s = data.settings;
  const [support, setSupport] = useState<NotifSupport>("unsupported");
  const [permission, setPermission] = useState<NotificationPermission | "n/a">("n/a");
  const [standalone, setStandalone] = useState(true);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSupport(notificationSupport());
    setStandalone(isStandalone());
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3500);
  };

  const enableNotifs = async () => {
    const p = await requestPermission();
    setPermission(p);
    if (p === "granted") {
      updateSettings({ notificationsEnabled: true });
      await notify("Rappels activés", "Tu recevras les rappels de cours et d'échéances.", "welcome");
    } else {
      flash("Permission refusée. Réactive-la dans Réglages > Notifications.");
    }
  };

  const onIcs = async () => {
    if (data.courses.length === 0 && data.tasks.length === 0) return flash("Rien à exporter pour l'instant.");
    const r = await exportIcs(data);
    flash(r === "shared" ? "Fichier partagé." : "Fichier .ics généré.");
  };

  const onBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-app-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const onRestore = async (file: File) => {
    try {
      const parsed = sanitize(JSON.parse(await file.text()));
      if (confirm(`Remplacer les données actuelles par ${parsed.courses.length} cours et ${parsed.tasks.length} tâches ?`)) {
        replaceAll(parsed);
        flash("Sauvegarde restaurée.");
      }
    } catch {
      flash("Fichier invalide.");
    }
  };

  const notifOn = s.notificationsEnabled && permission === "granted";

  return (
    <div>
      {!standalone && (
        <div className="mb-6 border border-fg p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Installer sur iPhone</p>
          <ol className="mt-3 space-y-2 text-[14px]">
            <li className="flex items-center gap-2">
              <span className="tabular w-6 font-mono text-muted">01</span> Ouvre ce site dans Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="tabular w-6 font-mono text-muted">02</span> Touche <Share size={16} aria-label="Partager" /> Partager
            </li>
            <li className="flex items-center gap-2">
              <span className="tabular w-6 font-mono text-muted">03</span> <SquarePlus size={16} aria-hidden /> Sur l&apos;écran
              d&apos;accueil
            </li>
          </ol>
        </div>
      )}

      <SectionTitle>Session</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Début" htmlFor="s-start">
          <Input id="s-start" type="date" value={s.sessionStart} onChange={(e) => updateSettings({ sessionStart: e.target.value })} />
        </Field>
        <Field label="Fin" htmlFor="s-end">
          <Input id="s-end" type="date" value={s.sessionEnd} onChange={(e) => updateSettings({ sessionEnd: e.target.value })} />
        </Field>
      </div>
      <p className="mt-2 text-[12px] text-muted">Utilisé pour répéter les cours chaque semaine dans l&apos;export calendrier.</p>

      <SectionTitle>Rappels</SectionTitle>
      <div className="border border-line-strong">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-line-strong">
              {notifOn ? <Bell size={18} aria-hidden /> : <BellOff size={18} className="text-muted" aria-hidden />}
            </div>
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-[12px] text-muted">
                {support === "needs-install"
                  ? "Installe l'app sur l'écran d'accueil d'abord"
                  : support === "unsupported"
                    ? "Non prises en charge ici"
                    : permission === "denied"
                      ? "Bloquées dans les réglages de l'appareil"
                      : notifOn
                        ? "Activées"
                        : "Désactivées"}
              </p>
            </div>
          </div>
          {support === "ok" && permission !== "denied" && (
            <Button
              variant={notifOn ? "outline" : "primary"}
              className="min-h-10 px-3"
              onClick={() => (notifOn ? updateSettings({ notificationsEnabled: false }) : enableNotifs())}
            >
              {notifOn ? "Couper" : "Activer"}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-3">
          <Field label="Avant un cours" htmlFor="s-lead-c">
            <Select id="s-lead-c" value={s.courseLeadMinutes} onChange={(e) => updateSettings({ courseLeadMinutes: Number(e.target.value) })}>
              {[5, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Avant une échéance" htmlFor="s-lead-t">
            <Select id="s-lead-t" value={s.taskLeadHours} onChange={(e) => updateSettings({ taskLeadHours: Number(e.target.value) })}>
              {[3, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {notifOn && (
          <div className="border-t border-line p-3">
            <Button className="w-full" onClick={() => notify("Test", "Les notifications fonctionnent.", "test")}>
              Envoyer un test
            </Button>
          </div>
        )}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Sur iOS, une app web ne peut pas programmer de rappel quand elle est fermée. Les rappels sont envoyés quand
        l&apos;app est ouverte ou en arrière-plan récent. Pour des alertes garanties, exporte vers Calendrier : chaque
        événement inclut ses alertes.
      </p>

      <SectionTitle>Calendrier Apple</SectionTitle>
      <Button variant="primary" icon={CalendarPlus} className="w-full" onClick={onIcs}>
        Exporter en .ics
      </Button>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Cours répétés chaque semaine jusqu&apos;à la fin de session, plus les échéances non terminées. Ouvre le fichier
        puis choisis « Ajouter tout » pour profiter des widgets Calendrier. Réimporter crée des doublons : supprime
        l&apos;ancien calendrier avant.
      </p>

      <SectionTitle>Données</SectionTitle>
      <div className="grid grid-cols-2 gap-px border border-line-strong bg-line-strong">
        <button type="button" onClick={onBackup} className="flex min-h-20 flex-col items-start justify-between bg-surface p-3 text-left active:bg-surface-2">
          <Download size={18} aria-hidden />
          <span className="text-[12px] font-semibold uppercase tracking-wider">Sauvegarder</span>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-20 flex-col items-start justify-between bg-surface p-3 text-left active:bg-surface-2"
        >
          <Upload size={18} aria-hidden />
          <span className="text-[12px] font-semibold uppercase tracking-wider">Restaurer</span>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onRestore(f);
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-[12px] text-muted">
        Les données restent sur cet appareil ({data.courses.length} cours, {data.tasks.length} tâches).
      </p>

      <Button
        variant="danger"
        icon={RotateCcw}
        className="mt-6 w-full"
        onClick={() => confirm("Effacer tous les cours, tâches et réglages ? Action irréversible.") && resetAll()}
      >
        Tout effacer
      </Button>

      {msg && (
        <div
          role="status"
          className="fixed inset-x-4 z-40 mx-auto max-w-xl border border-fg bg-bg px-4 py-3 text-[14px]"
          style={{ bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
