import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AeroLang Lexical Analyzer | Interactive IDE & Visualizer',
  description: 'Interactive Next.js IDE and Lexical Analyzer for AeroLang source code with real-time tokenization, diagnostics, and token inspection.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
