'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/store';

export default function Home() {
  const { session, ready } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace('/login');
    else router.replace(session.role === 'aberdeen' ? '/workspace' : '/portal');
  }, [session, ready, router]);
  return null;
}
