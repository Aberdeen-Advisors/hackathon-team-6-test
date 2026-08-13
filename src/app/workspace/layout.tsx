'use client';
import { Shell } from '@/components/Shell';
import { useStore } from '@/lib/store/store';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { submissions } = useStore();
  const pending = submissions.filter((s) => s.status === 'pending').length;
  return (
    <Shell
      variant="workspace"
      nav={[
        { href: '/workspace', label: 'Overview' },
        { href: '/workspace/kickoff', label: 'Kickoff' },
        { href: '/workspace/sources', label: 'Sources' },
        { href: '/workspace/opportunities', label: 'Opportunities' },
        { href: '/workspace/current-state', label: 'Current State' },
        { href: '/workspace/roadmap', label: 'Roadmap' },
        { href: '/workspace/financials', label: 'Financials' },
        { href: '/workspace/publish', label: 'Publish' },
        { href: '/workspace/feedback', label: 'Client Feedback', badge: pending || undefined },
      ]}
    >
      {children}
    </Shell>
  );
}
