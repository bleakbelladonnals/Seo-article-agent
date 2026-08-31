import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = 'https://lumaflow-ai-content-ops.holy-rabbit.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'LumaFlow AI — Lighting Hardware Content Operations Hub',
  description: 'A governed AI content operations workspace for export-oriented lighting-hardware OEM teams.',
  openGraph: {
    title: 'LumaFlow AI — Lighting Hardware Content Operations Hub',
    description: 'Product knowledge, five-agent workflow orchestration, factual/SEO/GEO/brand review, human approval and versioned assets.',
    type: 'website',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'LumaFlow AI Lighting Hardware Content Operations Hub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LumaFlow AI — Lighting Hardware Content Operations Hub',
    description: 'A governed AI content workflow for export-oriented lighting-hardware OEM teams.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
