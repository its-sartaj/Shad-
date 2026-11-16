import React, { useState } from 'react';
import {
  CheckCircle2,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CampusLocationMap } from '../components/CampusLocationMap';

export const ContactPage: React.FC = () => {
  const { user, showToast } = useApp();

  // Contact Inquiry Form
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [className, setClassName] = useState('12th I.Sc. (BSEB)');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 6 || message.trim().length < 3) {
      showToast('Please enter a valid name, phone number, and message.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, className, message }),
        });
        if (!res.ok && res.status !== 404 && res.status !== 405) {
          throw new Error('Failed to submit inquiry.');
        }
      } catch (apiErr) {
        if (apiErr instanceof Error && apiErr.message === 'Failed to submit inquiry.') {
          throw apiErr;
        }
      }

      if (user && user.emailVerified) {
        const inquiryId = `inq_${Date.now()}`;
        try {
          await setDoc(doc(db, 'inquiries', inquiryId), {
            id: inquiryId,
            userId: user.uid,
            name: name.trim().slice(0, 100),
            phone: phone.trim().slice(0, 25),
            className: className.slice(0, 60),
            message: message.trim().slice(0, 1500),
            status: 'new',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `inquiries/${inquiryId}`);
        }
      }

      setSubmitted(true);
      setMessage('');
      showToast('Your query has been submitted! Our team will call you shortly.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send query.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Contact Us &amp; Campus Map
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Near H.F.H.S School Phenhara, East Champaran, Bihar · B.S.E.B. &amp; C.B.S.E. I.Sc. Center
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Google Maps Platform Interactive Map & Directions */}
        <div className="lg:col-span-7 space-y-4">
          <CampusLocationMap heightClassName="h-[420px]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Physics, Chemistry &amp; Mathematics
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Er. M.N. Alam
              </p>
              <a
                href="tel:+919525206317"
                className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>+91 9525206317</span>
              </a>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Biology (Class 11th &amp; 12th)
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Md Ejaz Alam
              </p>
              <a
                href="tel:+918521736717"
                className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#0F2942] dark:text-amber-400 mt-1 tabular-nums"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>+91 8521736717</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Contact & Admission Query Form */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Submit an Admission or Academic Query
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ask about Class 11th / 12th batch timings, fee installments, or demo classes.
              </p>
            </div>

            {submitted && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Query received! Er. M.N. Alam or Md Ejaz Alam’s desk will contact you soon.</span>
              </div>
            )}

            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Student / Parent Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mobile / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Class &amp; Board
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option>12th I.Sc. (BSEB)</option>
                    <option>12th I.Sc. (CBSE)</option>
                    <option>11th I.Sc. (BSEB)</option>
                    <option>11th I.Sc. (CBSE)</option>
                    <option>Crash Course / Test Series</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Your Question or Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your query about batch timings, hostel/transport, or syllabus..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-sm font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending...' : 'Submit Query'}</span>
                </button>
                <a
                  href={`https://wa.me/919525206317?text=${encodeURIComponent(
                    `Namaste Sir, I am ${name || 'a student'} (${className}). ${message || 'I want batch admission details.'}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send on WhatsApp</span>
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
