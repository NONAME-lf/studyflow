import { redirect } from 'next/navigation';

// proxy.ts redirects "/" before rendering; this is a fallback.
export default function Home() {
  redirect('/dashboard');
}
