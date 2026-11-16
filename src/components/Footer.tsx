import React from 'react';
import { MapPin, Phone, Youtube, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageRoute } from '../types';
import { SccLogo } from './SccLogo';

export const Footer: React.FC = () => {
  const { setRoute, isAdmin } = useApp();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="inline-flex flex-col items-center gap-1">
            <SccLogo className="h-8 w-auto text-[#0A2E8A] dark:text-white" />
            <h3 className="text-sm font-bold text-[#0F2942] dark:text-white leading-tight">
              Shad Concept Classes
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
            Phenhara Block’s trusted I.Sc. coaching institute since 2010 for B.S.E.B. &amp; C.B.S.E. Class 11th and 12th Science. सही मार्गदर्शन · बेहतर परिणाम · हमारा संकल्प, आपकी सफलता।
          </p>
          <div className="flex items-start gap-2 text-sm pt-1">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Near H.F.H.S School Phenhara, East Champaran, Bihar</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm pt-1">
            <a href="tel:+919525206317" className="inline-flex items-center gap-1.5 hover:text-[#0F2942] dark:hover:text-white tabular-nums">
              <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Er. M.N. Alam (Phy, Chem, Math): +91 9525206317
            </a>
            <a href="tel:+918521736717" className="inline-flex items-center gap-1.5 hover:text-[#0F2942] dark:hover:text-white tabular-nums">
              <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Md Ejaz Alam (Bio): +91 8521736717
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Home & Batches', r: PageRoute.HOME },
              { label: 'Offline Notes Library', r: PageRoute.NOTES },
              { label: 'Online Test Series', r: PageRoute.TESTS },
              { label: 'Teacher Doubt Forum', r: PageRoute.FORUM },
              { label: 'Student Portal', r: PageRoute.DASHBOARD },
              { label: 'Contact & Campus Map', r: PageRoute.CONTACT },
            ].map((item) => (
              <li key={item.r}>
                <button
                  type="button"
                  onClick={() => setRoute(item.r)}
                  className="hover:text-[#0F2942] dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Connect &amp; Community
          </h4>
          <div className="flex flex-col space-y-2.5 text-sm">
            <a
              href="https://wa.me/919525206317?text=Hello%20Shad%20Concept%20Classes%2C%20I%20need%20admission%20and%20batch%20details."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Doubt Desk
            </a>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Youtube className="w-4 h-4" />
              YouTube Lectures
            </a>
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Facebook className="w-4 h-4" />
              Facebook Updates
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
            >
              <Instagram className="w-4 h-4" />
              Instagram Campus Feed
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Shad Concept Classes, Phenhara (East Champaran). Estd. 2010.</p>
          <p>B.S.E.B. &amp; C.B.S.E. I.Sc. Portal · Offline Study Ready</p>
        </div>
      </div>
    </footer>
  );
};
