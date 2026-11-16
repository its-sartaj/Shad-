import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HardDriveDownload,
  Search,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  formatStorageSize,
  getAllPdfMetadata,
  getOfflinePdfUrl,
  markOfflineNoteRead,
  OfflinePdfMetadata,
  recordDownloadedPdfMetadata,
  removeOfflineNote,
  saveNoteForOffline,
} from '../lib/offlineStorage';
import { StudyNote } from '../types';

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'English & Hindi'] as const;

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export const NotesPage: React.FC = () => {
  const {
    notes,
    offlineNoteIds,
    refreshOfflineNotes,
    user,
    userProfile,
    isOnline,
    toggleNoteBookmark,
    toggleNoteCompleted,
    showToast,
  } = useApp();

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [classFilter, setClassFilter] = useState<'All' | '11th' | '12th'>('All');
  const [viewMode, setViewMode] = useState<'all' | 'offline'>('all');
  const [search, setSearch] = useState('');
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);
  const [offlinePdfPreviewUrl, setOfflinePdfPreviewUrl] = useState<string | null>(null);
  const [pdfMetadataMap, setPdfMetadataMap] = useState<Record<string, OfflinePdfMetadata>>({});
  const [savingAll, setSavingAll] = useState(false);

  const loadPdfMetadata = useCallback(async () => {
    const allMeta = await getAllPdfMetadata();
    const map: Record<string, OfflinePdfMetadata> = {};
    allMeta.forEach((m) => {
      map[m.noteId] = m;
    });
    setPdfMetadataMap(map);
  }, []);

  useEffect(() => {
    loadPdfMetadata();
  }, [loadPdfMetadata, offlineNoteIds.length]);

  // Auto-switch to offline saved view if device goes offline and cached notes exist
  useEffect(() => {
    if (!isOnline && offlineNoteIds.length > 0) {
      refreshOfflineNotes();
    }
  }, [isOnline, offlineNoteIds.length, refreshOfflineNotes]);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (offlinePdfPreviewUrl) {
        URL.revokeObjectURL(offlinePdfPreviewUrl);
      }
    };
  }, [offlinePdfPreviewUrl]);

  const offlineSet = useMemo(() => new Set(offlineNoteIds), [offlineNoteIds]);
  const bookmarkedSet = useMemo(
    () => new Set(userProfile?.bookmarkedNoteIds || []),
    [userProfile]
  );
  const completedSet = useMemo(
    () => new Set(userProfile?.completedNoteIds || []),
    [userProfile]
  );

  const offlineStats = useMemo(() => {
    const entries = Object.values(pdfMetadataMap);
    const totalBytes = entries.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const binaryPdfCount = entries.filter((item) => item.isPdfBinary).length;
    return {
      totalCached: Math.max(offlineNoteIds.length, entries.length),
      binaryPdfCount,
      totalSizeLabel: formatStorageSize(totalBytes),
    };
  }, [pdfMetadataMap, offlineNoteIds.length]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (subjectFilter !== 'All' && n.subject !== subjectFilter) return false;
      if (classFilter !== 'All' && n.className !== classFilter && n.className !== 'Both') return false;
      if (viewMode === 'offline' && !offlineSet.has(n.id) && !pdfMetadataMap[n.id]) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.chapter.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notes, subjectFilter, classFilter, viewMode, offlineSet, pdfMetadataMap, search]);

  const handleSaveOffline = async (note: StudyNote) => {
    await saveNoteForOffline(note);
    await Promise.all([refreshOfflineNotes(), loadPdfMetadata()]);
    showToast(`Saved "${note.title}" and PDF metadata for offline reading.`, 'success');
  };

  const handleRemoveOffline = async (noteId: string) => {
    await removeOfflineNote(noteId);
    await Promise.all([refreshOfflineNotes(), loadPdfMetadata()]);
    showToast('Removed from offline storage.', 'info');
  };

  const handleSaveAllOffline = async () => {
    setSavingAll(true);
    try {
      for (const note of notes) {
        await saveNoteForOffline(note);
      }
      await Promise.all([refreshOfflineNotes(), loadPdfMetadata()]);
      showToast(`All ${notes.length} study notes and PDF metadata cached locally!`, 'success');
    } finally {
      setSavingAll(false);
    }
  };

  const handleOpenReader = async (note: StudyNote) => {
    setActiveNote(note);
    if (offlinePdfPreviewUrl) {
      URL.revokeObjectURL(offlinePdfPreviewUrl);
      setOfflinePdfPreviewUrl(null);
    }

    const localUrl = await getOfflinePdfUrl(note.id);
    setOfflinePdfPreviewUrl(localUrl);

    if (offlineSet.has(note.id) || pdfMetadataMap[note.id]) {
      await markOfflineNoteRead(note.id);
      await loadPdfMetadata();
    }
  };

  const handleTrackPdfDownload = async (note: StudyNote) => {
    await recordDownloadedPdfMetadata(note, {
      fileName: note.fileName || `${note.id}.pdf`,
      mimeType: 'application/pdf',
      isPdfBinary: Boolean(note.pdfUrl),
    });
    await Promise.all([refreshOfflineNotes(), loadPdfMetadata()]);
    showToast(`PDF metadata cached in IndexedDB for offline access.`, 'success');
  };

  const toggleProfileList = async (field: 'bookmarkedNoteIds' | 'completedNoteIds', noteId: string) => {
    if (!user || !userProfile) {
      showToast('Sign in to sync bookmarks & completed chapters.', 'info');
      return;
    }
    if (field === 'bookmarkedNoteIds') {
      await toggleNoteBookmark(noteId);
    } else {
      await toggleNoteCompleted(noteId);
    }
  };

  const handleDownloadTextStudySheet = async (note: StudyNote) => {
    const content = `SHAD CONCEPT CLASSES (Estd. 2010)\nNear H.F.H.S School Phenhara, East Champaran\n--------------------------------------------------\nTitle: ${note.title}\nSubject: ${note.subject} | Class: ${note.className} | Board: ${note.board}\nChapter: ${note.chapter}\nFaculty: ${note.authorName}\n--------------------------------------------------\n\n${note.summary}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}.txt`;

    await recordDownloadedPdfMetadata(note, {
      fileName: note.fileName || fileName,
      mimeType: 'text/plain',
      sizeBytes: blob.size,
      isPdfBinary: Boolean(note.pdfUrl),
    });
    await Promise.all([refreshOfflineNotes(), loadPdfMetadata()]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeMeta = activeNote ? pdfMetadataMap[activeNote.id] : undefined;
  const readerPdfSrc = offlinePdfPreviewUrl || (isOnline ? activeNote?.pdfUrl : undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header & Offline Action */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Chapter Notes &amp; PDF Study Material
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Read bilingual B.S.E.B. &amp; C.B.S.E. notes online or save chapters and PDF metadata into local IndexedDB storage to revise anytime without mobile data.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAllOffline}
          disabled={savingAll || !isOnline}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <HardDriveDownload className="w-4 h-4" />
          <span>{savingAll ? 'Caching Notes...' : 'Save All Notes Offline'}</span>
        </button>
      </div>

      {!isOnline && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-start sm:items-center gap-3">
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold">
                Offline Reading Mode Active · {offlineStats.totalCached} Notes &amp; {offlineStats.binaryPdfCount} PDFs Cached ({offlineStats.totalSizeLabel})
              </p>
              <p className="text-xs opacity-90">
                Your downloaded PDF metadata and saved chapter notes are loaded directly from IndexedDB.
              </p>
            </div>
          </div>
          {viewMode !== 'offline' && offlineStats.totalCached > 0 && (
            <button
              type="button"
              onClick={() => setViewMode('offline')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Show Saved Only
            </button>
          )}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {SUBJECTS.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-white dark:bg-slate-800 text-[#0F2942] dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['All', '11th', '12th'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setClassFilter(cls)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  classFilter === cls
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {cls === 'All' ? 'All Classes' : `Class ${cls}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('offline')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'offline'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Saved Offline ({offlineStats.totalCached})
            </button>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chapter or topic..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No study notes match your current filter
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Switch back to All Notes or clear your search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotes.map((note) => {
            const meta = pdfMetadataMap[note.id];
            const isOfflineSaved = offlineSet.has(note.id) || Boolean(meta);
            const isBookmarked = bookmarkedSet.has(note.id);
            const isCompleted = completedSet.has(note.id);

            return (
              <article
                key={note.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {note.subject} · Class {note.className} · {note.board}
                    </span>
                    <span className="font-mono">{meta?.sizeLabel || note.fileSizeLabel || 'Study Sheet'}</span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {note.title}
                  </h2>

                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {note.chapter} · By {note.authorName}
                  </p>

                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-line">
                    {note.summary}
                  </p>

                  {meta && (
                    <div className="rounded-lg border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span className="inline-flex items-center gap-1.5 font-medium truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {meta.fileName} ({meta.sizeLabel})
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono shrink-0">
                        <Clock className="w-3 h-3" />
                        {meta.lastReadAt
                          ? `Read ${formatShortDate(meta.lastReadAt)}`
                          : `Saved ${formatShortDate(meta.downloadedAt)}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReader(note)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2942] hover:bg-[#163a5c] dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read Notes</span>
                    </button>

                    {isOfflineSaved ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveOffline(note.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold cursor-pointer"
                        title="Remove from offline cache"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Offline Ready</span>
                        <Trash2 className="w-3 h-3 ml-1 opacity-70" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSaveOffline(note)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save Offline</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleProfileList('bookmarkedNoteIds', note.id)}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        isBookmarked
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Bookmark note"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleProfileList('completedNoteIds', note.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Distraction-Free Reader Modal */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-950">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeNote.subject} · Class {activeNote.className} · {activeNote.chapter}
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeNote.title}
                </h3>
                {activeMeta && (
                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    Cached in IndexedDB · {activeMeta.fileName} ({activeMeta.sizeLabel})
                    {activeMeta.downloadedAt ? ` · Saved ${formatShortDate(activeMeta.downloadedAt)}` : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNote(null);
                  setOfflinePdfPreviewUrl(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 bg-transparent p-0 border-0">
                  {activeNote.summary}
                </pre>
              </div>

              {readerPdfSrc ? (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Attached PDF Document ({activeMeta?.fileName || activeNote.fileName || 'Study Material.pdf'})
                      {offlinePdfPreviewUrl && ' · Loaded Offline'}
                    </p>
                    <a
                      href={readerPdfSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={activeMeta?.fileName || activeNote.fileName || 'study-note.pdf'}
                      onClick={() => handleTrackPdfDownload(activeNote)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2942] dark:text-amber-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open / Download PDF</span>
                    </a>
                  </div>
                  <iframe
                    src={readerPdfSrc}
                    title={activeNote.title}
                    className="w-full h-96 rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                  />
                </div>
              ) : activeNote.pdfUrl && !isOnline ? (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200">
                  The remote PDF attachment ({activeNote.fileName || 'Study Material.pdf'}) has not been downloaded for offline viewing yet. The full chapter revision notes above remain readable offline.
                </div>
              ) : null}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Faculty: {activeNote.authorName}
              </span>
              <div className="flex items-center gap-2">
                {!offlineSet.has(activeNote.id) && (
                  <button
                    type="button"
                    onClick={() => handleSaveOffline(activeNote)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Offline</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadTextStudySheet(activeNote)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F2942] dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Revision Sheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
