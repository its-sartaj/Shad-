# Security Specification — Shad Concept Classes

## 1. Data Invariants
1. **Admin Authority**: Only verified admins (`apextech.servicess@gmail.com` with `email_verified == true`, or UIDs in `/admins/{uid}`) may create, modify, or delete `courses`, `notes`, `tests`, `notifications`, or other users' `enrollments`/`payments`/`inquiries`.
2. **PII Isolation**: Student PII (`email`, `phone`, `guardianPhone`, `villageOrAddress`, `rollNumber`) is isolated under `/users/{userId}/private/{docId}` and `/inquiries/{inquiryId}` and is strictly readable only by the owning `userId` or verified admin. Public profiles under `/users/{userId}` contain zero PII.
3. **Identity Integrity**: Every user-owned write (`enrollments`, `payments`, `test_attempts`, `certificates`, `forum_posts`, `replies`, `inquiries`) enforces `incoming().userId == request.auth.uid` (or `authorId == request.auth.uid`) and `request.auth.token.email_verified == true`.
4. **Relational Existence**: `enrollments` and `certificates` require an existing `/courses/{courseId}`; `test_attempts` requires an existing `/tests/{testId}`; `forum_posts/{postId}/replies/{replyId}` requires an existing parent `/forum_posts/{postId}` and matching `postId`.
5. **Temporal Integrity & Immortality**: `createdAt` (or `issuedAt`) must equal `request.time` on creation and remain immutable on updates; `updatedAt` must equal `request.time` on updates.
6. **Terminal State Locking**: Once an `enrollment` reaches `status == 'completed'`, a `payment` reaches `status == 'paid'`, or an `inquiry` reaches `status == 'resolved'`, non-admins cannot mutate the document.
7. **Strict Query Enforcement**: `allow list` on private/user-scoped collections (`enrollments`, `payments`, `test_attempts`, `certificates`, `inquiries`, `private`) explicitly evaluates `resource.data.userId == request.auth.uid` or verified admin email without `get()`/`exists()` O(n) reads.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Course Creation**: Admin/student sends `{ ...validCourse, isFeaturedHack: true }` -> Rejected by `hasOnly(...)`.
2. **Unverified Email Spoofing**: Attacker with `email: "apextech.servicess@gmail.com"` and `email_verified: false` tries to create a test -> Rejected by `email_verified == true`.
3. **Self-Assigned Admin Escalation**: Student writes to `/admins/{theirUid}` -> Rejected by `isAdmin()`.
4. **PII Read Leak**: Student A attempts `get` on `/users/studentB/private/info` -> Rejected by `isOwner(userId) || isAdmin()`.
5. **Blanket List Scraping**: Student A calls `list` on `/payments` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid`.
6. **Orphaned Reply Write**: User writes to `/forum_posts/nonexistent_post/replies/r1` -> Rejected by `exists(/databases/$(database)/documents/forum_posts/$(postId))`.
7. **Identity Spoofing on Test Attempt**: Student A creates `/test_attempts/a1` with `userId: "studentB"` -> Rejected by `incoming().userId == request.auth.uid`.
8. **Terminal State Bypass on Payment**: Student A updates a `paid` payment record back to `pending` or changes `amount` -> Rejected by terminal state lock + `affectedKeys().hasOnly(...)`.
9. **Client Timestamp Forgery**: User submits `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
10. **ID Poisoning / Resource Exhaustion**: User creates document with a 500-char ID or 50KB `title` string -> Rejected by `isValidId()` (`<= 128`, regex) and string `.size()` checks.
11. **Unbounded Array Injection**: User submits `subjects` array with 50 items or non-string first element -> Rejected by `size() <= 8` and element type checks.
12. **Teacher Flag Spoofing in Forum Reply**: Student posts reply with `isTeacher: true` -> Rejected because `isTeacher == true` requires `isAdmin()`.
