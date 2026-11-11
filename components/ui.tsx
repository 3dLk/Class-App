"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "outline" | "ghost" | "danger";

export function Button({
  variant = "outline",
  icon: Icon,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: LucideIcon }) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-fg text-bg border-fg active:bg-muted",
    outline: "bg-transparent text-fg border-line-strong active:bg-surface-2",
    ghost: "bg-transparent text-muted border-transparent active:text-fg",
    danger: "bg-transparent text-alert border-alert/60 active:bg-alert/10",
  };
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[2px] border px-4 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={18} strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-11 w-11 items-center justify-center rounded-[2px] border border-line-strong text-fg active:bg-surface-2",
        className,
      )}
      {...rest}
    >
      <Icon size={20} strokeWidth={2} aria-hidden />
    </button>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </label>
  );
}

const fieldCls =
  "block w-full min-h-12 border border-line-strong bg-surface px-3 text-fg placeholder:text-dim outline-none focus:border-fg";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldCls, "py-3 leading-snug", props.className)} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cx(fieldCls, "pr-10", props.className)}>
        {children}
      </select>
      {/* Chevron dessine en CSS (pas d'emoji ni de caractere special) */}
      <span className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-3/4 rotate-45 border-b-2 border-r-2 border-muted" />
    </div>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** Groupe de boutons carres a choix unique */
export function SquareChoice<T extends string | number>({
  options,
  value,
  onChange,
  cols,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div
      role="radiogroup"
      className="grid gap-px border border-line-strong bg-line-strong"
      style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-12 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors",
              active ? "bg-fg text-bg" : "bg-surface text-muted active:bg-surface-2",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex items-end justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-line-strong p-5">
      <div className="flex h-10 w-10 items-center justify-center border border-line-strong">
        <Icon size={20} aria-hidden className="text-muted" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

/** Panneau plein ecran pour les formulaires (style feuille iOS, mais carre) */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="pt-safe shrink-0 border-b border-line">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <h2 className="text-[15px] font-bold uppercase tracking-[0.1em]">{title}</h2>
          <IconButton icon={X} label="Fermer" onClick={onClose} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-xl space-y-5 px-4 py-5">{children}</div>
      </div>
      {footer && (
        <footer className="pb-safe shrink-0 border-t border-line bg-bg">
          <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">{footer}</div>
        </footer>
      )}
    </div>
  );
}
