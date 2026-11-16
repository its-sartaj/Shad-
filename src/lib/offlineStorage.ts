import { useEffect, useState } from 'react';
import { StudyNote } from '../types';

const DB_NAME = 'shad_concept_offline_db';
const DB_VERSION = 2;
const NOTES_STORE = 'offline_notes';
const PDF_STORE = 'offline_pdfs';
const PDF_META_STORE = 'offline_pdf_metadata';

export interface OfflineNoteRecord {
  note: StudyNote;
  savedAt: string;
  hasPdfBlob: boolean;
}

export interface OfflinePdfMetadata {
  noteId: string;
  title: string;
  subject: StudyNote['subject'];
  className: StudyNote['className'];
  chapter: string;
  authorName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  sourceUrl?: string;
  isPdfBinary: boolean;
  downloadedAt: string;
  lastReadAt?: string;
}

export function formatStorageSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'note.id' });
      }
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PDF_META_STORE)) {
        db.createObjectStore(PDF_META_STORE, { keyPath: 'noteId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putPdfMetadata(meta: OfflinePdfMetadata): Promise<void> {
  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PDF_META_STORE, 'readwrite');
    tx.objectStore(PDF_META_STORE).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function fetchAndCachePdfBlob(
  note: StudyNote
): Promise<{ blob: Blob; fileName: string; mimeType: string } | null> {
  if (!note.pdfUrl) return null;
  try {
    const res = await fetch(note.pdfUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const fileName = note.fileName || `${note.id}.pdf`;
    const mimeType = blob.type || 'application/pdf';
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PDF_STORE, 'readwrite');
      tx.objectStore(PDF_STORE).put({ id: note.id, blob, fileName });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { blob, fileName, mimeType };
  } catch {
    return null;
  }
}

export async function saveNoteForOffline(note: StudyNote): Promise<OfflineNoteRecord> {
  const cachedPdf = await fetchAndCachePdfBlob(note);
  const hasPdfBlob = Boolean(cachedPdf);
  const now = new Date().toISOString();

  const summaryBytes = new TextEncoder().encode(
    `${note.title}\n${note.chapter}\n${note.summary}`
  ).byteLength;
  const sizeBytes = cachedPdf ? cachedPdf.blob.size : summaryBytes;

  const meta: OfflinePdfMetadata = {
    noteId: note.id,
    title: note.title,
    subject: note.subject,
    className: note.className,
    chapter: note.chapter,
    authorName: note.authorName,
    fileName: cachedPdf?.fileName || note.fileName || `${note.id}.txt`,
    mimeType: cachedPdf?.mimeType || 'text/plain',
    sizeBytes,
    sizeLabel: cachedPdf ? formatStorageSize(sizeBytes) : note.fileSizeLabel || formatStorageSize(sizeBytes),
    ...(note.pdfUrl ? { sourceUrl: note.pdfUrl } : {}),
    isPdfBinary: hasPdfBlob,
    downloadedAt: now,
  };

  await putPdfMetadata(meta);

  const record: OfflineNoteRecord = {
    note,
    savedAt: now,
    hasPdfBlob,
  };

  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    tx.objectStore(NOTES_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function recordDownloadedPdfMetadata(
  note: StudyNote,
  options?: {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    isPdfBinary?: boolean;
  }
): Promise<OfflinePdfMetadata> {
  const cachedPdf = note.pdfUrl ? await fetchAndCachePdfBlob(note) : null;
  const fallbackBytes = new TextEncoder().encode(
    `${note.title}\n${note.chapter}\n${note.summary}`
  ).byteLength;
  const sizeBytes = cachedPdf?.blob.size ?? options?.sizeBytes ?? fallbackBytes;
  const isPdfBinary = Boolean(cachedPdf) || Boolean(options?.isPdfBinary);
  const now = new Date().toISOString();

  const existing = await getPdfMetadataById(note.id);
  const meta: OfflinePdfMetadata = {
    noteId: note.id,
    title: note.title,
    subject: note.subject,
    className: note.className,
    chapter: note.chapter,
    authorName: note.authorName,
    fileName: options?.fileName || cachedPdf?.fileName || note.fileName || `${note.id}.pdf`,
    mimeType: options?.mimeType || cachedPdf?.mimeType || (isPdfBinary ? 'application/pdf' : 'text/plain'),
    sizeBytes,
    sizeLabel: formatStorageSize(sizeBytes),
    ...(note.pdfUrl ? { sourceUrl: note.pdfUrl } : {}),
    isPdfBinary,
    downloadedAt: now,
    ...(existing?.lastReadAt ? { lastReadAt: existing.lastReadAt } : {}),
  };

  await putPdfMetadata(meta);

  // Also persist the note record in offline_notes so the note stays browseable offline
  const db = await openOfflineDB();
  const existingNoteRecord = await new Promise<OfflineNoteRecord | undefined>((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const req = tx.objectStore(NOTES_STORE).get(note.id);
    req.onsuccess = () => resolve(req.result as OfflineNoteRecord | undefined);
    req.onerror = () => resolve(undefined);
  });

  if (!existingNoteRecord || (isPdfBinary && !existingNoteRecord.hasPdfBlob)) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(NOTES_STORE, 'readwrite');
      tx.objectStore(NOTES_STORE).put({
        note,
        savedAt: existingNoteRecord?.savedAt || now,
        hasPdfBlob: isPdfBinary || Boolean(existingNoteRecord?.hasPdfBlob),
      } satisfies OfflineNoteRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  return meta;
}

export async function getPdfMetadataById(noteId: string): Promise<OfflinePdfMetadata | null> {
  try {
    const db = await openOfflineDB();
    return await new Promise<OfflinePdfMetadata | null>((resolve, reject) => {
      const tx = db.transaction(PDF_META_STORE, 'readonly');
      const req = tx.objectStore(PDF_META_STORE).get(noteId);
      req.onsuccess = () => resolve((req.result as OfflinePdfMetadata | undefined) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getAllPdfMetadata(): Promise<OfflinePdfMetadata[]> {
  try {
    const db = await openOfflineDB();
    return await new Promise<OfflinePdfMetadata[]>((resolve, reject) => {
      const tx = db.transaction(PDF_META_STORE, 'readonly');
      const req = tx.objectStore(PDF_META_STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflinePdfMetadata[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function markOfflineNoteRead(noteId: string): Promise<void> {
  try {
    const existing = await getPdfMetadataById(noteId);
    if (!existing) return;
    await putPdfMetadata({
      ...existing,
      lastReadAt: new Date().toISOString(),
    });
  } catch {
    // Non-fatal metadata update
  }
}

export async function removeOfflineNote(noteId: string): Promise<void> {
  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([NOTES_STORE, PDF_STORE, PDF_META_STORE], 'readwrite');
    tx.objectStore(NOTES_STORE).delete(noteId);
    tx.objectStore(PDF_STORE).delete(noteId);
    tx.objectStore(PDF_META_STORE).delete(noteId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOfflineNotes(): Promise<OfflineNoteRecord[]> {
  try {
    const db = await openOfflineDB();
    return await new Promise<OfflineNoteRecord[]>((resolve, reject) => {
      const tx = db.transaction(NOTES_STORE, 'readonly');
      const req = tx.objectStore(NOTES_STORE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineNoteRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getOfflinePdfUrl(noteId: string): Promise<string | null> {
  try {
    const db = await openOfflineDB();
    const record = await new Promise<{ id: string; blob: Blob } | undefined>((resolve, reject) => {
      const tx = db.transaction(PDF_STORE, 'readonly');
      const req = tx.objectStore(PDF_STORE).get(noteId);
      req.onsuccess = () => resolve(req.result as { id: string; blob: Blob } | undefined);
      req.onerror = () => reject(req.error);
    });
    if (record?.blob) {
      return URL.createObjectURL(record.blob);
    }
    return null;
  } catch {
    return null;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
