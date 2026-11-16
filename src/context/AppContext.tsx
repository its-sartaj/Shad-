import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  getAccessToken,
  googleSignIn,
  googleSignInRedirect,
  initAuth,
  logout,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  INITIAL_COURSES,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TESTS,
} from '../data/seedData';
import {
  AppUser,
  Certificate,
  ContactInquiry,
  Course,
  Enrollment,
  ForumPost,
  MockTest,
  NotificationAlert,
  PageRoute,
  PaymentRecord,
  StudentPrivateInfo,
  StudentPublicProfile,
  StudyNote,
  TestAttempt,
} from '../types';
import { getAllOfflineNotes, useOnlineStatus } from '../lib/offlineStorage';

interface AppContextValue {
  route: PageRoute;
  setRoute: (r: PageRoute) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOnline: boolean;
  user: AppUser | null;
  authReady: boolean;
  isAdmin: boolean;
  accessToken: string | null;
  authDomainError: boolean;
  clearAuthDomainError: () => void;
  signIn: (includeFormsScopes?: boolean) => Promise<void>;
  signInWithRedirectFlow: (includeFormsScopes?: boolean) => Promise<void>;
  signInLocally: (params: {
    name: string;
    className: '11th' | '12th';
    board: 'BSEB' | 'CBSE';
    email?: string;
    role?: 'student' | 'admin';
  }) => void;
  addLocalEnrollment: (enrollment: Enrollment, payment: PaymentRecord) => void;
  addLocalTestAttempt: (attempt: TestAttempt, certificate?: Certificate) => void;
  updateLocalProfile: (
    profileUpdate: Partial<StudentPublicProfile>,
    privateInfoUpdate?: Partial<StudentPrivateInfo>
  ) => void;
  toggleNoteBookmark: (noteId: string) => Promise<void>;
  toggleNoteCompleted: (noteId: string) => Promise<void>;
  signOut: () => Promise<void>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  notes: StudyNote[];
  setNotes: React.Dispatch<React.SetStateAction<StudyNote[]>>;
  tests: MockTest[];
  setTests: React.Dispatch<React.SetStateAction<MockTest[]>>;
  notifications: NotificationAlert[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationAlert[]>>;
  forumPosts: ForumPost[];
  userProfile: StudentPublicProfile | null;
  userPrivateInfo: StudentPrivateInfo | null;
  enrollments: Enrollment[];
  payments: PaymentRecord[];
  testAttempts: TestAttempt[];
  certificates: Certificate[];
  allAttemptsForAdmin: TestAttempt[];
  allInquiriesForAdmin: ContactInquiry[];
  allEnrollmentsForAdmin: Enrollment[];
  offlineNoteIds: string[];
  refreshOfflineNotes: () => Promise<void>;
  activePaymentCourse: Course | null;
  setActivePaymentCourse: (course: Course | null) => void;
  pushPermission: NotificationPermission | 'unsupported';
  requestPushPermission: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function parseRouteFromHash(): PageRoute {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const valid = Object.values(PageRoute) as string[];
  if (valid.includes(hash)) return hash as PageRoute;
  return PageRoute.HOME;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRouteState] = useState<PageRoute>(parseRouteFromHash);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('scc_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const isOnline = useOnlineStatus();

  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authDomainError, setAuthDomainError] = useState(false);

  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [notes, setNotes] = useState<StudyNote[]>(INITIAL_NOTES);
  const [tests, setTests] = useState<MockTest[]>(INITIAL_TESTS);
  const [notifications, setNotifications] = useState<NotificationAlert[]>(INITIAL_NOTIFICATIONS);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);

  const [userProfile, setUserProfile] = useState<StudentPublicProfile | null>(null);
  const [userPrivateInfo, setUserPrivateInfo] = useState<StudentPrivateInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const [allAttemptsForAdmin, setAllAttemptsForAdmin] = useState<TestAttempt[]>([]);
  const [allInquiriesForAdmin, setAllInquiriesForAdmin] = useState<ContactInquiry[]>([]);
  const [allEnrollmentsForAdmin, setAllEnrollmentsForAdmin] = useState<Enrollment[]>([]);

