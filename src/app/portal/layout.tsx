'use client';
import { useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { useStore } from '@/lib/store/store';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { engagement, engagements, openEngagement, ready } = useStore();
  // A client signs in to an engagement rather than choosing one. If none is open, fall back
  // to the most recently published engagement they have access to.
  useEffect(() => {
    if (!ready || engagement) return;
    const withPubs = Object.values(engagements).filter((e) => e.publications.length > 0);
    const target = withPubs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? Object.values(engagements)[0];
    if (target) openEngagement(target.id);
  }, [ready, engagement, engagements, openEngagement]);

  return (
    <Shell
      variant="portal"
      nav={[
        { href: '/portal', label: 'Overview' },
        { href: '/portal/current-state', label: 'Current State' },
        { href: '/portal/roadmap', label: 'Roadmap' },
        { href: '/portal/investment', label: 'Investment' },
        { href: '/portal/feedback', label: 'My Feedback' },
      ]}
    >
      {children}
    </Shell>
  );
}
