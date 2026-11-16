import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
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
  handleFirestoreError,
  initAuth,
  logout,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import {
  INITIAL_COURSES,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TESTS,
} from '../data/seedData';
import {
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
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  accessToken: string | null;
  signIn: (includeFormsScopes?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  courses: Course[];
  notes: StudyNote[];
  tests: MockTest[];
  notifications: NotificationAlert[];
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

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

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
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const setRoute = (r: PageRoute) => {
    setRouteState(r);
    window.location.hash = r;
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
      updateDoc(doc(db, 'users', user.uid), {
        preferredTheme: next,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
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

  // Auth listener
  useEffect(() => {
    const unsub = initAuth((authUser, token) => {
      setUser(authUser);
      setAccessToken(token);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAdmin = useMemo(() => {
    if (!user || !user.emailVerified) return false;
    return user.email === BOOTSTRAPPED_ADMIN_EMAIL || isAdminDoc;
  }, [user, isAdminDoc]);

  const signIn = async (includeFormsScopes = false) => {
    try {
      const res = await googleSignIn(includeFormsScopes);
      setUser(res.user);
      const token = await getAccessToken();
      setAccessToken(token);
      showToast(`Signed in as ${res.user.displayName || res.user.email}`, 'success');
    } catch (error) {
      console.error('Sign in failed:', error);
      showToast('Sign in cancelled or blocked. Please allow popups and try again.', 'error');
    }
  };

  const signOut = async () => {
    await logout();
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
      collection(db, 'courses'),
      (snap) => {
        if (!snap.empty) {
          setCourses(snap.docs.map((d) => ({ ...(d.data() as Course), id: d.id })));
        } else {
          setCourses(INITIAL_COURSES);
        }
      },
      (err) => {
        console.warn('Using offline courses seed:', err);
        setCourses(INITIAL_COURSES);
      }
    );

    const unsubNotes = onSnapshot(
      collection(db, 'notes'),
      (snap) => {
        if (!snap.empty) {
          const cloudNotes = snap.docs.map((d) => ({ ...(d.data() as StudyNote), id: d.id }));
          setNotes(cloudNotes);
        } else {
          setNotes(INITIAL_NOTES);
        }
      },
      (err) => {
        console.warn('Using offline notes seed:', err);
        setNotes(INITIAL_NOTES);
      }
    );

    const unsubTests = onSnapshot(
      collection(db, 'tests'),
      (snap) => {
        if (!snap.empty) {
          setTests(snap.docs.map((d) => ({ ...(d.data() as MockTest), id: d.id })));
        } else {
          setTests(INITIAL_TESTS);
        }
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

  // User-scoped Firestore listeners (only after auth is ready & user is signed in)
  useEffect(() => {
    if (!authReady || !user) return;

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
            console.warn('Could not auto-create initial student profile:', e);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', user.uid, 'private', 'info'),
      (snap) => {
        if (snap.exists()) {
          setUserPrivateInfo(snap.data() as StudentPrivateInfo);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/private/info`)
    );

    const unsubEnrollments = onSnapshot(
      query(collection(db, 'enrollments'), where('userId', '==', user.uid)),
      (snap) => setEnrollments(snap.docs.map((d) => ({ ...(d.data() as Enrollment), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments')
    );

    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('userId', '==', user.uid)),
      (snap) => setPayments(snap.docs.map((d) => ({ ...(d.data() as PaymentRecord), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
    );

    const unsubAttempts = onSnapshot(
      query(collection(db, 'test_attempts'), where('userId', '==', user.uid)),
      (snap) => setTestAttempts(snap.docs.map((d) => ({ ...(d.data() as TestAttempt), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'test_attempts')
    );

    const unsubCerts = onSnapshot(
      query(collection(db, 'certificates'), where('userId', '==', user.uid)),
      (snap) => setCertificates(snap.docs.map((d) => ({ ...(d.data() as Certificate), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'certificates')
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
  }, [authReady, user]);

  // Admin-only aggregate listeners for Performance Analytics & Inquiries
  useEffect(() => {
    if (!authReady || !user || user.email !== BOOTSTRAPPED_ADMIN_EMAIL || !user.emailVerified) {
      setAllAttemptsForAdmin([]);
      setAllInquiriesForAdmin([]);
      setAllEnrollmentsForAdmin([]);
      return;
    }

    const unsubAllAttempts = onSnapshot(
      collection(db, 'test_attempts'),
      (snap) => setAllAttemptsForAdmin(snap.docs.map((d) => ({ ...(d.data() as TestAttempt), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'test_attempts')
    );

    const unsubAllInquiries = onSnapshot(
      collection(db, 'inquiries'),
      (snap) => setAllInquiriesForAdmin(snap.docs.map((d) => ({ ...(d.data() as ContactInquiry), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'inquiries')
    );

    const unsubAllEnrollments = onSnapshot(
      collection(db, 'enrollments'),
      (snap) => setAllEnrollmentsForAdmin(snap.docs.map((d) => ({ ...(d.data() as Enrollment), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'enrollments')
    );

    return () => {
      unsubAllAttempts();
      unsubAllInquiries();
      unsubAllEnrollments();
    };
  }, [authReady, user]);

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
        signIn,
        signOut,
        courses,
        notes,
        tests,
        notifications,
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