  const [offlineNoteIds, setOfflineNoteIds] = useState<string[]>([]);
  const [activePaymentCourse, setActivePaymentCourse] = useState<Course | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const setRoute = (r: PageRoute) => {
    window.location.hash = r;
    setRouteState(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onHashChange = () => setRouteState(parseRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sync theme to documentElement .dark class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('scc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (user && user.emailVerified && userProfile) {
      if (!user.isLocal) {
        updateDoc(doc(db, 'users', user.uid), {
          preferredTheme: next,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } else {
        const updated: StudentPublicProfile = { ...userProfile, preferredTheme: next };
        setUserProfile(updated);
        localStorage.setItem(`scc_profile_${user.uid}`, JSON.stringify(updated));
      }
    }
  };

  const refreshOfflineNotes = async () => {
    const offline = await getAllOfflineNotes();
    setOfflineNoteIds(offline.map((r) => r.note.id));
    if (!navigator.onLine && offline.length > 0) {
      setNotes((prev) => {
        const map: Record<string, StudyNote> = {};
        prev.forEach((n) => (map[n.id] = n));
        offline.forEach((o) => (map[o.note.id] = o.note));
        return Object.values(map);
      });
    }
  };

  useEffect(() => {
    refreshOfflineNotes();
    testFirestoreConnection();
  }, []);

  const loadLocalData = (uid: string) => {
    try {
      const savedProfile = localStorage.getItem(`scc_profile_${uid}`);
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
      const savedPrivate = localStorage.getItem(`scc_private_${uid}`);
      if (savedPrivate) setUserPrivateInfo(JSON.parse(savedPrivate));
      const savedEnrollments = localStorage.getItem(`scc_enrollments_${uid}`);
      if (savedEnrollments) setEnrollments(JSON.parse(savedEnrollments));
      const savedPayments = localStorage.getItem(`scc_payments_${uid}`);
      if (savedPayments) setPayments(JSON.parse(savedPayments));
      const savedAttempts = localStorage.getItem(`scc_attempts_${uid}`);
      if (savedAttempts) setTestAttempts(JSON.parse(savedAttempts));
      const savedCerts = localStorage.getItem(`scc_certs_${uid}`);
      if (savedCerts) setCertificates(JSON.parse(savedCerts));
    } catch (err) {
      console.warn('Error restoring local student session data:', err);
    }
  };

  // Auth listener
  useEffect(() => {
    const unsub = initAuth((authUser, token) => {
      if (authUser) {
        setUser(authUser);
        setAccessToken(token);
        localStorage.removeItem('scc_local_user');
      } else {
        const local = localStorage.getItem('scc_local_user');
        if (local) {
          try {
            const parsed = JSON.parse(local) as AppUser;
            setUser(parsed);
            loadLocalData(parsed.uid);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setAccessToken(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAdmin = useMemo(() => {
    if (!user || !user.emailVerified) return false;
    return (
      user.email === BOOTSTRAPPED_ADMIN_EMAIL ||
      user.role === 'admin' ||
      isAdminDoc
    );
  }, [user, isAdminDoc]);

  const clearAuthDomainError = () => setAuthDomainError(false);

  const signIn = async (includeFormsScopes = false) => {
    setAuthDomainError(false);
    try {
      const res = await googleSignIn(includeFormsScopes);
      setUser(res.user);
      localStorage.removeItem('scc_local_user');
      const token = await getAccessToken();
      setAccessToken(token);
      showToast(`Signed in as ${res.user.displayName || res.user.email}`, 'success');
    } catch (error: unknown) {
      console.error('Sign in failed:', error);
      const errCode = (error && typeof error === 'object' && 'code' in error) ? String(error.code) : '';
      if (errCode === 'auth/unauthorized-domain') {
        setAuthDomainError(true);
        showToast(
          `Domain "${window.location.hostname}" is pending Firebase whitelist. Use Instant Student or Admin Login below!`,
          'error'
        );
      } else if (errCode === 'auth/popup-blocked') {
        showToast('Browser blocked sign-in popup. Attempting redirect sign-in...', 'info');
        try {
          await googleSignInRedirect(includeFormsScopes);
        } catch (redirectErr: unknown) {
          console.error('Redirect sign in failed:', redirectErr);
          const rCode = (redirectErr && typeof redirectErr === 'object' && 'code' in redirectErr) ? String(redirectErr.code) : '';
          if (rCode === 'auth/unauthorized-domain') {
            setAuthDomainError(true);
          }
          showToast('Popup was blocked. Please use Instant Student Login below.', 'error');
        }
      } else if (errCode === 'auth/popup-closed-by-user') {
        showToast('Sign in popup closed before finishing. You can also sign in instantly below.', 'info');
      } else {
        showToast('Sign in cancelled or blocked. Please allow popups or use Instant Login below.', 'error');
      }
    }
  };

  const signInWithRedirectFlow = async (includeFormsScopes = false) => {
    setAuthDomainError(false);
    try {
      await googleSignInRedirect(includeFormsScopes);
    } catch (error: unknown) {
      console.error('Redirect sign in failed:', error);
      const errCode = (error && typeof error === 'object' && 'code' in error) ? String(error.code) : '';
      if (errCode === 'auth/unauthorized-domain') {
        setAuthDomainError(true);
        showToast(
          `Domain "${window.location.hostname}" is pending Firebase whitelist. Use Instant Student Login below!`,
          'error'
        );
      } else {
        showToast('Redirect sign in failed. Please use Instant Student Login below.', 'error');
      }
    }
  };

  const signInLocally = (params: {
    name: string;
    className: '11th' | '12th';
    board: 'BSEB' | 'CBSE';
    email?: string;
    role?: 'student' | 'admin';
  }) => {
    const isAdm =
      params.role === 'admin' ||
      params.email?.trim().toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

    const uid = isAdm
      ? 'local-admin-alam'
      : `local-student-${Date.now().toString(36)}`;

    const localUser: AppUser = {
      uid,
      displayName: isAdm ? (params.name || 'Er. M.N. Alam') : (params.name.trim() || 'Student'),
      email: isAdm
        ? BOOTSTRAPPED_ADMIN_EMAIL
        : (params.email?.trim() || `${params.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'}@shadconcept.edu`),
      emailVerified: true,
      isLocal: true,
      role: isAdm ? 'admin' : 'student',
    };

    localStorage.setItem('scc_local_user', JSON.stringify(localUser));
    setUser(localUser);

    const savedProfileKey = `scc_profile_${localUser.uid}`;
    let profile: StudentPublicProfile | null = null;
    const existing = localStorage.getItem(savedProfileKey);
    if (existing) {
      try { profile = JSON.parse(existing); } catch {}
    }
    if (!profile) {
      profile = {
        uid: localUser.uid,
        displayName: localUser.displayName || 'Student',
        className: params.className,
        board: params.board,
        preferredTheme: theme,
        bookmarkedNoteIds: [],
        completedNoteIds: [],
      };
      localStorage.setItem(savedProfileKey, JSON.stringify(profile));
    }
    setUserProfile(profile);

    loadLocalData(localUser.uid);
    showToast(
      isAdm
        ? 'Welcome Er. M.N. Alam! Admin control session activated.'
        : `Welcome ${localUser.displayName}! Student portal session active.`,
      'success'
    );
  };

  const updateLocalProfile = (
    profileUpdate: Partial<StudentPublicProfile>,
    privateInfoUpdate?: Partial<StudentPrivateInfo>
  ) => {
    if (!user) return;
    if (userProfile) {
      const nextProfile: StudentPublicProfile = { ...userProfile, ...profileUpdate };
      setUserProfile(nextProfile);
      localStorage.setItem(`scc_profile_${user.uid}`, JSON.stringify(nextProfile));
    }
    if (privateInfoUpdate) {
      const nextPrivate: StudentPrivateInfo = {
        userId: user.uid,
        email: user.email || '',
        ...userPrivateInfo,
        ...privateInfoUpdate,
      };
      setUserPrivateInfo(nextPrivate);
      localStorage.setItem(`scc_private_${user.uid}`, JSON.stringify(nextPrivate));
    }
  };

  const addLocalEnrollment = (enrollment: Enrollment, payment: PaymentRecord) => {
    if (!user) return;
    const nextEnrollments = [enrollment, ...enrollments.filter((e) => e.id !== enrollment.id)];
    const nextPayments = [payment, ...payments.filter((p) => p.id !== payment.id)];
    setEnrollments(nextEnrollments);
    setPayments(nextPayments);
    localStorage.setItem(`scc_enrollments_${user.uid}`, JSON.stringify(nextEnrollments));
    localStorage.setItem(`scc_payments_${user.uid}`, JSON.stringify(nextPayments));
  };

  const addLocalTestAttempt = (attempt: TestAttempt, certificate?: Certificate) => {
    if (!user) return;
    const nextAttempts = [attempt, ...testAttempts.filter((a) => a.id !== attempt.id)];
    setTestAttempts(nextAttempts);
    localStorage.setItem(`scc_attempts_${user.uid}`, JSON.stringify(nextAttempts));
    if (certificate) {
      const nextCerts = [certificate, ...certificates.filter((c) => c.id !== certificate.id)];
      setCertificates(nextCerts);
      localStorage.setItem(`scc_certs_${user.uid}`, JSON.stringify(nextCerts));
    }
  };

  const toggleNoteBookmark = async (noteId: string) => {
    if (!user || !userProfile) {
      showToast('Please sign in to bookmark notes.', 'info');
      return;
    }
    const current = userProfile.bookmarkedNoteIds || [];
    const exists = current.includes(noteId);
    const updated = exists ? current.filter((id) => id !== noteId) : [noteId, ...current].slice(0, 50);
    const nextProfile = { ...userProfile, bookmarkedNoteIds: updated };
    setUserProfile(nextProfile);
    localStorage.setItem(`scc_profile_${user.uid}`, JSON.stringify(nextProfile));

    if (!user.isLocal && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          bookmarkedNoteIds: updated,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not sync bookmark to cloud:', e);
      }
    }
    showToast(exists ? 'Bookmark removed' : 'Note bookmarked', 'success');
  };

  const toggleNoteCompleted = async (noteId: string) => {
    if (!user || !userProfile) {
      showToast('Please sign in to track completed chapters.', 'info');
      return;
    }
    const current = userProfile.completedNoteIds || [];
    const exists = current.includes(noteId);
    const updated = exists ? current.filter((id) => id !== noteId) : [noteId, ...current].slice(0, 50);
    const nextProfile = { ...userProfile, completedNoteIds: updated };
    setUserProfile(nextProfile);
    localStorage.setItem(`scc_profile_${user.uid}`, JSON.stringify(nextProfile));

    if (!user.isLocal && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          completedNoteIds: updated,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Could not sync completed note to cloud:', e);
      }
    }
    showToast(exists ? 'Marked as incomplete' : 'Chapter marked completed', 'success');
  };

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // offline logout
    }
    localStorage.removeItem('scc_local_user');
    setUser(null);
    setAccessToken(null);
    setIsAdminDoc(false);
    setUserProfile(null);
    setUserPrivateInfo(null);
    setEnrollments([]);
    setPayments([]);
    setTestAttempts([]);
    setCertificates([]);
    showToast('Signed out successfully.', 'info');
  };

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Browser notifications are not supported on this device.', 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      showToast('Push notifications enabled for upcoming exams and deadlines.', 'success');
      new Notification('Shad Concept Classes', {
        body: 'Exam reminders and assignment deadline alerts are now active.',
        icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
      });
    } else {
      showToast('Notification permission was not granted.', 'info');
    }
  };

  // Public Firestore listeners (courses, notes, tests, notifications, forum_posts)
  useEffect(() => {
    const unsubCourses = onSnapshot(
      query(collection(db, 'courses'), orderBy('title', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Course), id: d.id }));
        setCourses(list.length > 0 ? list : INITIAL_COURSES);
      },
      (err) => {
        console.warn('Using offline courses seed:', err);
        setCourses(INITIAL_COURSES);
      }
    );

    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), orderBy('chapter', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as StudyNote), id: d.id }));
        setNotes(list.length > 0 ? list : INITIAL_NOTES);
      },
      (err) => {
        console.warn('Using offline notes seed:', err);
        setNotes(INITIAL_NOTES);
      }
    );

    const unsubTests = onSnapshot(
      query(collection(db, 'tests'), orderBy('title', 'asc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as MockTest), id: d.id }));
        setTests(list.length > 0 ? list : INITIAL_TESTS);
      },
      (err) => {
        console.warn('Using offline tests seed:', err);
        setTests(INITIAL_TESTS);
      }
    );

    let knownNotifCount = -1;
    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc')),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as NotificationAlert), id: d.id }));
        if (list.length > 0) {
          if (knownNotifCount !== -1 && list.length > knownNotifCount && Notification?.permission === 'granted') {
            const newest = list[0];
            new Notification(`Shad Concept Classes · ${newest.title}`, {
              body: newest.message,
              icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
            });
          }
          knownNotifCount = list.length;
          setNotifications(list);
        } else {
          knownNotifCount = 0;
          setNotifications(INITIAL_NOTIFICATIONS);
        }
      },
      (err) => {
        console.warn('Using offline notifications seed:', err);
        setNotifications(INITIAL_NOTIFICATIONS);
      }
    );

    const unsubForum = onSnapshot(
      query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc')),
      (snap) => {
        setForumPosts(snap.docs.map((d) => ({ ...(d.data() as ForumPost), id: d.id })));
      },
      (err) => {
        console.warn('Could not load forum posts from cloud:', err);
      }
    );

    return () => {
      unsubCourses();
      unsubNotes();
      unsubTests();
      unsubNotifs();
      unsubForum();
    };
  }, []);

  // User-scoped Firestore listeners (only for Firebase cloud user)
  useEffect(() => {
    if (!authReady || !user || user.isLocal) return;

    const unsubAdmin = onSnapshot(
      doc(db, 'admins', user.uid),
      (snap) => setIsAdminDoc(snap.exists()),
      () => setIsAdminDoc(false)
    );

    const profileRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(
      profileRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as StudentPublicProfile;
          setUserProfile(data);
          localStorage.setItem(`scc_profile_${user.uid}`, JSON.stringify(data));
          if (data.preferredTheme && data.preferredTheme !== theme) {
            setTheme(data.preferredTheme);
          }
        } else if (user.emailVerified) {
          const newProfile: StudentPublicProfile = {
            uid: user.uid,
            displayName: (user.displayName || 'Student').slice(0, 100),
            className: '12th',
            board: 'BSEB',
            preferredTheme: theme,
            bookmarkedNoteIds: [],
            completedNoteIds: [],
          };
          try {
            await setDoc(profileRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            if (user.email) {
              await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
                userId: user.uid,
                email: user.email,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.warn('Could not auto-create initial student profile in cloud:', e);
          }
        }
      },
      (err) => {
        console.warn('Firestore profile listener notice:', err);
      }
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', user.uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as StudentPrivateInfo;
          setUserPrivateInfo(data);
          localStorage.setItem(`scc_private_${user.uid}`, JSON.stringify(data));
        }
      },
      (err) => {
        console.warn('Firestore private info listener notice:', err);
      }
    );

    const unsubEnrollments = onSnapshot(
      query(collection(db, 'enrollments'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Enrollment), id: d.id }));
        setEnrollments(list);
        localStorage.setItem(`scc_enrollments_${user.uid}`, JSON.stringify(list));
      },
      (err) => {
        console.warn('Firestore enrollments listener notice:', err);
      }
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as PaymentRecord), id: d.id }));
        setPayments(list);
        localStorage.setItem(`scc_payments_${user.uid}`, JSON.stringify(list));
      },
      (err) => {
        console.warn('Firestore payments listener notice:', err);
      }
    );

    const unsubAttempts = onSnapshot(
      query(collection(db, 'test_attempts'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as TestAttempt), id: d.id }));
        setTestAttempts(list);
        localStorage.setItem(`scc_attempts_${user.uid}`, JSON.stringify(list));
      },
      (err) => {
        console.warn('Firestore test attempts listener notice:', err);
      }
    );

    const unsubCerts = onSnapshot(
      query(collection(db, 'certificates'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Certificate), id: d.id }));
        setCertificates(list);
        localStorage.setItem(`scc_certs_${user.uid}`, JSON.stringify(list));
      },
      (err) => {
        console.warn('Firestore certificates listener notice:', err);
      }
    );

    return () => {
      unsubAdmin();
      unsubProfile();
      unsubPrivate();
      unsubEnrollments();
      unsubPayments();
      unsubAttempts();
      unsubCerts();
    };
  }, [authReady, user, theme]);

  // Admin-only aggregate listeners for Performance Analytics & Inquiries
  useEffect(() => {
    if (!authReady || !user || !isAdmin) {
      setAllAttemptsForAdmin([]);
      setAllInquiriesForAdmin([]);
      setAllEnrollmentsForAdmin([]);
      return;
    }

    // Always load local inquiries
    try {
      const localInq = JSON.parse(localStorage.getItem('scc_inquiries_local') || '[]');
      if (Array.isArray(localInq) && localInq.length > 0) {
        setAllInquiriesForAdmin(
          localInq.map((i: any) => ({
            id: i.id || `inq_${Date.now()}`,
            userId: i.userId || 'local',
            name: i.name,
            phone: i.phone,
            className: i.className,
            message: i.message,
            status: i.status || 'new',
            createdAt: i.submittedAt || new Date().toISOString(),
          }))
        );
      }
    } catch {
      // ignore
    }

    if (user.isLocal) return;

    const unsubAllAttempts = onSnapshot(
      collection(db, 'test_attempts'),
      (snap) => setAllAttemptsForAdmin(snap.docs.map((d) => ({ ...(d.data() as TestAttempt), id: d.id }))),
      (err) => console.warn('Admin attempts listener notice:', err)
    );

    const unsubAllInquiries = onSnapshot(
      collection(db, 'inquiries'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as ContactInquiry), id: d.id }));
        if (list.length > 0) {
          setAllInquiriesForAdmin(list);
        }
      },
      (err) => console.warn('Admin inquiries listener notice:', err)
    );

    const unsubAllEnrollments = onSnapshot(
      collection(db, 'enrollments'),
      (snap) => setAllEnrollmentsForAdmin(snap.docs.map((d) => ({ ...(d.data() as Enrollment), id: d.id }))),
      (err) => console.warn('Admin enrollments listener notice:', err)
    );

    return () => {
      unsubAllAttempts();
      unsubAllInquiries();
      unsubAllEnrollments();
    };
  }, [authReady, user, isAdmin]);

  return (
    <AppContext.Provider
      value={{
        route,
        setRoute,
        theme,
        toggleTheme,
        isOnline,
        user,
        authReady,
        isAdmin,
        accessToken,
        authDomainError,
        clearAuthDomainError,
        signIn,
        signInWithRedirectFlow,
        signInLocally,
        addLocalEnrollment,
        addLocalTestAttempt,
        updateLocalProfile,
        toggleNoteBookmark,
        toggleNoteCompleted,
        signOut,
        courses,
        setCourses,
        notes,
        setNotes,
        tests,
        setTests,
        notifications,
        setNotifications,
        forumPosts,
        userProfile,
        userPrivateInfo,
        enrollments,
        payments,
        testAttempts,
        certificates,
        allAttemptsForAdmin,
        allInquiriesForAdmin,
        allEnrollmentsForAdmin,
        offlineNoteIds,
        refreshOfflineNotes,
        activePaymentCourse,
        setActivePaymentCourse,
        pushPermission,
        requestPushPermission,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
