'use client';

/**
 * Conductor design system — Aberdeen Advisors brand.
 *
 * Palette is fixed: Aberdeen Blue #09375F, Verdigris #44B0B1, White, Onyx #404040.
 * Secondary palette (Deep Sky Blue, Jasper, Jade, Gold) is used for charts and category
 * encoding only.
 *
 * ADA rule enforced here: Verdigris is never used as text on white. It appears as a fill,
 * a rule, or a border only. Category colour is always paired with a label or numeral so
 * colour is never the sole encoder of meaning.
 */

import React from 'react';

export const BRAND = {
  aberdeen: '#09375F',
  verdigris: '#44B0B1',
  onyx: '#404040',
  white: '#FFFFFF',
  chart: { skyblue: '#5CC8FF', jasper: '#DB504A', jade: '#00A676', gold: '#F7D002' },
} as const;

/* ------------------------------------------------------------------ Card */

export function Card({
  title, subtitle, actions, children, className = '', flush = false,
}: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode;
  children: React.ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={`bg-white border border-onyx-20 rounded-md ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-onyx-10">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-medium text-aberdeen leading-snug">{title}</h2>}
            {subtitle && <p className="text-xs text-onyx-60 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary', size = 'md', className = '', children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verdigris focus-visible:ring-offset-1';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-[13px] px-3.5 py-2' };
  const variants: Record<Variant, string> = {
    primary: 'bg-aberdeen text-white hover:bg-aberdeen-600',
    secondary: 'bg-white text-aberdeen border border-onyx-20 hover:bg-aberdeen-50 hover:border-aberdeen-200',
    ghost: 'text-onyx hover:bg-onyx-10',
    danger: 'bg-white text-jasper border border-jasper/40 hover:bg-jasper/10',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Chip */

/**
 * Priority band chip. The brand's secondary palette supplies the category colour, shown as
 * a dot; the text is Onyx on a light tint so it always passes contrast.
 */
export function BandChip({ band, score }: { band: string | null; score?: number | null }) {
  if (!band) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-onyx-5 border border-onyx-20 px-2 py-0.5 text-2xs text-onyx-60 whitespace-nowrap">
        Not yet scored
      </span>
    );
  }
  const map: Record<string, { dot: string; bg: string }> = {
    Critical: { dot: BRAND.chart.jasper, bg: 'bg-jasper-tint border-jasper/30' },
    'High Priority': { dot: BRAND.chart.gold, bg: 'bg-gold-tint border-gold/40' },
    'Medium Priority': { dot: BRAND.chart.skyblue, bg: 'bg-skyblue-tint border-skyblue/40' },
    'Lower Priority': { dot: '#9A9A9A', bg: 'bg-onyx-5 border-onyx-20' },
  };
  const s = map[band] ?? map['Lower Priority'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-2xs font-medium text-onyx whitespace-nowrap ${s.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {band}
      {score !== undefined && score !== null && <span className="text-onyx-60 tabular-nums">· {score.toFixed(2)}</span>}
    </span>
  );
}

export function QuadrantChip({ q }: { q: string | null }) {
  if (!q) return <span className="text-2xs text-onyx-40">—</span>;
  return (
    <span className="inline-flex items-center rounded-sm border border-aberdeen-200 bg-aberdeen-50 px-2 py-0.5 text-2xs font-medium text-aberdeen whitespace-nowrap">
      {q}
    </span>
  );
}

export function Badge({
  children, tone = 'neutral',
}: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'accent' | 'warn' | 'danger' | 'ok' }) {
  const tones = {
    neutral: 'bg-onyx-5 text-onyx-60 border-onyx-20',
    brand: 'bg-aberdeen text-white border-aberdeen',
    accent: 'bg-verdigris-100 text-aberdeen border-verdigris-200',
    warn: 'bg-gold-tint text-onyx border-gold/40',
    danger: 'bg-jasper-tint text-onyx border-jasper/40',
    ok: 'bg-jade-tint text-onyx border-jade/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* --------------------------------------------------------- Calculated cell */

/** Calculated values are visually distinct, non-editable, and explain themselves. */
export function CalcValue({
  children, explain, className = '',
}: { children: React.ReactNode; explain?: string; className?: string }) {
  return (
    <span className={`group relative inline-flex items-center gap-1 ${className}`}>
      <svg width="10" height="10" viewBox="0 0 16 16" className="text-onyx-40 shrink-0" fill="currentColor" aria-hidden>
        <rect x="2" y="1" width="12" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <rect x="4" y="3" width="8" height="3" rx="0.5" />
        <circle cx="5" cy="9" r="0.9" /><circle cx="8" cy="9" r="0.9" /><circle cx="11" cy="9" r="0.9" />
        <circle cx="5" cy="12" r="0.9" /><circle cx="8" cy="12" r="0.9" /><circle cx="11" cy="12" r="0.9" />
      </svg>
      <span className="tabular-nums">{children}</span>
      {explain && (
        <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-max max-w-md rounded border border-onyx-20 bg-white px-3 py-2 text-2xs font-normal text-onyx shadow-pop group-hover:block">
          <span className="block text-aberdeen font-medium mb-0.5">Calculated</span>
          {explain}
        </span>
      )}
    </span>
  );
}

/* ----------------------------------------------------------------- Panels */

export function SidePanel({
  open, onClose, title, subtitle, children, width = 'w-[560px]',
}: {
  open: boolean; onClose: () => void; title: React.ReactNode;
  subtitle?: React.ReactNode; children: React.ReactNode; width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-aberdeen-900/25" onClick={onClose} />
      <aside className={`relative ${width} max-w-full bg-white shadow-panel flex flex-col`}>
        <div className="brand-rule" />
        <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-onyx-10">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-aberdeen leading-snug">{title}</h2>
            {subtitle && <p className="text-xs text-onyx-60 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-onyx-40 hover:text-aberdeen text-xl leading-none px-1">×</button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  open, onClose, title, children, width = 'max-w-lg',
}: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-aberdeen-900/35" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-md shadow-panel`}>
        <div className="brand-rule rounded-t-md" />
        <header className="px-6 py-4 border-b border-onyx-10 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-aberdeen">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-onyx-40 hover:text-aberdeen text-xl leading-none">×</button>
        </header>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Misc */

export function Banner({
  tone = 'info', children, action,
}: { tone?: 'info' | 'warn' | 'accent'; children: React.ReactNode; action?: React.ReactNode }) {
  const tones = {
    info: 'bg-aberdeen-50 border-aberdeen-200 text-aberdeen',
    warn: 'bg-gold-tint border-gold/50 text-onyx',
    accent: 'bg-verdigris-50 border-verdigris-200 text-aberdeen',
  };
  return (
    <div className={`flex items-center justify-between gap-4 border rounded px-4 py-2.5 text-[13px] ${tones[tone]}`}>
      <div className="leading-snug">{children}</div>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, denominator, tone = 'neutral',
}: { label: string; value: React.ReactNode; denominator?: string; tone?: 'neutral' | 'attention' }) {
  return (
    <div className={`bg-white border rounded-md px-4 py-3.5 ${tone === 'attention' ? 'border-gold/50' : 'border-onyx-20'}`}>
      <div className="text-2xs uppercase tracking-wide text-onyx-60 mb-1.5">{label}</div>
      <div className="text-2xl font-light text-aberdeen tabular-nums leading-none">{value}</div>
      {denominator && <div className="text-2xs text-onyx-40 mt-1.5">{denominator}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <p className="text-sm font-medium text-aberdeen">{title}</p>
      <p className="text-xs text-onyx-60 mt-1.5 max-w-md mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium text-aberdeen mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-2xs text-onyx-60 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded border border-onyx-20 bg-white px-3 py-2 text-[13px] text-onyx placeholder:text-onyx-40 focus:border-verdigris focus:outline-none focus:ring-1 focus:ring-verdigris';

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded bg-aberdeen text-white text-[13px] px-4 py-2.5 shadow-panel flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-verdigris" />
      {message}
    </div>
  );
}

export function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-onyx-60">{children}</h3>
      {note && <span className="text-2xs text-onyx-40">{note}</span>}
    </div>
  );
}
