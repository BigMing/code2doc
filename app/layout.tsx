import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Geist } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/context';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Code2Doc — 代码需求文档智能生成器',
  description: '代码即文档 — 智能还原业务需求，生成标准化需求文档。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn(jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
