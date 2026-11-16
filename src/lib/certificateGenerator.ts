export interface CertificateRenderInput {
  studentName: string;
  courseTitle: string;
  scorePercentage: number;
  verificationCode: string;
  issuedDateLabel: string;
}

export function downloadCertificatePng(data: CertificateRenderInput): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clean cream parchment canvas
  ctx.fillStyle = '#FCFBF7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer institutional navy border
  ctx.strokeStyle = '#0F2942';
  ctx.lineWidth = 18;
  ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

  // Inner gold rule
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

  // Header band
  ctx.fillStyle = '#0F2942';
  ctx.fillRect(62, 62, canvas.width - 124, 150);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ESTD. 2010  ·  NEAR H.F.H.S SCHOOL PHENHARA, EAST CHAMPARAN', 800, 114);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('SHAD CONCEPT CLASSES', 800, 174);

  // Certificate Title
  ctx.fillStyle = '#B45309';
  ctx.font = '600 26px sans-serif';
  ctx.fillText('B.S.E.B. & C.B.S.E. BOARD  ·  I.Sc. MERIT & COMPLETION', 800, 290);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 62px Georgia, serif';
  ctx.fillText('Certificate of Achievement', 800, 368);

  // Divider line
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(460, 405);
  ctx.lineTo(1140, 405);
  ctx.stroke();

  // Body copy
  ctx.fillStyle = '#475569';
  ctx.font = '400 28px sans-serif';
  ctx.fillText('This certificate is proudly awarded to', 800, 480);

  ctx.fillStyle = '#0F2942';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText(data.studentName, 800, 565);

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(420, 592);
  ctx.lineTo(1180, 592);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '400 26px sans-serif';
  ctx.fillText('for successfully completing the coursework and qualifying assessment in', 800, 660);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(data.courseTitle, 800, 720);

  ctx.fillStyle = '#0F766E';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`Verified Score: ${data.scorePercentage.toFixed(1)}%   ·   Issued: ${data.issuedDateLabel}`, 800, 785);

  // Signatures
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, 930);
  ctx.lineTo(540, 930);
  ctx.moveTo(1060, 930);
  ctx.lineTo(1380, 930);
  ctx.stroke();

  ctx.fillStyle = '#0F2942';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText('Er. M.N. Alam', 380, 910);
  ctx.fillText('Md Ejaz Alam', 1220, 910);

  ctx.fillStyle = '#475569';
  ctx.font = '600 20px sans-serif';
  ctx.fillText('Physics, Chemistry & Math (9525206317)', 380, 965);
  ctx.fillText('Biology Faculty & Mentor (8521736717)', 1220, 965);

  // Verification seal
  ctx.fillStyle = '#64748B';
  ctx.font = '500 18px monospace';
  ctx.fillText(`Verification ID: ${data.verificationCode}`, 800, 1020);

  const link = document.createElement('a');
  link.download = `SCC_Certificate_${data.studentName.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
