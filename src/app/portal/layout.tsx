'use client';
import { Shell } from '@/components/Shell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell
      variant="portal"
      nav={[
        { href: '/portal', label: 'Overview' },
        { href: '/portal/current-state', label: 'Current State' },
        { href: '/portal/roadmap', label: 'Roadmap' },
        { href: '/portal/feedback', label: 'My Feedback' },
      ]}
    >
      {children}
    </Shell>
  );
}
