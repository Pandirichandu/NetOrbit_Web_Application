import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NetOrbit Hotspot Captive Portal',
  description: 'Enterprise ISP Hotspot Authentication Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        {children}
      </body>
    </html>
  );
}
