'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStore } from '@/lib/store/store';
import { DEMO_ACCOUNTS, ENGAGEMENT } from '@/data/seed';
import { Button, inputCls } from '@/components/ui';

export default function LoginPage() {
  const { signIn, session, ready } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(session.role === 'aberdeen' ? '/engagements' : '/portal');
  }, [ready, session, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = signIn(email, password);
    if (!r.ok) {
      setError(r.error ?? 'Sign-in failed.');
      setBusy(false);
      return;
    }
    const acct = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    router.replace(acct?.role === 'aberdeen' ? '/engagements' : '/portal');
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — Aberdeen Blue with the Verdigris diagonal, white logo */}
      <section className="relative hidden lg:flex flex-col justify-between bg-aberdeen p-12 overflow-hidden">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
          <polygon points="100,0 100,42 0,100 0,66" fill="#44B0B1" opacity="0.16" />
          <polygon points="100,52 100,100 42,100" fill="#44B0B1" opacity="0.10" />
        </svg>

        <div className="relative">
          <h1 className="text-white text-5xl font-extralight tracking-tight" style={{ fontWeight: 200 }}>
            Conductor
          </h1>
          <div className="h-1 w-16 bg-verdigris mt-5" />
          <p className="text-white/80 text-sm mt-6 max-w-md leading-relaxed">
            One transformation model — from evidence, through maturity and prioritisation,
            to the roadmap and the decisions it asks of the Board.
          </p>
        </div>

        <div className="relative space-y-6">
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              ['Calculated', 'Priority and sequencing are computed, never typed'],
              ['Evidenced', 'Every recommendation traces to its source'],
              ['Governed', 'Aberdeen controls what the client sees'],
            ].map(([h, b]) => (
              <div key={h} className="border-t border-verdigris/40 pt-3">
                <div className="text-verdigris text-xs font-medium">{h}</div>
                <div className="text-white/70 text-2xs mt-1 leading-relaxed">{b}</div>
              </div>
            ))}
          </div>
          <Image src="/aberdeen-logo-white.svg" alt="Aberdeen Advisors" width={190} height={43} className="opacity-95" priority />
        </div>
      </section>

      {/* Sign-in */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Image src="/aberdeen-logo-blue.svg" alt="Aberdeen Advisors" width={170} height={38} priority />
            <h1 className="text-3xl font-extralight text-aberdeen mt-5" style={{ fontWeight: 200 }}>Conductor</h1>
          </div>

          <h2 className="text-xl font-light text-aberdeen">Sign in</h2>
          <p className="text-xs text-onyx-60 mt-1.5">
            {ENGAGEMENT.clientName} · {ENGAGEMENT.name}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-aberdeen mb-1.5">Email address</span>
              <input
                type="email" required autoComplete="username" className={inputCls}
                value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="name@company.com"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-aberdeen mb-1.5">Password</span>
              <input
                type="password" required autoComplete="current-password" className={inputCls}
                value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="text-xs text-onyx bg-jasper-tint border border-jasper/40 rounded px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" className="w-full py-2.5" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-9 border-t border-onyx-10 pt-5">
            <p className="text-2xs uppercase tracking-wide text-onyx-60 mb-3">Demonstration accounts</p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email} type="button"
                  onClick={() => { setEmail(a.email); setPassword(a.password); setError(null); }}
                  className="w-full text-left rounded border border-onyx-20 hover:border-verdigris hover:bg-verdigris-50 transition-colors px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] text-aberdeen font-medium truncate">{a.name}</div>
                      <div className="text-2xs text-onyx-60 truncate">{a.title} · {a.organisation}</div>
                    </div>
                    <span className={`text-2xs px-1.5 py-0.5 rounded-sm border shrink-0 ${
                      a.role === 'aberdeen' ? 'bg-aberdeen text-white border-aberdeen' : 'bg-onyx-5 text-onyx-60 border-onyx-20'
                    }`}>
                      {a.role === 'aberdeen' ? 'Aberdeen' : 'Client'}
                    </span>
                  </div>
                  <div className="text-2xs text-onyx-40 mt-1.5 font-mono">{a.email} · {a.password}</div>
                </button>
              ))}
            </div>
            <p className="text-2xs text-onyx-40 mt-4 leading-relaxed">
              Prototype credentials. This is a demonstration gate, not production authentication —
              real authorisation is enforced server-side in the specification.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
