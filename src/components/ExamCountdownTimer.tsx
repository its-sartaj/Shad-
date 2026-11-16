import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface ExamCountdownTimerProps {
  durationMinutes: number;
  sessionKey: number;
  isActive: boolean;
  onTick?: (secondsLeft: number) => void;
  onExpire: () => void;
  onWarning?: (message: string, type: 'info' | 'error') => void;
}

export function formatExamClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ExamCountdownTimer: React.FC<ExamCountdownTimerProps> = ({
  durationMinutes,
  sessionKey,
  isActive,
  onTick,
  onExpire,
  onWarning,
}) => {
  const totalSeconds = Math.max(60, Math.round(durationMinutes * 60));
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);

  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);
  const onWarningRef = useRef(onWarning);
  const warnedFiveMinRef = useRef(false);
  const warnedOneMinRef = useRef(false);
  const expiredRef = useRef(false);
  const remainingRef = useRef(totalSeconds);
  const lastSessionKeyRef = useRef<number>(-1);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  // Wall-clock anchored interval to prevent timer drift
  useEffect(() => {
    if (lastSessionKeyRef.current !== sessionKey) {
      lastSessionKeyRef.current = sessionKey;
      remainingRef.current = totalSeconds;
      warnedFiveMinRef.current = false;
      warnedOneMinRef.current = false;
      expiredRef.current = false;
      setSecondsLeft(totalSeconds);
      onTickRef.current?.(totalSeconds);
    }

    if (!isActive) return;

    const startWallMs = Date.now();
    const initialRemaining = remainingRef.current;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startWallMs) / 1000);
      const nextRemaining = Math.max(0, initialRemaining - elapsedSec);

      remainingRef.current = nextRemaining;
      setSecondsLeft(nextRemaining);
      onTickRef.current?.(nextRemaining);

      if (
        totalSeconds > 300 &&
        nextRemaining <= 300 &&
        nextRemaining > 60 &&
        !warnedFiveMinRef.current
      ) {
        warnedFiveMinRef.current = true;
        onWarningRef.current?.('5 minutes remaining — review your marked answers.', 'info');
      }

      if (nextRemaining <= 60 && nextRemaining > 0 && !warnedOneMinRef.current) {
        warnedOneMinRef.current = true;
        onWarningRef.current?.('Final 1 minute remaining! Exam will auto-submit at 00:00.', 'error');
      }

      if (nextRemaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isActive, sessionKey, totalSeconds]);

  const percentRemaining = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const warningThreshold = Math.min(300, Math.round(totalSeconds * 0.25));
  const isCritical = secondsLeft <= 60;
  const isWarning = !isCritical && secondsLeft <= warningThreshold;

  const containerTone = isCritical
    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
    : isWarning
      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
      : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[#0F2942] dark:text-amber-400';

  const barTone = isCritical
    ? 'bg-red-600 dark:bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-[#0F2942] dark:bg-amber-400';

  return (
    <div
      role="timer"
      aria-live={isCritical ? 'assertive' : 'off'}
      aria-label="Exam time remaining"
      className={`min-w-[155px] sm:min-w-[178px] rounded-xl border px-3.5 py-2 transition-colors ${containerTone}`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-85">
          {isCritical ? (
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{isCritical ? 'Final Minute' : isWarning ? 'Time Low' : 'Time Left'}</span>
        </div>

        <span className="font-mono text-sm sm:text-base font-bold tabular-nums tracking-tight">
          {formatExamClock(secondsLeft)}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barTone}`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>
    </div>
  );
};
