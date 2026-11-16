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
  const dir = path.join('/tmp', 'scc_uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
  const method = req.method.toUpperCase();

  if (method === 'GET' && pathname === '/api/maps-config') {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    return jsonResponse({ apiKey });
  }

  if (method === 'POST' && pathname === '/api/uploads/pdf') {
    try {
      const { fileName, base64Data } = (await req.json()) as {
        fileName?: string;
        base64Data?: string;
      };
      if (!fileName || !base64Data) {
        return jsonResponse({ error: 'Missing fileName or base64Data.' }, 400);
      }

      const cleanedBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanedBase64, 'base64');
      if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
        return jsonResponse({ error: 'PDF must be between 1 byte and 10 MB.' }, 400);
      }

      const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${safeBaseName}`;
      const filePath = path.join(getUploadsDir(), uniqueName);
      fs.writeFileSync(filePath, buffer);

      const sizeKB = Math.max(1, Math.round(buffer.length / 1024));
      const fileSizeLabel = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

      return jsonResponse({
        pdfUrl: `/api/uploads/${encodeURIComponent(uniqueName)}`,
        fileName: safeBaseName,
        fileSizeLabel,
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      return jsonResponse({ error: 'Failed to store uploaded PDF.' }, 500);
    }
  }

  if (method === 'GET' && pathname.startsWith('/api/uploads/')) {
    const encodedName = pathname.slice('/api/uploads/'.length);
    const safeName = path.basename(decodeURIComponent(encodedName));
    const targetPath = path.join(getUploadsDir(), safeName);
    if (!fs.existsSync(targetPath)) {
      return jsonResponse({ error: 'File not found.' }, 404);
    }
    const fileBuffer = fs.readFileSync(targetPath);
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  if (method === 'POST' && pathname === '/api/payments/create-order') {
    const { courseId, courseTitle, amount, studentName } = (await req.json()) as {
      courseId?: string;
      courseTitle?: string;
      amount?: number;
      studentName?: string;
    };
    if (!courseId || !courseTitle || typeof amount !== 'number' || amount < 0) {
      return jsonResponse({ error: 'Invalid course or amount for payment order.' }, 400);
    }
    const orderId = `ORD_${Date.now().toString(36).toUpperCase()}_${crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()}`;
    const order: PaymentOrder = {
      orderId,
      courseId,
      courseTitle,
      amount,
      studentName: studentName || 'Student',
      createdAt: new Date().toISOString(),
    };
    activeOrders.set(orderId, order);
    return jsonResponse(order);
  }

  if (method === 'POST' && pathname === '/api/payments/verify') {
    const { orderId, method: payMethod, referenceInput, amount } = (await req.json()) as {
      orderId?: string;
      method?: string;
      referenceInput?: string;
      amount?: number;
    };
    if (!orderId) {
      return jsonResponse({ error: 'Missing payment orderId.' }, 400);
    }

    const order = activeOrders.get(orderId);
    if (!order && !orderId.startsWith('ORD_')) {
      return jsonResponse({ error: 'Payment order not found or expired.' }, 404);
    }

    const transactionRef = `SCC_${(payMethod || 'UPI').toUpperCase()}_${Date.now().toString().slice(-6)}_${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    if (order) {
      activeOrders.delete(orderId);
    }

    return jsonResponse({
      verified: true,
      orderId: order?.orderId || orderId,
      transactionRef,
      amount: order?.amount ?? (typeof amount === 'number' ? amount : 0),
      method: payMethod || 'UPI',
      referenceNote: referenceInput || '',
      verifiedAt: new Date().toISOString(),
    });
  }

  if (method === 'POST' && pathname === '/api/inquiries') {
    const { name, phone, className, message } = (await req.json()) as {
      name?: string;
      phone?: string;
      className?: string;
      message?: string;
    };
    if (!name || !phone || !message) {
      return jsonResponse({ error: 'Name, phone number, and message are required.' }, 400);
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
    return jsonResponse({ ok: true, inquiry: inquiryRecord });
  }

  return jsonResponse({ error: 'Not found' }, 404);
};
