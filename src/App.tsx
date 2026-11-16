import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { PaymentModal } from './components/PaymentModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { HomePage } from './pages/HomePage';
import { NotesPage } from './pages/NotesPage';
import { TestSeriesPage } from './pages/TestSeriesPage';
import { ForumPage } from './pages/ForumPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ContactPage } from './pages/ContactPage';
import { PageRoute } from './types';

const AppShell: React.FC = () => {
  const { route, toast, isOnline } = useApp();
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const renderPage = () => {
    switch (route) {
      case PageRoute.NOTES:
        return <NotesPage />;
      case PageRoute.TESTS:
        return <TestSeriesPage />;
      case PageRoute.FORUM:
        return <ForumPage />;
      case PageRoute.DASHBOARD:
        return <StudentDashboardPage />;
      case PageRoute.ADMIN:
        return <AdminDashboardPage />;
      case PageRoute.CONTACT:
        return <ContactPage />;
      case PageRoute.HOME:
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar />
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 px-4 py-2 text-xs text-center text-amber-900 dark:text-amber-200 no-print">
          Offline Mode — Reading Saved Study Material Without Internet
        </div>
      )}

      <main className="flex-1">{renderPage()}</main>

      <Footer />
      <WhatsAppFloatingButton />
      <PaymentModal />
      <GoogleAuthModal />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-16 sm:bottom-5 left-4 z-50 max-w-sm px-4 py-3 rounded-xl border shadow-lg text-xs sm:text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
              : toast.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
