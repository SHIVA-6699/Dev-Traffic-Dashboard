import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const RANGE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

/**
 * Generate and download a PDF. If canvas is provided (from html-to-image capture), charts are included.
 * @param {HTMLCanvasElement|null} canvas - From toPng() capture of ReportForPdf
 * @param {object} options - { reportType, selectedDate?, selectedIntersection?, reportData }
 */
export function generateReportPdfFromCanvas(canvas, options = {}) {
  const reportType = options.reportType || 'weekly';
  const reportData = options.reportData || {};
  const rangeLabel = RANGE_LABELS[reportType] ?? 'Weekly';
  const periodLabel = reportData.dateRangeLabel ?? options.selectedDate ?? '—';

  const hasCanvas = canvas && canvas.width >= 200 && canvas.height >= 200;
  const imgData = hasCanvas ? canvas.toDataURL('image/jpeg', 0.92) : null;
  const imgW = hasCanvas ? canvas.width : 0;
  const imgH = hasCanvas ? canvas.height : 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 6;
  const contentW = pageW - margin * 2;

  // ----- Page 1: Cover + stats -----
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('IRIS Mobility', margin, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Traffic Analytics Report', margin, 20);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`${rangeLabel} Report • ${periodLabel}`, margin, 36);
  if (options.selectedIntersection) {
    doc.setFontSize(9);
    doc.text(`Intersection: ${options.selectedIntersection}`, margin, 42);
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Generated from CSV data', margin, options.selectedIntersection ? 48 : 44);
  doc.setTextColor(0, 0, 0);

  const boxW = (contentW - 9) / 4;
  let x = margin;
  const boxY = options.selectedIntersection ? 54 : 50;
  const boxH = 20;

  const stats = [
    ['Total Vehicles', reportData.totalVehicles != null ? reportData.totalVehicles.toLocaleString() : '—'],
    ['Violations', reportData.overLimit != null ? reportData.overLimit.toLocaleString() : '—'],
    ['Avg Speed', reportData.avgSpeedMph != null ? `${reportData.avgSpeedMph} mph` : '—'],
    ['Period', reportData.dateRangeLabel ?? periodLabel],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  stats.forEach(([label, value], i) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(x, boxY, boxW, boxH, 'S');
    doc.setFillColor(248, 250, 252);
    doc.rect(x + 0.4, boxY + 0.4, boxW - 0.8, boxH - 0.8, 'F');
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 3, boxY + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const valStr = String(value);
    doc.text(valStr.length > 14 ? valStr.slice(0, 12) + '…' : valStr, x + 3, boxY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    x += boxW + 3;
  });

  // ----- Page 2+: Charts image (no gap, full width) then tables -----
  doc.addPage();
  if (hasCanvas && imgData) {
    const imgRatio = imgH / imgW;
    const fitW = contentW;
    const fitH = fitW * imgRatio;
    const sliceH = pageH - margin * 2;
    const numImgPages = fitH <= sliceH ? 1 : Math.ceil(fitH / sliceH);
    if (numImgPages === 1) {
      doc.addImage(imgData, 'JPEG', margin, margin, fitW, fitH);
    } else {
      for (let i = 0; i < numImgPages; i++) {
        if (i > 0) doc.addPage();
        const sy = (i * sliceH / fitH) * imgH;
        const sh = Math.min((sliceH / fitH) * imgH, imgH - sy);
        const dh = (sh / imgH) * fitH;
        doc.addImage(imgData, 'JPEG', margin, margin, fitW, dh, 0, sy, imgW, sh);
      }
    }
    doc.addPage();
  }

  let y = margin + 2;
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Top Flows by Direction', margin, y);
  y += 6;

  const flows = reportData.topFlowsByDirection || [];
  const avgFromStats = (s) => (s && /avg\s+(\d+)\s+mph/.test(s) ? `${s.match(/avg\s+(\d+)\s+mph/)[1]} mph` : '—');
  if (flows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Rank', 'Direction', 'Vehicles', 'Avg Speed']],
      body: flows.map((f) => [
        String(f.rank ?? '—'),
        f.name ?? '—',
        (f.volume ?? 0).toLocaleString(),
        avgFromStats(f.stats),
      ]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 20;
  }

  const speedingByDay = reportData.speedingByDay || [];
  if (speedingByDay.length > 0) {
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 6;
    if (y > pageH - 40) { doc.addPage(); y = margin + 2; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Speeding by Day (≥50 mph)', margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Day', 'Count']],
      body: speedingByDay.map((d) => [d.day ?? '—', String(d.count ?? 0)]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
    });
  }

  const riskByHour = reportData.riskByHour;
  if (Array.isArray(riskByHour) && riskByHour.length === 24) {
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 6;
    if (y > pageH - 50) { doc.addPage(); y = margin + 2; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('Risk by Hour (0=low, 4=high)', margin, y);
    y += 5;
    const hourLabels = Array.from({ length: 24 }, (_, i) => i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`);
    autoTable(doc, {
      startY: y,
      head: [['Hour', 'Risk', 'Hour', 'Risk', 'Hour', 'Risk']],
      body: (() => {
        const rows = [];
        for (let i = 0; i < 24; i += 3) {
          rows.push([
            hourLabels[i] || '—',
            String(riskByHour[i] ?? '—'),
            hourLabels[i + 1] || '—',
            String(riskByHour[i + 1] ?? '—'),
            hourLabels[i + 2] || '—',
            String(riskByHour[i + 2] ?? '—'),
          ]);
        }
        return rows;
      })(),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });
  }

  const freqByHour = reportData.vehicleFrequencyByHour || [];
  if (freqByHour.length > 0) {
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 6;
    if (y > pageH - 50) { doc.addPage(); y = margin + 2; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Vehicle Frequency by Hour', margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Time', 'Vehicles']],
      body: freqByHour.slice(0, 24).map((d) => [d.label ?? '—', (d.value ?? 0).toLocaleString()]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  const totalP = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalP; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `IRIS Mobility • Page ${p}/${totalP}`,
      margin,
      doc.internal.pageSize.height - 5
    );
  }

  const safeLabel = (reportData.dateRangeLabel ?? 'report').replace(/\s*[–—]\s*/g, '-').replace(/\s/g, '');
  const filename = `traffic-report-${reportType}-${safeLabel}.pdf`;
  doc.save(filename);
}
