import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, MessageCircle, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HERO_IMAGE_PATH, POSTER_IMAGE_PATH, TOPPERS_2024 } from '../data/seedData';
import { PageRoute } from '../types';
import { CampusLocationMap } from '../components/CampusLocationMap';

export const HomePage: React.FC = () => {
  const { courses, setRoute, setActivePaymentCourse, enrollments } = useApp();

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Atmospheric Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE_PATH}
            alt="Shad Concept Classes classroom lecture hall"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/35" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <h1
              className="font-bold tracking-tight text-white leading-[1.12]"
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.75rem)',
                textWrap: 'balance',
              }}
            >
              Concept-First I.Sc. Coaching for Class 11th &amp; 12th Science
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-xl leading-relaxed">
              Phenhara Block’s premier Intermediate Science institute. Access chapter-wise offline PDF notes, live online mock test series, and direct doubt mentorship from Er. M.N. Alam (Physics, Chemistry &amp; Math) and Md Ejaz Alam (Biology).
            </p>
          </div>
        </div>
      </section>

      {/* 2. 4-Column Proof Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: '16+ Years', label: 'Teaching Legacy Since 2010' },
            { value: '422 / 500', label: '2024 Top I.Sc. Board Score' },
            { value: 'Offline Ready', label: 'Save PDF Notes Without Internet' },
            { value: 'BSEB & CBSE', label: 'Bilingual Physics, Chem, Math & Bio' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#0F2942] dark:text-amber-400 tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Course & Batch Showcase */}
      <section id="batches-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Active Batches &amp; Fee Structure
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRoute(PageRoute.NOTES)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2942] dark:text-amber-400 hover:underline cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Browse Free Study Notes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses
            .filter((c) => c.active)
            .map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              return (
                <article
                  key={course.id}
                  className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    {course.imageUrl ? (
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F2942] to-slate-800 text-white p-6 text-center">
                        <GraduationCap className="w-10 h-10 opacity-80" />
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {course.board} · {course.className} · {course.startDate}
                      </p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {course.description}
                      </p>
                      <div className="pt-1 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <p>
                          <strong className="text-slate-800 dark:text-slate-200">Subjects:</strong>{' '}
                          {course.subjects.join(', ')}
                        </p>
                        <p>
                          <strong className="text-slate-800 dark:text-slate-200">Timing:</strong>{' '}
                          {course.schedule}
                        </p>
                        <p>
                          <strong className="text-slate-800 dark:text-slate-200">Mentors:</strong>{' '}
                          {course.faculty}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Batch Fee</p>
                        <p className="text-base font-bold font-mono text-[#0F2942] dark:text-amber-400 tabular-nums">
                          {course.feeLabel}
                        </p>
                      </div>
                      {isEnrolled ? (
                        <button
                          type="button"
                          onClick={() => setRoute(PageRoute.DASHBOARD)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-[0.98] transition-all duration-200"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enrolled</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActivePaymentCourse(course)}
                          className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Enroll &amp; Pay Fees
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {/* 4. Intermediate Result 2024 & Faculty Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              <img
                src={POSTER_IMAGE_PATH}
                alt="Shad Concept Classes Intermediate Result 2024 Toppers Poster"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Intermediate Result 2024 Honour Roll
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Consistent first-division and distinction marks year after year under direct mentorship of Er. M.N. Alam (Physics, Chemistry &amp; Math) and Md Ejaz Alam (Biology).
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Rank</th>
                    <th className="py-2.5 px-4 font-semibold">Student Name</th>
                    <th className="py-2.5 px-4 font-semibold">Stream</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {TOPPERS_2024.map((t, index) => (
                    <tr key={t.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        #{String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {t.name}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {t.stream}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F2942] dark:text-amber-400 tabular-nums">
                        {t.marks} / {t.outOf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Physics, Chemistry &amp; Mathematics
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Er. M.N. Alam
                </p>
                <a
                  href="tel:+919525206317"
                  className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>9525206317</span>
                </a>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Biology (Class 11th &amp; 12th)
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Md Ejaz Alam
                </p>
                <a
                  href="tel:+918521736717"
                  className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>8521736717</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Real Interactive Campus Location Map */}
      <section id="campus-location" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Near H.F.H.S School Phenhara, East Champaran
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Enter your village or town below or use GPS to view live directions right to the coaching campus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setRoute(PageRoute.CONTACT)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>Admission Query Form</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://wa.me/919525206317?text=Namaste%20Sir%2C%20please%20share%20coaching%20timings%20and%20location%20landmark."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Help</span>
            </a>
          </div>
        </div>

        <CampusLocationMap heightClassName="h-[400px] sm:h-[440px]" />
      </section>
    </div>
  );
};
