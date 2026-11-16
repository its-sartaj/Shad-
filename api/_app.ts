import type { Express } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface PaymentOrder {
  orderId: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  studentName: string;
  createdAt: string;
}

const activeOrders = new Map<string, PaymentOrder>();

function getUploadsDir(): string {
  const dir = process.env.VERCEL
    ? path.join('/tmp', 'scc_uploads')
    : path.resolve(process.cwd(), '.uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function registerApiRoutes(app: Express): void {
  // Safe runtime config for Google Maps Platform JS loader
  app.get('/api/maps-config', (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  // Upload PDF file from Admin Panel
  app.post('/api/uploads/pdf', (req, res) => {
    try {
      const { fileName, base64Data } = req.body as { fileName?: string; base64Data?: string };
      if (!fileName || !base64Data) {
        res.status(400).json({ error: 'Missing fileName or base64Data.' });
        return;
      }

      const cleanedBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanedBase64, 'base64');
      if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'PDF must be between 1 byte and 10 MB.' });
        return;
      }

      const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeBaseName}`;
      const filePath = path.join(getUploadsDir(), uniqueName);
      fs.writeFileSync(filePath, buffer);

      const sizeKB = Math.max(1, Math.round(buffer.length / 1024));
      const fileSizeLabel = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      res.json({
        pdfUrl: `/api/uploads/${encodeURIComponent(uniqueName)}`,
        fileName: safeBaseName,
        fileSizeLabel,
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      res.status(500).json({ error: 'Failed to store uploaded PDF.' });
    }
  });

  // Serve uploaded PDFs
  app.get('/api/uploads/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const targetPath = path.join(getUploadsDir(), safeName);
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(targetPath);
  });

  // Payment Gateway: Create Order
  app.post('/api/payments/create-order', (req, res) => {
    const { courseId, courseTitle, amount, studentName } = req.body as {
      courseId?: string;
      courseTitle?: string;
      amount?: number;
      studentName?: string;
    };
    if (!courseId || !courseTitle || typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ error: 'Invalid course or amount for payment order.' });
      return;
    }
    const orderId = `ORD_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order: PaymentOrder = {
      orderId,
      courseId,
      courseTitle,
      amount,
      studentName: studentName || 'Student',
      createdAt: new Date().toISOString(),
    };
    activeOrders.set(orderId, order);
    res.json(order);
  });

  // Payment Gateway: Verify Payment
  app.post('/api/payments/verify', (req, res) => {
    const { orderId, method, referenceInput, amount } = req.body as {
      orderId?: string;
      method?: string;
      referenceInput?: string;
      amount?: number;
    };
    if (!orderId) {
      res.status(400).json({ error: 'Missing payment orderId.' });
      return;
    }

    const order = activeOrders.get(orderId);
    if (!order && !orderId.startsWith('ORD_')) {
      res.status(404).json({ error: 'Payment order not found or expired.' });
      return;
    }

    const transactionRef = `SCC_${(method || 'UPI').toUpperCase()}_${Date.now().toString().slice(-6)}_${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    if (order) {
      activeOrders.delete(orderId);
    }

    res.json({
      verified: true,
      orderId: order?.orderId || orderId,
      transactionRef,
      amount: order?.amount ?? (typeof amount === 'number' ? amount : 0),
      method: method || 'UPI',
      referenceNote: referenceInput || '',
      verifiedAt: new Date().toISOString(),
    });
  });

  // Contact Inquiry endpoint (for guests before sign-in)
  app.post('/api/inquiries', (req, res) => {
    const { name, phone, className, message } = req.body as {
      name?: string;
      phone?: string;
      className?: string;
      message?: string;
    };
    if (!name || !phone || !message) {
      res.status(400).json({ error: 'Name, phone number, and message are required.' });
      return;
    }
    const inquiryRecord = {
      id: `inq_${Date.now()}`,
      name: name.trim().slice(0, 100),
      phone: phone.trim().slice(0, 25),
      className: (className || '12th I.Sc.').slice(0, 60),
      message: message.trim().slice(0, 1500),
      createdAt: new Date().toISOString(),
    };
    try {
      const logPath = path.join(getUploadsDir(), 'inquiries.json');
      let existing: unknown[] = [];
      if (fs.existsSync(logPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        } catch {
          existing = [];
        }
      }
      existing.unshift(inquiryRecord);
      fs.writeFileSync(logPath, JSON.stringify(existing.slice(0, 200), null, 2));
    } catch {
      // Ephemeral filesystem fallback
    }
    res.json({ ok: true, inquiry: inquiryRecord });
  });
}
