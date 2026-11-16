import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Download,
  LogOut,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { downloadCertificatePng } from '../lib/certificateGenerator';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { PageRoute } from '../types';

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
    signOut,
    setRoute,
    setActivePaymentCourse,
    showToast,
  } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [className, setClassName] = useState<'11th' | '12th'>('12th');
  const [board, setBoard] = useState<'BSEB' | 'CBSE'>('BSEB');
  const [phone, setPhone] = useState('');
  const [villageOrAddress, setVillageOrAddress] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

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
    if (!user || !user.emailVerified) return;
    setSavingProfile(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: (displayName.trim() || 'Student').slice(0, 100),
          className,
          board,
          preferredTheme: userProfile?.preferredTheme || 'light',
          bookmarkedNoteIds: userProfile?.bookmarkedNoteIds || [],
          completedNoteIds: userProfile?.completedNoteIds || [],
          createdAt: userProfile?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, 'users', user.uid, 'private', 'info'),
        {
          userId: user.uid,
          email: user.email || '',
          phone: phone.trim().slice(0, 30),
          villageOrAddress: villageOrAddress.trim().slice(0, 240),
          rollNumber: rollNumber.trim().slice(0, 40),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      showToast('Student profile synced to cloud!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center space-y-5">
          <UserCheck className="w-10 h-10 mx-auto text-[#0F2942] dark:text-amber-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Student Portal &amp; Cloud Sync
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Sign in with your Google account to view your enrolled batches, pay tuition fees online, track mock test scores, and download verified certificates across all your devices.
          </p>
          <div className="pt-2 flex justify-center">
            <GoogleSignInButton onClick={() => signIn(false)} />
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
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Cloud-Synced Student Dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Welcome, {userProfile?.displayName || user.displayName || 'Student'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {user.email} · Class {className} · {board} Board
          </p>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 self-start cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
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
                    <option value="BSEB">B.S.E.B.</option>
                    <option value="CBSE">C.B.S.E.</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Coaching Roll No.
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Village / Town Address
                </label>
                <input
                  type="text"
                  value={villageOrAddress}
                  onChange={(e) => setVillageOrAddress(e.target.value)}
                  placeholder="Phenhara, East Champaran..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
            >
              {savingProfile ? 'Syncing Profile...' : 'Save & Sync Profile'}
            </button>
          </form>

          {/* Certificates */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>My Certificates ({certificates.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => setRoute(PageRoute.TESTS)}
                className="text-xs font-semibold text-[#0F2942] dark:text-amber-400 hover:underline cursor-pointer"
              >
                Earn via Tests
              </button>
            </div>

            {certificates.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pass any certification mock test in Test Series to unlock your downloadable Shad Concept Classes certificate.
              </p>
            ) : (
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {cert.courseTitle}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        Score: {cert.scorePercentage}% · ID: {cert.verificationCode}
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
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Enrolled Courses, Fee Receipts, Test Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#0F2942] dark:text-amber-400" />
                <span>Enrolled Courses &amp; Tuition Fees</span>
              </h2>
            </div>

            {enrollments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You haven’t enrolled in a batch yet. Choose an active batch below to pay tuition fees online.
              </p>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {enr.courseTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Status: {enr.status.toUpperCase()} · Fee {enr.feePaid ? 'Paid' : 'Pending'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}

            {availableCourses.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Available Batches for Online Fee Payment
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableCourses.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {c.feeLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePaymentCourse(c)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay &amp; Enroll</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fee Payment Receipts
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-2 pr-4">Batch</th>
                      <th className="py-2 pr-4">Mode</th>
                      <th className="py-2 pr-4">Reference</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {p.courseTitle}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{p.method}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {p.transactionRef}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Test Attempts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0F2942] dark:text-amber-400" />
                <span>Recent Test Performance</span>
              </h2>
              <button
                type="button"
                onClick={() => setRoute(PageRoute.TESTS)}
                className="text-xs font-semibold text-[#0F2942] dark:text-amber-400 hover:underline cursor-pointer"
              >
                Take Another Test
              </button>
            </div>

            {testAttempts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No test attempts recorded yet. Take a mock test to track your progress here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
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
