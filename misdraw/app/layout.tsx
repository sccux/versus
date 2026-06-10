import type { Metadata } from 'next';
import { Inter, Patrick_Hand } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-patrick-hand',
});

export const metadata: Metadata = {
  title: 'misdraw',
  description: 'draw. deceive. survive.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${patrickHand.variable} bg-paper text-ink paper-noise`}>
        {children}
      </body>
    </html>
  );
}
