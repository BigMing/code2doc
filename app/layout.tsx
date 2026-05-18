import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context';
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: 'Code2Doc — 代码需求文档智能生成器',
  description: '代码即文档 — 智能还原业务需求，生成标准化需求文档。',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="font-sans">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
