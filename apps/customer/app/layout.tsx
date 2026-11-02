import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NetOrbit Customer Portal',
  description: 'ISP Self-Service Subscriber Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
