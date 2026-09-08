import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIH26011 — Hyderabad 3D Building Viewer',
  description:
    'Interactive 3D visualization of building footprints around Durgam Cheruvu, HITEC City, Hyderabad. Built for Smart India Hackathon 2026.',
  keywords: ['SIH', '3D Buildings', 'Hyderabad', 'GIS', 'Three.js', 'Urban Planning'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
