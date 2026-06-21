// [File: src/app/layout.tsx]
// [BLOCK: Root Layout]
// Sets the global dark background and base font for the entire app.

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Castle Party',
  description: 'The party isn\'t over until the sun comes up.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}