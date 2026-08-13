'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/store';
import { Card, Button, Badge } from '@/components/ui';

/**
 * Purposeful empty state for a blank engagement. Every one states what is missing, why it
 * matters, and the single action that fills it — and offers a look at the same section in
 * the completed demonstration without copying any of its data.
 */
export function BlankState({
  what, whyItMatters, action, href, secondary, demoSection,
}: {
  what: string;
  whyItMatters: string;
  action: string;
  href: string;
  secondary?: { label: string; href: string };
  demoSection?: string;
}) {
  const { openEngagement, engagements } = useStore();
  const router = useRouter();
  const hasDemo = !!engagements['ENG-DEMO'];

  return (
    <Card>
      <div className="max-w-2xl mx-auto text-center py-10 px-4">
        <Badge tone="neutral">Nothing here yet</Badge>
        <h3 className="text-lg font-light text-aberdeen mt-3">{what}</h3>
        <p className="text-[13px] text-onyx-60 mt-2.5 leading-relaxed">{whyItMatters}</p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <Link href={href}><Button variant="primary" size="sm">{action}</Button></Link>
          {secondary && <Link href={secondary.href}><Button size="sm">{secondary.label}</Button></Link>}
        </div>

        {hasDemo && demoSection && (
          <button
            onClick={() => { openEngagement('ENG-DEMO'); router.push(demoSection); }}
            className="mt-6 text-2xs text-onyx-60 hover:text-aberdeen underline decoration-dotted"
          >
            See what this looks like in the completed demonstration
          </button>
        )}
        {hasDemo && demoSection && (
          <p className="text-2xs text-onyx-40 mt-1.5">Opens the demo engagement. Nothing is copied into this one.</p>
        )}
      </div>
    </Card>
  );
}
