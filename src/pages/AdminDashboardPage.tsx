import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BellPlus,
  BookPlus,
  Database,
  Download,
  FilePlus2,
  FileSpreadsheet,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  DEFAULT_COURSE_IMAGE,
  INITIAL_COURSES,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TESTS,
} from '../data/seedData';
import {
  createGoogleFormQuiz,
  fetchGoogleFormResponses,
  GoogleFormResponseItem,
} from '../lib/googleForms';
import { Course, MockTest, NotificationAlert, PageRoute, StudyNote, TestQuestion } from '../types';

type AdminTab = 'courses' | 'notes' | 'tests' | 'analytics' | 'alerts';

export const AdminDashboardPage: React.FC = () => {
  const {
    user,
    isAdmin,
    authDomainError,
    accessToken,
    signIn,
    signInWithRedirectFlow,
    signInLocally,
    courses,
    setCourses,
    notes,
    setNotes,
    tests,
    setTests,
    notifications,
    setNotifications,
    allAttemptsForAdmin,
    allInquiriesForAdmin,
    allEnrollmentsForAdmin,
    setRoute,
    signOut,
    showToast,
  } = useApp();

  const [tab, setTab] = useState<AdminTab>('courses');
  const [seeding, setSeeding] = useState(false);
  const [adminUsername, setAdminUsername] = useState('Shad Concept class');
  const [adminPassword, setAdminPassword] = useState('');

  const handleDirectorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = adminUsername.trim();
    const clean = adminPassword.trim();
    const isUserValid =
      u.toLowerCase() === 'shad concept class' ||
      u.toLowerCase() === 'shad' ||
      u.toLowerCase() === 'admin' ||
      u.toLowerCase() === 'er. m.n. alam';
    const isPassValid =
      clean === 'Shad' ||
      clean.toLowerCase() === 'shad' ||
      clean === 'alam@2026' ||
      clean === 'scc@admin' ||
      clean === '845436';

    if (isUserValid && isPassValid) {
      signInLocally({
        name: u || 'Shad Concept class',
        className: '12th',
        board: 'BSEB',
        email: 'apextech.servicess@gmail.com',
        role: 'admin',
      });
      showToast('Admin login successful! Welcome Shad Concept class.', 'success');
    } else {
      showToast('Invalid credentials. Username: "Shad Concept class" & Password: "Shad"', 'error');
    }
  };

  // Course Form
  const [cTitle, setCTitle] = useState('');
  const [cBoard, setCBoard] = useState<Course['board']>('BSEB & CBSE');
  const [cClass, setCClass] = useState<Course['className']>('12th I.Sc.');
  const [cSchedule, setCSchedule] = useState('Morning 7:00 AM – 10:00 AM');
  const [cStartDate, setCStartDate] = useState('1 December');
  const [cFee, setCFee] = useState('7500');
  const [cDesc, setCDesc] = useState('');

  // Note & PDF Upload Form
  const [nTitle, setNTitle] = useState('');
  const [nSubject, setNSubject] = useState<StudyNote['subject']>('Physics');
  const [nClass, setNClass] = useState<StudyNote['className']>('12th');
  const [nBoard, setNBoard] = useState<StudyNote['board']>('Both');
  const [nChapter, setNChapter] = useState('');
  const [nSummary, setNSummary] = useState('');
  const [nPdfUrl, setNPdfUrl] = useState('');
  const [nFileName, setNFileName] = useState('');
  const [nFileSize, setNFileSize] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Test Builder Form
  const [tTitle, setTTitle] = useState('');
  const [tSubject, setTSubject] = useState<MockTest['subject']>('Physics');
  const [tClass, setTClass] = useState<MockTest['className']>('12th');
  const [tDuration, setTDuration] = useState('20');
  const [tCert, setTCert] = useState(true);
  const [tQuestions, setTQuestions] = useState<TestQuestion[]>([
    {
      id: 'q1',
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      marks: 4,
      explanation: '',
    },
  ]);

  // Google Forms state
  const [gfLoading, setGfLoading] = useState(false);
  const [gfResponsesFormId, setGfResponsesFormId] = useState('');
  const [gfResponses, setGfResponses] = useState<GoogleFormResponseItem[]>([]);

  // Push Alert Form
  const [aTitle, setATitle] = useState('');
  const [aMessage, setAMessage] = useState('');
  const [aCategory, setACategory] = useState<NotificationAlert['category']>('exam');
  const [aDueDate, setADueDate] = useState('');

  const handleSeedCloud = async () => {
    if (!user || !isAdmin) return;
    setSeeding(true);
    try {
      for (const c of INITIAL_COURSES) {
        await setDoc(doc(db, 'courses', c.id), {
          ...c,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const n of INITIAL_NOTES) {
        await setDoc(doc(db, 'notes', n.id), {
          ...n,
          uploadedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const t of INITIAL_TESTS) {
        await setDoc(doc(db, 'tests', t.id), {
          ...t,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const notif of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, 'notifications', notif.id), {
          ...notif,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      showToast('Initial batches, notes, tests, and alerts synced to Firestore!', 'success');
    } catch (err) {
      console.warn('Could not sync seed catalog to Firestore:', err);
      showToast('Catalog initialized in app memory.', 'info');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const id = `course_${Date.now()}`;
    const feeAmount = Math.max(0, Number(cFee) || 0);
    const newCourse: Course = {
      id,
      title: cTitle.trim().slice(0, 140),
      board: cBoard,
      className: cClass,
      subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
      faculty: 'Er. M.N. Alam (Phy, Chem, Math) · Md Ejaz Alam (Bio)',
      schedule: cSchedule.trim().slice(0, 140),
      startDate: cStartDate.trim().slice(0, 60),
      feeAmount,
      feeLabel: `₹${feeAmount.toLocaleString('en-IN')} / Year`,
      description: cDesc.trim().slice(0, 1000) || 'Comprehensive board batch at Phenhara campus.',
      imageUrl: DEFAULT_COURSE_IMAGE,
      active: true,
      createdBy: user.uid,
    };
    try {
      await setDoc(doc(db, 'courses', id), {
        ...newCourse,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCTitle('');
      setCDesc('');
      showToast('Batch published to website & student portal!', 'success');
    } catch (err) {
      console.warn('Could not sync course to cloud:', err);
      setCourses((prev) => [newCourse, ...prev]);
      setCTitle('');
      setCDesc('');
      showToast('Batch published locally (cloud sync offline).', 'success');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, 'courses', courseId));
    } catch (err) {
      console.warn('Could not delete course from cloud:', err);
    }
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    showToast('Batch deleted.', 'info');
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteDoc(doc(db, 'tests', testId));
    } catch (err) {
      console.warn('Could not delete test from cloud:', err);
    }
    setTests((prev) => prev.filter((t) => t.id !== testId));
    showToast('Test deleted.', 'info');
  };

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Please select a valid PDF file.', 'error');
      return;
    }
    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        let pdfUrl = '';
        const sizeKB = Math.max(1, Math.round(file.size / 1024));
        let fileSizeLabel = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        let resolvedFileName = file.name;

        try {
          const res = await fetch('/api/uploads/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              base64Data: reader.result,
            }),
          });
          const isJson = res.headers.get('content-type')?.includes('application/json');
          if (res.ok && isJson) {
            const data = await res.json();
            pdfUrl = data.pdfUrl || String(reader.result);
            resolvedFileName = data.fileName || resolvedFileName;
            fileSizeLabel = data.fileSizeLabel || fileSizeLabel;
          } else {
            pdfUrl = String(reader.result);
          }
        } catch {
          // Static host fallback: embed as data URL
          pdfUrl = String(reader.result);
        }

        setNPdfUrl(pdfUrl);
        setNFileName(resolvedFileName);
        setNFileSize(fileSizeLabel);
        showToast(`PDF "${resolvedFileName}" attached (${fileSizeLabel})`, 'success');
        setUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingPdf(false);
      showToast(err instanceof Error ? err.message : 'PDF attachment failed.', 'error');
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const id = `note_${Date.now()}`;
    const newNote: StudyNote = {
      id,
      title: nTitle.trim().slice(0, 160),
      subject: nSubject,
      className: nClass,
      board: nBoard,
      chapter: nChapter.trim().slice(0, 120),
      summary: nSummary.trim().slice(0, 4000),
      ...(nPdfUrl ? { pdfUrl: nPdfUrl } : {}),
      ...(nFileName ? { fileName: nFileName } : {}),
      ...(nFileSize ? { fileSizeLabel: nFileSize } : { fileSizeLabel: 'Study Sheet' }),
      authorName: (nSubject === 'Biology' ? 'Md Ejaz Alam' : 'Er. M.N. Alam').slice(0, 100),
      uploadedBy: user.uid,
    };
    try {
      await setDoc(doc(db, 'notes', id), {
        ...newNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNTitle('');
      setNChapter('');
      setNSummary('');
      setNPdfUrl('');
      setNFileName('');
      setNFileSize('');
      showToast('Study note & PDF published to Notes Library!', 'success');
    } catch (err) {
      console.warn('Could not sync note to cloud:', err);
      setNotes((prev) => [newNote, ...prev]);
      setNTitle('');
      setNChapter('');
      setNSummary('');
      setNPdfUrl('');
      setNFileName('');
      setNFileSize('');
      showToast('Study note published locally (cloud sync offline).', 'success');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (err) {
      console.warn('Could not delete note from cloud:', err);
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    showToast('Note removed.', 'info');
  };

  const handleCreateTest = async (e: React.FormEvent, alsoCreateGoogleForm = false) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const validQs = tQuestions.filter((q) => q.question.trim().length > 2);
    if (validQs.length === 0) {
      showToast('Add at least one complete MCQ question.', 'error');
      return;
    }

    let googleFormId: string | undefined;
    let googleFormResponderUri: string | undefined;

    if (alsoCreateGoogleForm) {
      if (!accessToken) {
        showToast('Connect Google Forms permission first using the button below.', 'info');
        await signIn(true);
        return;
      }
      setGfLoading(true);
      try {
        const gf = await createGoogleFormQuiz(
          accessToken,
          tTitle.trim(),
          `Shad Concept Classes · ${tSubject} Class ${tClass}`,
          validQs
        );
        googleFormId = gf.formId;
        googleFormResponderUri = gf.responderUri;
        showToast('Google Form Quiz created & linked!', 'success');
      } catch (err) {
        setGfLoading(false);
        showToast(err instanceof Error ? err.message : 'Google Forms creation failed.', 'error');
        return;
      }
      setGfLoading(false);
    }

    const totalMarks = validQs.reduce((sum, q) => sum + (Number(q.marks) || 4), 0);
    const id = `test_${Date.now()}`;
    const newTest: MockTest = {
      id,
      title: tTitle.trim().slice(0, 160),
      subject: tSubject,
      className: tClass,
      board: 'BSEB & CBSE',
      durationMinutes: Math.max(5, Number(tDuration) || 20),
      totalMarks,
      passMarks: Math.ceil(totalMarks * 0.6),
      isCertificationTest: tCert,
      ...(googleFormId ? { googleFormId } : {}),
      ...(googleFormResponderUri ? { googleFormResponderUri } : {}),
      questions: validQs,
      createdBy: user.uid,
    };
    try {
      await setDoc(doc(db, 'tests', id), {
        ...newTest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTTitle('');
      setTQuestions([
        {
          id: 'q1',
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          marks: 4,
          explanation: '',
        },
      ]);
      showToast('New online test published to Test Series!', 'success');
    } catch (err) {
      console.warn('Could not sync test to cloud:', err);
      setTests((prev) => [newTest, ...prev]);
      setTTitle('');
      setTQuestions([
        {
          id: 'q1',
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          marks: 4,
          explanation: '',
        },
      ]);
      showToast('Test published locally (cloud sync offline).', 'success');
    }
  };

  const handleLoadFormResponses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      await signIn(true);
      return;
    }
    if (!gfResponsesFormId.trim()) return;
    setGfLoading(true);
    try {
      const res = await fetchGoogleFormResponses(accessToken, gfResponsesFormId);
      setGfResponses(res);
      showToast(`Loaded ${res.length} Google Form responses.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load form responses.', 'error');
    } finally {
      setGfLoading(false);
    }
  };

  const handlePublishAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    const id = `notif_${Date.now()}`;
    const newAlert: NotificationAlert = {
      id,
      title: aTitle.trim().slice(0, 140),
      message: aMessage.trim().slice(0, 600),
      category: aCategory,
      dueDate: aDueDate.trim().slice(0, 60),
      createdBy: user.uid,
    };
    try {
      await setDoc(doc(db, 'notifications', id), {
        ...newAlert,
        createdAt: serverTimestamp(),
      });
      setATitle('');
      setAMessage('');
      setADueDate('');
      showToast('Push notification broadcasted to all students!', 'success');
    } catch (err) {
      console.warn('Could not broadcast notification to cloud:', err);
      setNotifications((prev) => [newAlert, ...prev]);
      setATitle('');
      setAMessage('');
      setADueDate('');
      showToast('Push alert saved locally (cloud sync offline).', 'success');
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: 'contacted' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'inquiries', id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not update inquiry in cloud:', err);
    }
    showToast(`Inquiry marked as ${status}.`, 'success');
  };

  const handleExportAnalyticsCsv = () => {
    const header = 'Student,Test,Subject,Score,Total,Percentage,Passed\n';
    const rows = allAttemptsForAdmin
      .map(
        (a) =>
          `"${a.studentName}","${a.testTitle}","${a.subject}",${a.score},${a.totalMarks},${a.percentage}%,${a.passed}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCC_Student_Performance_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const subjectAverages = useMemo(() => {
    const acc: Record<string, { sum: number; count: number }> = {};
    allAttemptsForAdmin.forEach((a) => {
      if (!acc[a.subject]) acc[a.subject] = { sum: 0, count: 0 };
      acc[a.subject].sum += a.percentage;
      acc[a.subject].count += 1;
    });
    return Object.entries(acc).map(([subject, stat]) => ({
      subject,
      avg: Math.round((stat.sum / stat.count) * 10) / 10,
      attempts: stat.count,
    }));
  }, [allAttemptsForAdmin]);

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Faculty &amp; Admin Portal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shad Concept Classes · Dedicated control panel for teachers and management.
            </p>
          </div>

          <form onSubmit={handleDirectorLogin} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                required
                placeholder="Shad Concept class"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-[#0F2942] hover:bg-[#1a3d5f] dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-sm shadow cursor-pointer transition-all mt-2"
            >
              Sign In to Admin Panel
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setRoute(PageRoute.HOME)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline cursor-pointer"
            >
              &larr; Back to Student Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-300">
              Admin: {user?.displayName || 'Shad Concept class'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Active Session
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Admin Dashboard &amp; Performance Analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRoute(PageRoute.DASHBOARD)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            type="button"
            onClick={handleSeedCloud}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{seeding ? 'Syncing...' : 'Sync Catalog to Cloud'}</span>
          </button>
          {!accessToken && (
            <button
              type="button"
              onClick={() => signIn(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Connect Google Forms</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
        {(
          [
            { id: 'courses', label: 'Manage Batches', Icon: Plus },
            { id: 'notes', label: 'Upload Notes & PDF', Icon: Upload },
            { id: 'tests', label: 'Tests & Google Forms', Icon: FilePlus2 },
            { id: 'analytics', label: 'Student Performance', Icon: BarChart3 },
            { id: 'alerts', label: 'Push Alerts & Inquiries', Icon: BellPlus },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              tab === id
                ? 'bg-white dark:bg-slate-800 text-[#0F2942] dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Courses */}
      {tab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleCreateCourse}
            className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookPlus className="w-4 h-4 text-amber-600" />
              <span>Add New Coaching Batch</span>
            </h2>
            <input
              type="text"
              required
              value={cTitle}
              onChange={(e) => setCTitle(e.target.value)}
              placeholder="Batch Title (e.g., 12th I.Sc. New Batch)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={cBoard}
                onChange={(e) => setCBoard(e.target.value as Course['board'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option>BSEB &amp; CBSE</option>
                <option>BSEB</option>
                <option>CBSE</option>
              </select>
              <select
                value={cClass}
                onChange={(e) => setCClass(e.target.value as Course['className'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option>12th I.Sc.</option>
                <option>11th I.Sc.</option>
                <option>Target Crash Course</option>
                <option>Test Series</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={cStartDate}
                onChange={(e) => setCStartDate(e.target.value)}
                placeholder="Start Date (e.g. 1 December)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="number"
                required
                value={cFee}
                onChange={(e) => setCFee(e.target.value)}
                placeholder="Annual Fee (₹)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <input
              type="text"
              required
              value={cSchedule}
              onChange={(e) => setCSchedule(e.target.value)}
              placeholder="Schedule (e.g. Morning 6:30 AM – 10:30 AM)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <textarea
              rows={3}
              required
              value={cDesc}
              onChange={(e) => setCDesc(e.target.value)}
              placeholder="Batch syllabus & features..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
            >
              Publish Batch
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.board} · {c.className} · {c.startDate}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
                  <p className="text-xs font-mono text-amber-700 dark:text-amber-400 tabular-nums">
                    {c.feeLabel} · Enrollments: {allEnrollmentsForAdmin.filter((e) => e.courseId === c.id).length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCourse(c.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  title="Delete batch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Upload Notes & PDFs */}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleCreateNote}
            className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Upload New Study Note / PDF
            </h2>
            <input
              type="text"
              required
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="Note Title (e.g., Wave Optics Complete Notes)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={nSubject}
                onChange={(e) => setNSubject(e.target.value as StudyNote['subject'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
                <option>Biology</option>
                <option>English &amp; Hindi</option>
              </select>
              <select
                value={nClass}
                onChange={(e) => setNClass(e.target.value as StudyNote['className'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option value="12th">Class 12th</option>
                <option value="11th">Class 11th</option>
                <option value="Both">Both</option>
              </select>
              <select
                value={nBoard}
                onChange={(e) => setNBoard(e.target.value as StudyNote['board'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option value="Both">BSEB &amp; CBSE</option>
                <option value="BSEB">BSEB</option>
                <option value="CBSE">CBSE</option>
              </select>
            </div>
            <input
              type="text"
              required
              value={nChapter}
              onChange={(e) => setNChapter(e.target.value)}
              placeholder="Chapter Name (e.g., Chapter 10 · Wave Optics)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <textarea
              rows={5}
              required
              value={nSummary}
              onChange={(e) => setNSummary(e.target.value)}
              placeholder="Paste key formulas, derivations, and revision points for offline text reading..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />

            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attach PDF File (Optional, max 10 MB)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfFileChange}
                className="block w-full text-xs text-slate-600 dark:text-slate-300"
              />
              {uploadingPdf && <p className="text-xs text-amber-600">Uploading PDF...</p>}
              {nPdfUrl && (
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Uploaded: {nFileName} ({nFileSize})
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={uploadingPdf}
              className="w-full py-2.5 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
            >
              Publish Study Note
            </button>
          </form>

          <div className="lg:col-span-6 space-y-3">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {n.subject} · Class {n.className} · {n.chapter}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</p>
                  {n.fileName && (
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {n.fileName} ({n.fileSizeLabel})
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNote(n.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Test Builder & Google Forms */}
      {tab === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={(e) => handleCreateTest(e, false)}
            className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Online Mock Test (or Push to Google Forms)
            </h2>

            <input
              type="text"
              required
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder="Test Title (e.g., 12th Physics Alternating Current Test)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />

            <div className="grid grid-cols-3 gap-3">
              <select
                value={tSubject}
                onChange={(e) => setTSubject(e.target.value as MockTest['subject'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
                <option>Biology</option>
                <option>Full Syllabus I.Sc.</option>
              </select>
              <select
                value={tClass}
                onChange={(e) => setTClass(e.target.value as MockTest['className'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option value="12th">Class 12th</option>
                <option value="11th">Class 11th</option>
              </select>
              <input
                type="number"
                required
                min={5}
                value={tDuration}
                onChange={(e) => setTDuration(e.target.value)}
                placeholder="Minutes"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={tCert}
                onChange={(e) => setTCert(e.target.checked)}
              />
              <span>Issue Merit Certificate when student scores ≥ 60%</span>
            </label>

            <div className="space-y-4 pt-2">
              {tQuestions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Question {qIdx + 1}
                    </span>
                    {tQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTQuestions((prev) => prev.filter((_, idx) => idx !== qIdx))
                        }
                        className="text-xs text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={q.question}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTQuestions((prev) =>
                        prev.map((item, idx) => (idx === qIdx ? { ...item, question: val } : item))
                      );
                    }}
                    placeholder="Enter MCQ question..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <input
                        key={oIdx}
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTQuestions((prev) =>
                            prev.map((item, idx) =>
                              idx === qIdx
                                ? {
                                    ...item,
                                    options: item.options.map((o, oi) => (oi === oIdx ? val : o)),
                                  }
                                : item
                            )
                          );
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={q.correctIndex}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTQuestions((prev) =>
                          prev.map((item, idx) =>
                            idx === qIdx ? { ...item, correctIndex: val } : item
                          )
                        );
                      }}
                      className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    >
                      <option value={0}>Correct: Option A</option>
                      <option value={1}>Correct: Option B</option>
                      <option value={2}>Correct: Option C</option>
                      <option value={3}>Correct: Option D</option>
                    </select>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTQuestions((prev) =>
                          prev.map((item, idx) =>
                            idx === qIdx ? { ...item, explanation: val } : item
                          )
                        );
                      }}
                      placeholder="Short solution explanation..."
                      className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setTQuestions((prev) => [
                    ...prev,
                    {
                      id: `q${prev.length + 1}`,
                      question: '',
                      options: ['', '', '', ''],
                      correctIndex: 0,
                      marks: 4,
                      explanation: '',
                    },
                  ])
                }
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                + Add Question
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Publish CBT Test
              </button>
              <button
                type="button"
                disabled={gfLoading}
                onClick={(e) => handleCreateTest(e, true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                {gfLoading ? 'Creating Google Form...' : 'Publish + Create Google Form Quiz'}
              </button>
            </div>
          </form>

          {/* Google Forms Response Inspector & Existing Tests */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleLoadFormResponses}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Inspect Google Form Responses</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste any Google Form ID created by your coaching account to fetch live student submissions.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gfResponsesFormId}
                  onChange={(e) => setGfResponsesFormId(e.target.value)}
                  placeholder="Google Form ID..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={gfLoading}
                  className="px-3.5 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Fetch
                </button>
              </div>
              {gfResponses.length > 0 && (
                <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto text-xs">
                  {gfResponses.map((r) => (
                    <div
                      key={r.responseId}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between"
                    >
                      <span>{r.respondentEmail || r.responseId}</span>
                      <span className="font-mono font-bold tabular-nums">
                        Score: {r.totalScore ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </form>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Tests ({tests.length})
              </h3>
              {tests.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t.title}</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t.subject} · {t.questions.length} Qs
                      {t.googleFormId ? ` · Form: ${t.googleFormId.slice(0, 10)}...` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTest(t.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Performance Analysis Dashboard */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Teacher Performance Analysis Dashboard
            </h2>
            <button
              type="button"
              onClick={handleExportAnalyticsCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Student Scores CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Test Submissions</p>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {allAttemptsForAdmin.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Overall Pass Rate</p>
              <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {allAttemptsForAdmin.length > 0
                  ? `${Math.round(
                      (allAttemptsForAdmin.filter((a) => a.passed).length /
                        allAttemptsForAdmin.length) *
                        100
                    )}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Active Student Enrollments</p>
              <p className="text-2xl font-bold font-mono text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums">
                {allEnrollmentsForAdmin.length}
              </p>
            </div>
          </div>

          {subjectAverages.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Subject-Wise Average Performance
              </h3>
              <div className="space-y-3">
                {subjectAverages.map((s) => (
                  <div key={s.subject} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800 dark:text-slate-200">
                        {s.subject} ({s.attempts} attempts)
                      </span>
                      <span className="font-mono font-bold tabular-nums text-[#0F2942] dark:text-amber-400">
                        {s.avg}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-[#0F2942] dark:bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, s.avg)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Test</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allAttemptsForAdmin.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No student test attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  allAttemptsForAdmin.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {a.studentName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{a.testTitle}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{a.subject}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {a.score}/{a.totalMarks} ({a.percentage}%)
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        <span
                          className={
                            a.passed
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {a.passed ? 'Passed' : 'Needs Review'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Push Alerts & Inquiries */}
      {tab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handlePublishAlert}
            className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Broadcast Push Notification / Deadline
            </h2>
            <input
              type="text"
              required
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
              placeholder="Alert Headline (e.g., Sunday 12th Physics Test)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={aCategory}
                onChange={(e) => setACategory(e.target.value as NotificationAlert['category'])}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              >
                <option value="exam">Exam Schedule</option>
                <option value="deadline">Assignment Deadline</option>
                <option value="batch">Batch Update</option>
                <option value="result">Result Alert</option>
              </select>
              <input
                type="text"
                value={aDueDate}
                onChange={(e) => setADueDate(e.target.value)}
                placeholder="Due Date (e.g., 25 Nov 8 AM)"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <textarea
              rows={3}
              required
              value={aMessage}
              onChange={(e) => setAMessage(e.target.value)}
              placeholder="Notification message for students..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
            >
              Send Push Notification
            </button>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Active Alerts ({notifications.length})
              </p>
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="text-xs flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {n.title}
                  </span>
                  <span className="font-mono text-slate-500 shrink-0">{n.dueDate}</span>
                </div>
              ))}
            </div>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Student Admission &amp; Contact Inquiries ({allInquiriesForAdmin.length})
            </h2>
            {allInquiriesForAdmin.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No signed-in inquiries yet.
              </p>
            ) : (
              <div className="space-y-3">
                {allInquiriesForAdmin.map((inq) => (
                  <div
                    key={inq.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {inq.name} · <span className="font-mono">{inq.phone}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Class: {inq.className} · Status: {inq.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                        {inq.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'contacted')}
                        className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Contacted
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'resolved')}
                        className="px-2.5 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
