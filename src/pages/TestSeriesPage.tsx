import React, { useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { downloadCertificatePng } from '../lib/certificateGenerator';
import { ExamCountdownTimer, formatExamClock } from '../components/ExamCountdownTimer';
import { MockTest, PageRoute, TestAttempt } from '../types';

export const TestSeriesPage: React.FC = () => {
  const { tests, user, testAttempts, certificates, setRoute, showToast } = useApp();

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [sessionKey, setSessionKey] = useState(0);
  const [submittedAttempt, setSubmittedAttempt] = useState<TestAttempt | null>(null);
  const secondsLeftRef = useRef(0);

  const startTest = (test: MockTest) => {
    if (test.googleFormResponderUri && test.questions.length === 0) {
      window.open(test.googleFormResponderUri, '_blank', 'noopener,noreferrer');
      return;
    }
    setActiveTest(test);
    setCurrentIdx(0);
    setAnswers({});
    secondsLeftRef.current = test.durationMinutes * 60;
    setSessionKey((k) => k + 1);
    setSubmittedAttempt(null);
  };

  const handleSubmitTest = async (autoTimeout = false) => {
    if (!activeTest) return;
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    activeTest.questions.forEach((q, idx) => {
      const chosen = answers[idx];
      if (chosen === undefined) {
        unansweredCount += 1;
      } else if (chosen === q.correctIndex) {
        correctCount += 1;
        score += q.marks;
      } else {
        wrongCount += 1;
      }
    });

    const totalMarks = activeTest.totalMarks || activeTest.questions.reduce((s, q) => s + q.marks, 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 1000) / 10 : 0;
    const passed = score >= activeTest.passMarks;
    const timeSpentSeconds = Math.max(1, activeTest.durationMinutes * 60 - secondsLeftRef.current);

    const attemptId = `att_${Date.now()}`;
    const attempt: TestAttempt = {
      id: attemptId,
      userId: user?.uid || 'guest',
      studentName: (user?.displayName || 'Guest Student').slice(0, 100),
      testId: activeTest.id,
      testTitle: activeTest.title,
      subject: activeTest.subject,
      score,
      totalMarks,
      percentage,
      correctCount,
      wrongCount,
      unansweredCount,
      timeSpentSeconds,
      passed,
    };

    setSubmittedAttempt(attempt);

    if (user && user.emailVerified) {
      try {
        await setDoc(doc(db, 'test_attempts', attemptId), {
          ...attempt,
          createdAt: serverTimestamp(),
        });

        if (passed && activeTest.isCertificationTest) {
          const alreadyEarned = certificates.some((c) => c.courseTitle === activeTest.title);
          if (!alreadyEarned) {
            const certId = `cert_${attemptId}`;
            const code = `SCC-${new Date().getFullYear()}-${attemptId.slice(-6).toUpperCase()}`;
            await setDoc(doc(db, 'certificates', certId), {
              id: certId,
              userId: user.uid,
              studentName: (user.displayName || 'Student').slice(0, 100),
              courseId: activeTest.courseId || 'course_12th_target_batch',
              courseTitle: activeTest.title,
              scorePercentage: percentage,
              verificationCode: code,
              issuedAt: serverTimestamp(),
            });
          }
          showToast(
            autoTimeout
              ? 'Time up! Test auto-submitted & merit certificate unlocked.'
              : 'Test submitted! Score synced & certificate unlocked.',
            'success'
          );
        } else {
          showToast('Test submitted and synced to your Student Portal.', 'success');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `test_attempts/${attemptId}`);
      }
    } else {
      showToast('Test graded! Sign in with Google to save scores & earn certificates.', 'info');
    }
  };

  const filteredTests = tests.filter((t) => subjectFilter === 'All' || t.subject === subjectFilter);

  // Active CBT Engine View
  if (activeTest) {
    const questions = activeTest.questions;
    const currentQ = questions[currentIdx];

    if (submittedAttempt) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Instant Evaluation Report
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeTest.title}
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-3xl font-bold font-mono text-[#0F2942] dark:text-amber-400 tabular-nums">
                  {submittedAttempt.score} / {submittedAttempt.totalMarks}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  {submittedAttempt.percentage}% · {submittedAttempt.passed ? 'QUALIFIED' : 'NEEDS PRACTICE'} · Time: {formatExamClock(submittedAttempt.timeSpentSeconds)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 text-center">
                <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {submittedAttempt.correctCount}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">Correct</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-center">
                <p className="text-2xl font-bold font-mono text-red-700 dark:text-red-400 tabular-nums">
                  {submittedAttempt.wrongCount}
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">Incorrect</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-center">
                <p className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                  {submittedAttempt.unansweredCount}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Skipped</p>
              </div>
            </div>

            {submittedAttempt.passed && activeTest.isCertificationTest && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-7 h-7 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Certificate of Merit Unlocked
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Download your official Shad Concept Classes PNG certificate right away.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadCertificatePng({
                      studentName: submittedAttempt.studentName,
                      courseTitle: activeTest.title,
                      scorePercentage: submittedAttempt.percentage,
                      verificationCode: `SCC-${new Date().getFullYear()}-${submittedAttempt.id.slice(-6).toUpperCase()}`,
                      issuedDateLabel: new Date().toLocaleDateString('en-IN'),
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  Download Certificate
                </button>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Question-by-Question Solutions
              </h3>
              {questions.map((q, idx) => {
                const chosen = answers[idx];
                const isCorrect = chosen === q.correctIndex;
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Q{idx + 1}. {q.question}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Your answer:{' '}
                      <strong className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {chosen !== undefined ? q.options[chosen] : 'Not answered'}
                      </strong>{' '}
                      · Correct answer:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {q.options[q.correctIndex]}
                      </strong>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg">
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => startTest(activeTest)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Test</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTest(null);
                  setSubmittedAttempt(null);
                }}
                className="px-4 py-2.5 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Back to All Tests
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTest(null);
                    setSubmittedAttempt(null);
                    setRoute(PageRoute.DASHBOARD);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  View in Student Portal
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTest.subject} · Class {activeTest.className}
            </p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {activeTest.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <ExamCountdownTimer
              durationMinutes={activeTest.durationMinutes}
              sessionKey={sessionKey}
              isActive={!submittedAttempt}
              onTick={(remaining) => {
                secondsLeftRef.current = remaining;
              }}
              onExpire={() => handleSubmitTest(true)}
              onWarning={(msg, type) => showToast(msg, type)}
            />
            <button
              type="button"
              onClick={() => handleSubmitTest(false)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold cursor-pointer"
            >
              Submit Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="font-mono tabular-nums">{currentQ.marks} Marks</span>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.question}
            </h3>

            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const selected = answers[currentIdx] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }))}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-colors flex items-center gap-3 cursor-pointer ${
                      selected
                        ? 'border-[#0F2942] bg-[#0F2942]/5 dark:border-amber-500 dark:bg-amber-500/10 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 border ${
                        selected
                          ? 'bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 border-transparent'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              {currentIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                  className="px-5 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Save &amp; Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmitTest(false)}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Finish &amp; Evaluate
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Question Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const answered = answers[i] !== undefined;
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIdx(i)}
                    className={`h-10 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-amber-500 bg-[#0F2942] text-white'
                        : answered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveTest(null)}
              className="w-full py-2 text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 cursor-pointer"
            >
              Exit Test Without Saving
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test Series Catalog View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Online Test Series
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Practice B.S.E.B. &amp; C.B.S.E. objective tests with instant solutions, cloud-synced scorecards, and merit certificates on passing certification exams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'].map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-white dark:bg-slate-800 text-[#0F2942] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTests.map((test) => {
          const pastAttempt = testAttempts.find((a) => a.testId === test.id);
          return (
            <article
              key={test.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-2.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {test.subject} · Class {test.className} · {test.board}
                </p>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {test.title}
                </h2>
                <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono tabular-nums">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Questions</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {test.questions.length || 'Google Form'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Duration</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {test.durationMinutes} min
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Max Marks</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {test.totalMarks}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                {pastAttempt ? (
                  <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    Best: {pastAttempt.score}/{pastAttempt.totalMarks} ({pastAttempt.percentage}%)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Not attempted</span>
                )}

                <div className="flex items-center gap-2">
                  {test.googleFormResponderUri && (
                    <a
                      href={test.googleFormResponderUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Google Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {test.questions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startTest(test)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{pastAttempt ? 'Retake' : 'Start Test'}</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
