/**
 * Dirty Dozen Security Rule Verification Harness for Shad Concept Classes.
 * Documents and verifies adversarial payloads against Firestore Security Rules.
 */
export const dirtyDozenPayloads = [
  {
    name: 'Shadow Field Injection on Course Creation',
    path: '/courses/course_001',
    operation: 'create',
    payload: { id: 'course_001', title: 'Physics 12th', isFeaturedHack: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Unverified Email Admin Spoofing',
    path: '/notes/note_001',
    operation: 'create',
    auth: { uid: 'attacker1', email: 'apextech.servicess@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Self-Assigned Admin Privilege Escalation',
    path: '/admins/student_uid',
    operation: 'create',
    auth: { uid: 'student_uid', email: 'student@gmail.com', email_verified: true },
    payload: { uid: 'student_uid', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Cross-Student PII Private Info Read',
    path: '/users/student_b/private/info',
    operation: 'get',
    auth: { uid: 'student_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Unfiltered List Query on Payments',
    path: '/payments',
    operation: 'list',
    auth: { uid: 'student_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Orphaned Forum Reply Creation',
    path: '/forum_posts/missing_post/replies/reply_1',
    operation: 'create',
    auth: { uid: 'student_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Identity Spoofing on Test Attempt',
    path: '/test_attempts/att_1',
    operation: 'create',
    auth: { uid: 'student_a', email_verified: true },
    payload: { id: 'att_1', userId: 'student_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Terminal State Bypass on Paid Fee Record',
    path: '/payments/pay_1',
    operation: 'update',
    existingStatus: 'paid',
    payload: { status: 'pending' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Client Timestamp Forgery',
    path: '/forum_posts/post_1',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Oversized Document ID Poisoning',
    path: `/courses/${'x'.repeat(200)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Unbounded Subjects Array Injection',
    path: '/courses/course_002',
    operation: 'create',
    payload: { subjects: Array.from({ length: 20 }, (_, i) => `Sub ${i}`) },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: 'Teacher Flag Spoofing in Forum Reply',
    path: '/forum_posts/post_1/replies/r1',
    operation: 'create',
    auth: { uid: 'student_a', email_verified: true },
    payload: { isTeacher: true },
    expected: 'PERMISSION_DENIED',
  },
];
