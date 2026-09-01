'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/LoginGate';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'ASHA') {
      router.replace('/asha-app');
    } else {
      router.replace('/dashboard');
    }
  }, [user, router]);

  return <div style={{ minHeight: '100vh', background: '#f4f7f9' }} />;
}
