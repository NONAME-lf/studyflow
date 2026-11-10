import { Wordmark } from '@/components/common';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Wordmark className="text-xl [&_rect]:fill-white [&_path]:stroke-ink" />
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight font-bold">
            Один екран — усі дедлайни групи.
          </p>
          <p className="mt-4 text-lg text-white/75">
            Староста додає дедлайн один раз, і він з’являється в календарі кожного. Кожен відмічає
            виконання сам, а група бачить, скільки вже готово.
          </p>
        </div>
        <p className="text-sm text-white/60">
          КНУ імені Тараса Шевченка, факультет комп’ютерних наук та кібернетики
        </p>
      </section>
      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
