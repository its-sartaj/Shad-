import React, { useState } from 'react';
import { GraduationCap, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageRoute } from '../types';
import { SccLogo } from './SccLogo';

const NAV_ITEMS: { label: string; route: PageRoute }[] = [
  { label: 'Home', route: PageRoute.HOME },
  { label: 'Notes', route: PageRoute.NOTES },
  { label: 'Test Series', route: PageRoute.TESTS },
  { label: 'Doubt Forum', route: PageRoute.FORUM },
  { label: 'Contact Us', route: PageRoute.CONTACT },
];

export const Navbar: React.FC = () => {
  const {
    route,
    setRoute,
    user,
    isAdmin,
    theme,
    toggleTheme,
  } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (r: PageRoute) => {
    setRoute(r);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[74px] sm:h-[78px] flex items-center justify-between gap-6 lg:gap-8">
        {/* Zone 1: Borderless SCC Logo stacked cleanly over Shad Concept Classes */}
        <button
          type="button"
          onClick={() => handleNav(PageRoute.HOME)}
          className="group flex flex-col items-center justify-center gap-1 py-1 rounded-lg shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          aria-label="Shad Concept Classes Home"
        >
          <SccLogo className="h-[26px] sm:h-[30px] w-auto text-[#0A2E8A] dark:text-white transition-transform duration-200 group-hover:scale-[1.03]" />
          <span className="font-display text-[11.5px] sm:text-[12.5px] font-bold tracking-[0.01em] text-[#0F2942] dark:text-slate-100 leading-none whitespace-nowrap">
            Shad Concept Classes
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation links with refined active underline */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`group relative py-2.5 text-[14px] font-semibold tracking-tight whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0F2942] dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0F2942] dark:hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 bottom-0 h-[2px] rounded-full transition-all duration-200 ${
                    active
                      ? 'bg-[#0F2942] dark:bg-amber-400 opacity-100'
                      : 'bg-slate-300 dark:bg-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Borderless utility icon trigger + Single Primary Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Late-Night Study Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-[#0F2942] dark:hover:text-white transition-all duration-300 hover:rotate-12 active:scale-95 cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode for night study'}
            title={theme === 'dark' ? 'Day Mode' : 'Night Study Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-[18px] h-[18px] text-amber-400 transition-transform duration-300" />
            ) : (
              <Moon className="w-[18px] h-[18px] transition-transform duration-300" />
            )}
          </button>

          <span
            aria-hidden="true"
            className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1"
          />

          {/* Primary Student Portal CTA */}
          <button
            type="button"
            onClick={() => handleNav(PageRoute.DASHBOARD)}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0F2942] text-white hover:bg-[#163a5c] dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{user ? 'Student Portal' : 'Student Login'}</span>
          </button>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-3 space-y-1 shadow-lg animate-fadeIn">
          {NAV_ITEMS.map((item) => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`block w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#0F2942]/8 dark:bg-slate-900 text-[#0F2942] dark:text-amber-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button
              type="button"
              onClick={() => handleNav(PageRoute.DASHBOARD)}
              className="w-full py-2.5 px-4 min-h-[44px] rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold text-center"
            >
              {user ? 'Student Portal' : 'Student Login'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
