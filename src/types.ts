export enum PageRoute {
  HOME = 'home',
  NOTES = 'notes',
  TESTS = 'tests',
  FORUM = 'forum',
  DASHBOARD = 'dashboard',
  ADMIN = 'admin',
  CONTACT = 'contact',
}

export enum SubjectName {
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  MATHEMATICS = 'Mathematics',
  BIOLOGY = 'Biology',
  ENGLISH_HINDI = 'English & Hindi',
}

export interface Course {
  id: string;
  title: string;
  board: 'BSEB' | 'CBSE' | 'BSEB & CBSE';
  className: '11th I.Sc.' | '12th I.Sc.' | 'Target Crash Course' | 'Test Series';
  subjects: string[];
  faculty: string;
  schedule: string;
  startDate: string;
  feeAmount: number;
  feeLabel: string;
  description: string;
  imageUrl?: string;
  active: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudyNote {
  id: string;
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | 'English & Hindi';
  className: '11th' | '12th' | 'Both';
  board: 'BSEB' | 'CBSE' | 'Both';
  chapter: string;
  summary: string;
  pdfUrl?: string;
  fileName?: string;
  fileSizeLabel?: string;
  authorName: string;
  uploadedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  marks: number;
  explanation: string;
}

export interface MockTest {
  id: string;
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | 'Full Syllabus I.Sc.';
  className: '11th' | '12th';
  board: 'BSEB' | 'CBSE' | 'BSEB & CBSE';
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  isCertificationTest: boolean;
  courseId?: string;
  googleFormId?: string;
  googleFormResponderUri?: string;
  questions: TestQuestion[];
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestAttempt {
  id: string;
  userId: string;
  studentName: string;
  testId: string;
  testTitle: string;
  subject: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  passed: boolean;
  createdAt?: unknown;
}

export interface Enrollment {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  status: 'active' | 'completed';
  feePaid: boolean;
  paymentId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  method: 'UPI' | 'Card' | 'NetBanking';
  transactionRef: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Certificate {
  id: string;
  userId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  scorePercentage: number;
  verificationCode: string;
  issuedAt?: unknown;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology' | 'General';
  title: string;
  body: string;
  status: 'open' | 'resolved';
  replyCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  isTeacher: boolean;
  body: string;
  createdAt?: unknown;
}

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  category: 'exam' | 'deadline' | 'batch' | 'result';
  dueDate?: string;
  createdBy: string;
  createdAt?: unknown;
}

export interface ContactInquiry {
  id: string;
  userId: string;
  name: string;
  phone: string;
  className: string;
  message: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentPublicProfile {
  uid: string;
  displayName: string;
  className: '11th' | '12th';
  board: 'BSEB' | 'CBSE';
  preferredTheme: 'light' | 'dark';
  bookmarkedNoteIds: string[];
  completedNoteIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentPrivateInfo {
  userId: string;
  email: string;
  phone?: string;
  guardianPhone?: string;
  villageOrAddress?: string;
  rollNumber?: string;
  updatedAt?: unknown;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL?: string | null;
  isLocal?: boolean;
  role?: 'student' | 'admin';
}
