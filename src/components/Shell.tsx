'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/store';
import { Badge, Button } from '@/components/ui';
import { ENGAGEMENT } from '@/data/seed';

export interface NavItem { href: string; label: string; badge?: number }

export function Shell({
  nav, children, variant,
}: { nav: NavItem[]; children: React.ReactNode; variant: 'workspace' | 'portal' }) {
  const { session, ready, signOut, switchRole, resetDemo, currentPublication, hasUnpublishedChanges,
    unpublishedCount, submissions, engagement, mode, closeEngagement } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  /* Prototype route guard. Real authorisation is server-side — see PRD section 7.5. */
  useEffect(() => {
    if (!ready) return;
    if (!session) { router.replace('/login'); return; }
    if (variant === 'workspace' && session.role !== 'aberdeen') { router.replace('/portal'); return; }
    // A workspace route with no engagement open has nothing to show.
    if (variant === 'workspace' && !engagement) router.replace('/engagements');
  }, [ready, session, variant, router, engagement]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs text-onyx-40">Loading…</span>
      </div>
    );
  }

  const previewing = variant === 'portal' && session.role === 'aberdeen';
  const pending = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — Aberdeen Blue, white logo */}
      <header className="bg-aberdeen text-white shrink-0">
        <div className="flex items-center gap-5 px-5 h-14">
          <Link href={variant === 'workspace' ? '/workspace' : '/portal'} className="flex items-center gap-3 shrink-0">
            <Image src="/aberdeen-icon-white.svg" alt="" width={26} height={18} />
            <span className="text-lg font-extralight tracking-tight" style={{ fontWeight: 200 }}>Conductor</span>
          </Link>

          <span className="h-5 w-px bg-white/25" />

          <div className="min-w-0 flex items-center gap-2.5 text-[13px]">
            <span className="text-white font-medium truncate">{engagement?.clientName ?? ENGAGEMENT.clientName}</span>
            <span className="text-white/45">·</span>
            <span className="text-white/75 truncate hidden md:inline">
              {engagement ? engagement.label.replace(`${engagement.clientName} — `, '') : ENGAGEMENT.name}
            </span>
            {engagement && (
              <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-2xs ${
                mode === 'demo' ? 'bg-verdigris text-aberdeen' : 'bg-white/15 text-white border border-white/25'
              }`}>
                {mode === 'demo' ? 'Completed demo' : 'New engagement'}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-sm border border-verdigris/50 bg-verdigris/15 px-2 py-0.5 text-2xs text-white">
              Phase · {ENGAGEMENT.phase.replace(/_/g, ' ')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/25 px-2 py-0.5 text-2xs text-white/90">
              Published v{currentPublication?.version ?? 0}
            </span>
            {variant === 'workspace' && hasUnpublishedChanges && (
              <Link href="/workspace/publish" className="inline-flex items-center gap-1.5 rounded-sm bg-gold px-2 py-0.5 text-2xs font-medium text-aberdeen">
                {unpublishedCount} unpublished
              </Link>
            )}
            {variant === 'workspace' && pending > 0 && (
              <Link href="/workspace/feedback" className="inline-flex items-center gap-1.5 rounded-sm bg-verdigris px-2 py-0.5 text-2xs font-medium text-aberdeen">
                {pending} to review
              </Link>
            )}

            <div className="relative">
              <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/10">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-verdigris text-aberdeen text-2xs font-semibold">
                  {session.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-xs text-white">{session.name}</span>
                  <span className="block text-2xs text-white/60">{session.role === 'aberdeen' ? 'Aberdeen' : 'Client'}</span>
                </span>
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-64 rounded border border-onyx-20 bg-white shadow-pop py-1.5 text-onyx">
                    <div className="px-3 py-2 border-b border-onyx-10">
                      <div className="text-[13px] text-aberdeen font-medium">{session.name}</div>
                      <div className="text-2xs text-onyx-60">{session.title}</div>
                      <div className="text-2xs text-onyx-40 mt-0.5">{session.email}</div>
                    </div>
                    <div className="px-3 py-2 border-b border-onyx-10">
                      <div className="text-2xs uppercase tracking-wide text-onyx-40 mb-1.5">Demo controls</div>
                      <button
                        onClick={() => { closeEngagement(); setMenu(false); router.push('/engagements'); }}
                        className="w-full text-left text-[13px] px-2 py-1.5 rounded hover:bg-aberdeen-50"
                      >
                        Switch engagement
                      </button>
                      <button
                        onClick={() => { const to = session.role === 'aberdeen' ? 'client' : 'aberdeen'; switchRole(to); setMenu(false); router.push(to === 'aberdeen' ? '/workspace' : '/portal'); }}
                        className="w-full text-left text-[13px] px-2 py-1.5 rounded hover:bg-aberdeen-50"
                      >
                        Switch to {session.role === 'aberdeen' ? 'Client' : 'Aberdeen'} view
                      </button>
                      <button
                        onClick={() => { if (confirm('Reset all demo data to its seeded state?')) { resetDemo(); setMenu(false); router.push('/login'); } }}
                        className="w-full text-left text-[13px] px-2 py-1.5 rounded hover:bg-aberdeen-50"
                      >
                        Reset all data
                      </button>
                    </div>
                    <button
                      onClick={() => { signOut(); router.push('/login'); }}
                      className="w-full text-left text-[13px] px-5 py-2 hover:bg-aberdeen-50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-verdigris" />
      </header>

      {previewing && (
        <div className="bg-gold-tint border-b border-gold/50 px-5 py-2 flex items-center justify-between gap-4">
          <span className="text-[13px] text-onyx">
            <strong className="font-medium">Previewing the client experience.</strong>{' '}
            You are signed in as Aberdeen — this is exactly what {engagement?.clientName ?? 'the client'} sees.
          </span>
          <Button size="sm" onClick={() => router.push('/workspace')}>Back to workspace</Button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <nav className="w-56 shrink-0 border-r border-onyx-20 bg-white py-4 hidden md:block">
          <p className="px-5 text-2xs uppercase tracking-wide text-onyx-40 mb-2">
            {variant === 'workspace' ? 'Aberdeen workspace' : 'Client portal'}
          </p>
          <ul>
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`flex items-center justify-between gap-2 px-5 py-2 text-[13px] border-l-2 transition-colors ${
                      active
                        ? 'border-verdigris bg-aberdeen-50 text-aberdeen font-medium'
                        : 'border-transparent text-onyx hover:bg-onyx-5 hover:text-aberdeen'
                    }`}
                  >
                    {n.label}
                    {n.badge ? <Badge tone="accent">{n.badge}</Badge> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 mx-5 pt-4 border-t border-onyx-10">
            <p className="text-2xs text-onyx-40 leading-relaxed">
              Prototype · no backend. State is held in this browser.
            </p>
          </div>
        </nav>

        <main className="flex-1 min-w-0 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-extralight text-aberdeen leading-tight" style={{ fontWeight: 200 }}>{title}</h1>
        {subtitle && <p className="text-[13px] text-onyx-60 mt-1.5 max-w-3xl leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
