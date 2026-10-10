import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNav } from '@/components/MobileNav';
import { ToastContainer } from '@/components/ToastContainer';
import { AgentRunModal } from '@/components/AgentRunModal';

export const metadata: Metadata = {
  title: 'Kaveri Desk — Agentic Supply Chain Assistant',
  description: 'Autonomous AI Decision Agent for Kaveri Spares & Hydraulics across North Karnataka',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-surface-50 text-slate-900 font-sans">
        <AppProvider>
          <AppHeader />
          <div className="flex-1 flex overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
              {children}
            </main>
          </div>
          <MobileNav />
          <ToastContainer />
          <AgentRunModal />
        </AppProvider>
      </body>
    </html>
  );
}
