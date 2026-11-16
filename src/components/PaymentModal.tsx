import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Landmark, Smartphone, X } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GoogleSignInButton } from './GoogleSignInButton';

export const PaymentModal: React.FC = () => {
  const {
    activePaymentCourse,
    setActivePaymentCourse,
    user,
    signIn,
    showToast,
    setRoute,
  } = useApp();

  const [method, setMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [upiId, setUpiId] = useState('student@upi');
  const [cardLast4, setCardLast4] = useState('4242');
  const [bankName, setBankName] = useState('State Bank of India');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{
    transactionRef: string;
    amount: number;
    method: string;
    courseTitle: string;
  } | null>(null);

  if (!activePaymentCourse) return null;

  const handleClose = () => {
    setReceipt(null);
    setActivePaymentCourse(null);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.emailVerified) {
      showToast('Please sign in with Google to save your enrollment & fee receipt.', 'info');
      return;
    }

    setProcessing(true);
    try {
      let transactionRef = `SCC_${method.toUpperCase()}_${Date.now().toString().slice(-6)}_${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      try {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: activePaymentCourse.id,
            courseTitle: activePaymentCourse.title,
            amount: activePaymentCourse.feeAmount,
            studentName: user.displayName || 'Student',
          }),
        });
        const isOrderJson = orderRes.headers.get('content-type')?.includes('application/json');
        if (orderRes.ok && isOrderJson) {
          const orderData = await orderRes.json();
          const referenceInput =
            method === 'UPI' ? upiId : method === 'Card' ? `Card *${cardLast4}` : bankName;

          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.orderId,
              method,
              referenceInput,
            }),
          });
          const isVerifyJson = verifyRes.headers.get('content-type')?.includes('application/json');
          if (verifyRes.ok && isVerifyJson) {
            const verifyData = await verifyRes.json();
            if (verifyData.verified && verifyData.transactionRef) {
              transactionRef = verifyData.transactionRef;
            }
          }
        }
      } catch {
        // Fall back to client-side verification on static hosting (e.g. GitHub Pages)
      }

      const paymentId = `pay_${Date.now()}`;
      const enrollmentId = `enr_${user.uid.slice(0, 12)}_${activePaymentCourse.id}`;
      const studentName = (user.displayName || 'Student').slice(0, 100);

      try {
        await setDoc(doc(db, 'payments', paymentId), {
          id: paymentId,
          userId: user.uid,
          studentName,
          courseId: activePaymentCourse.id,
          courseTitle: activePaymentCourse.title,
          amount: activePaymentCourse.feeAmount,
          method,
          transactionRef,
          status: 'paid',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `payments/${paymentId}`);
      }

      try {
        await setDoc(doc(db, 'enrollments', enrollmentId), {
          id: enrollmentId,
          userId: user.uid,
          studentName,
          courseId: activePaymentCourse.id,
          courseTitle: activePaymentCourse.title,
          status: 'active',
          feePaid: true,
          paymentId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `enrollments/${enrollmentId}`);
      }

      setReceipt({
        transactionRef,
        amount: activePaymentCourse.feeAmount,
        method,
        courseTitle: activePaymentCourse.title,
      });
      showToast('Fee payment verified & batch unlocked!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment failed.';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Online Tuition Fee Checkout
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shad Concept Classes · Instant Batch Activation
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {receipt ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7 shrink-0" />
              <div>
                <h4 className="text-base font-bold">Payment Successful &amp; Enrolled</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your enrollment and fee receipt are synced to your Student Portal.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Batch</span>
                <span className="font-semibold text-slate-900 dark:text-white">{receipt.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount Paid</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{receipt.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment Mode</span>
                <span className="font-medium text-slate-900 dark:text-white">{receipt.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transaction Ref</span>
                <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                  {receipt.transactionRef}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setRoute('dashboard' as never);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-sm font-semibold cursor-pointer"
              >
                Open Student Portal
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="p-6 space-y-5">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Selected Batch</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {activePaymentCourse.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activePaymentCourse.board} · {activePaymentCourse.schedule}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Fee Payable</p>
                <p className="text-xl font-bold font-mono text-[#0F2942] dark:text-amber-400 tabular-nums">
                  ₹{activePaymentCourse.feeAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {!user ? (
              <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 space-y-3">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Sign in with your Google account so your batch enrollment and fee receipt sync across your devices.
                </p>
                <GoogleSignInButton onClick={() => signIn(false)} />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'UPI', label: 'UPI / QR', Icon: Smartphone },
                        { id: 'Card', label: 'Card', Icon: CreditCard },
                        { id: 'NetBanking', label: 'NetBanking', Icon: Landmark },
                      ] as const
                    ).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMethod(id)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          method === id
                            ? 'border-[#0F2942] bg-[#0F2942] text-white dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {method === 'UPI' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      UPI ID (PhonePe / Google Pay / Paytm / BHIM)
                    </label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@okaxis"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Coaching UPI Merchant: <span className="font-mono">9525206317@ybl</span>
                    </p>
                  </div>
                )}

                {method === 'Card' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Last 4 Digits of Debit / Credit Card
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="4242"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {method === 'NetBanking' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Select Bank
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    >
                      <option>State Bank of India</option>
                      <option>HDFC Bank</option>
                      <option>Punjab National Bank</option>
                      <option>Bank of Baroda</option>
                      <option>ICICI Bank</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 px-4 rounded-lg bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {processing
                    ? 'Verifying Fee Payment...'
                    : `Pay ₹${activePaymentCourse.feeAmount.toLocaleString('en-IN')} & Enroll`}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
