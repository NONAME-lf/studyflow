import { ApiStatus } from '@/components/api-status';

// Placeholder until the dashboard (P4).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 p-6">
      <h1 className="text-4xl font-bold">StudyFlow</h1>
      <p className="text-lg text-gray-600">Один екран — усі дедлайни групи.</p>
      <ApiStatus />
    </main>
  );
}
