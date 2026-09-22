import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIH26011 — 3D Cadastre & Digital Twin Platform',
  description:
    'Interactive 3D visualization of building footprints, 3D cadastral ULPIN parcels, solar clean energy potential, and flood risk simulation. Built for Smart India Hackathon 2026.',
  keywords: ['SIH', '3D Buildings', 'Digital Twin', 'Cadastre', 'ULPIN', 'GIS', 'Three.js', 'Urban Planning'],
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
