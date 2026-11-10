import type { Metadata } from 'next';
import { Onest, Unbounded } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import './globals.css';

const onest = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-onest' });
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700'],
  variable: '--font-unbounded',
});

export const metadata: Metadata = {
  title: { default: 'StudyFlow', template: '%s — StudyFlow' },
  description: 'Планувальник навчальних дедлайнів для студентських груп',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="uk" className={cn('font-sans', onest.variable, unbounded.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
