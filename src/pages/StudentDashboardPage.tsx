import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Download,
  GraduationCap,
  LogOut,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { downloadCertificatePng } from '../lib/certificateGenerator';
import { PageRoute, StudentPrivateInfo, StudentPublicProfile } from '../types';

export const StudentDashboardPage: React.FC = () => {
  const {
    user,
    userProfile,
    userPrivateInfo,
    enrollments,
    payments,
    testAttempts,
    certificates,
    courses,
    offlineNoteIds,
    notifications,
    pushPermission,
    requestPushPermission,
    signIn,
    signInWithRedirectFlow,
    signInWithGoogleAccount,
    setGoogleAuthModalOpen,
    signInLocally,
    updateLocalProfile,
    signOut,
    setRoute,
    setActivePaymentCourse,
    showToast,
  } = useApp();

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [className, setClassName] = useState<'11th' | '12th'>('12th');
  const [board, setBoard] = useState<'BSEB' | 'CBSE'>('BSEB');
  const [phone, setPhone] = useState('');
  const [villageOrAddress, setVillageOrAddress] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Student Direct Google Sign-in Form State
  const [guestName, setGuestName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [guestClass, setGuestClass] = useState<'11th' | '12th'>('12th');
  const [guestBoard, setGuestBoard] = useState<'BSEB' | 'CBSE'>('BSEB');
  const [guestPhone, setGuestPhone] = useState('');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || user?.displayName || '');
      setClassName(userProfile.className || '12th');
      setBoard(userProfile.board || 'BSEB');
    } else if (user) {
      setDisplayName(user.displayName || '');
    }
    if (userPrivateInfo) {
      setPhone(userPrivateInfo.phone || '');
      setVillageOrAddress(userPrivateInfo.villageOrAddress || '');
      setRollNumber(userPrivateInfo.rollNumber || '');
    }
  }, [user, userProfile, userPrivateInfo]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updatedProfile: StudentPublicProfile = {
        uid: user.uid,
        displayName: (displayName.trim() || 'Student').slice(0, 100),
        className,
        board,
        preferredTheme: userProfile?.preferredTheme || 'light',
        bookmarkedNoteIds: userProfile?.bookmarkedNoteIds || [],
        completedNoteIds: userProfile?.completedNoteIds || [],
      };
      const updatedPrivate: StudentPrivateInfo = {
        userId: user.uid,
        email: user.email || '',
        phone: phone.trim().slice(0, 30),
        villageOrAddress: villageOrAddress.trim().slice(0, 240),
        rollNumber: rollNumber.trim().slice(0, 40),
      };

      updateLocalProfile(updatedProfile, updatedPrivate);

      if (!user.isLocal && user.emailVerified) {
        try {
          if (userProfile) {
            await updateDoc(doc(db, 'users', user.uid), {
              displayName: updatedProfile.displayName,
              className,
              board,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, 'users', user.uid), {
              ...updatedProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await setDoc(
            doc(db, 'users', user.uid, 'private', 'info'),
            {
              ...updatedPrivate,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (cloudErr) {
          console.warn('Could not sync profile to cloud, saved locally:', cloudErr);
        }
      }

      showToast('Student profile saved successfully!', 'success');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDirectGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = guestName.trim();
    const cleanEmail = studentEmail.trim().toLowerCase();
    if (!cleanName) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showToast('Please enter a valid Google / Gmail address.', 'error');
      return;
    }
    signInWithGoogleAccount({
      name: cleanName,
      email: cleanEmail,
      className: guestClass,
      board: guestBoard,
      phone: guestPhone.trim() || undefined,
    });
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-[#0F2942] dark:text-amber-400">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Student Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign in with your Google / Gmail account to access test series, notes, and certificates.
          </p>
        </div>

        {/* Student Sign-Up & Sign-In Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Student Sign-Up with Gmail</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your details to create or access your student profile:
            </p>
          </div>

          <form onSubmit={handleDirectGoogleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Md Sartaj Alam"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google / Gmail Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. sartaj@gmail.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your test scores &amp; merit certificates will be linked to this Gmail.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class
                </label>
                <select
                  value={guestClass}
                  onChange={(e) => setGuestClass(e.target.value as '11th' | '12th')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="12th">Class 12th I.Sc.</option>
                  <option value="11th">Class 11th I.Sc.</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Board
                </label>
                <select
                  value={guestBoard}
                  onChange={(e) => setGuestBoard(e.target.value as 'BSEB' | 'CBSE')}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="BSEB">BSEB (Bihar Board)</option>
                  <option value="CBSE">CBSE Board</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile / WhatsApp No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F2942] hover:bg-[#1a3d5f] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Continue with Google Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Feature Highlights */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>CBT Online Mock Tests</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Verified Certificates</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Physics &amp; Chemistry Notes</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Free Cloud Account</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avgScore =
    testAttempts.length > 0
      ? Math.round(
          (testAttempts.reduce((acc, a) => acc + a.percentage, 0) / testAttempts.length) * 10
        ) / 10
      : 0;

  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const availableCourses = courses.filter((c) => c.active && !enrolledIds.has(c.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Student Dashboard
            </p>
            {user.isLocal && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active Student Session
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Welcome, {userProfile?.displayName || user.displayName || 'Student'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user.email || 'Phenhara Campus'} · Class {className} · {board} Board
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Enrolled Batches</p>
          <p className="text-2xl font-bold font-mono text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums">
            {enrollments.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Mock Tests Taken</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {testAttempts.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Average Accuracy</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {avgScore}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Offline Notes Cached</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
            {offlineNoteIds.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Profile & Enrolled Batches */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Profile Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Class
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value as '11th' | '12th')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="12th">Class 12th</option>
                    <option value="11th">Class 11th</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Board
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value as 'BSEB' | 'CBSE')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="BSEB">BSEB (Bihar Board)</option>
                    <option value="CBSE">CBSE Board</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  WhatsApp Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Phenhara Roll Number / Batch ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. SCC-2026-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Village / Local Address
                </label>
                <input
                  type="text"
                  placeholder="Near H.F.H.S School, Phenhara"
                  value={villageOrAddress}
                  onChange={(e) => setVillageOrAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#1a3d5f] dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>

          {/* Enrolled Batches */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Enrolled Offline Batches</span>
            </h2>

            {enrollments.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                You have not registered for any coaching batches yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {enrollments.map((enr) => {
                  const course = courses.find((c) => c.id === enr.courseId);
                  return (
                    <div key={enr.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {enr.courseTitle}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{enr.status === 'active' ? 'Active' : 'Completed'}</span>
                        </span>
                      </div>
                      {course && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {course.schedule} · {course.faculty}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {availableCourses.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Explore other batches at Phenhara campus:
                </p>
                <div className="space-y-2">
                  {availableCourses.slice(0, 2).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{c.title}</p>
                        <p className="text-slate-500 dark:text-slate-400">{c.feeLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePaymentCourse(c)}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Verified Certificates & CBT Test Scores */}
        <div className="lg:col-span-7 space-y-6">
          {/* Certificates */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Verified Merit Certificates ({certificates.length})</span>
            </h2>

            {certificates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>Complete any certification mock test with &gt;= 50% score to unlock your official verified certificate.</p>
                <button
                  type="button"
                  onClick={() => setRoute(PageRoute.TESTS)}
                  className="font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Go to Mock Test Series &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300">
                        {cert.verificationCode}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {cert.courseTitle}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Awarded to {cert.studentName} with score of{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {cert.scorePercentage}%
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        downloadCertificatePng({
                          studentName: cert.studentName,
                          courseTitle: cert.courseTitle,
                          scorePercentage: cert.scorePercentage,
                          verificationCode: cert.verificationCode,
                          issuedDateLabel: new Date().toLocaleDateString('en-IN'),
                        })
                      }
                      className="mt-2 inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download HD Certificate</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fee Payment Receipts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tuition Fee Payment History</span>
            </h2>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No fee transactions recorded. Payments made at coaching counter or online will show here with verifiable transaction references.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2 pr-4">Batch Title</th>
                      <th className="py-2 pr-4">Reference</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {p.courseTitle}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {p.transactionRef}
                        </td>
                        <td className="py-2.5 pr-4 uppercase text-slate-600 dark:text-slate-300">
                          {p.method}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test Attempt Scores */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Recent Mock Test Scores</span>
              </h2>
              <button
                type="button"
                onClick={() => setRoute(PageRoute.TESTS)}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Take New Test &rarr;
              </button>
            </div>

            {testAttempts.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You haven&apos;t attempted any online mock tests yet. Tests simulate the latest BSEB and CBSE board exam patterns.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2 pr-4">Test</th>
                      <th className="py-2 pr-4">Subject</th>
                      <th className="py-2 pr-4 text-right">Score</th>
                      <th className="py-2 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {testAttempts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {a.testTitle}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{a.subject}</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                          {a.score}/{a.totalMarks} ({a.percentage}%)
                        </td>
                        <td className="py-2.5 text-right text-xs font-semibold">
                          <span
                            className={
                              a.passed
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }
                          >
                            {a.passed ? 'Passed' : 'Practice'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Exam & Assignment Deadlines */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Exam &amp; Assignment Alerts ({notifications.length})</span>
              </h2>
              {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={requestPushPermission}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Enable Push
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No upcoming exam or homework notices right now.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <div key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {n.category.toUpperCase()}
                      </span>
                      {n.dueDate && <span className="tabular-nums">{n.dueDate}</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
