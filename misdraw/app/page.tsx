import { Suspense } from 'react';
import HomeClient from '@/components/home/HomeClient';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeClient />
    </Suspense>
  );
}
