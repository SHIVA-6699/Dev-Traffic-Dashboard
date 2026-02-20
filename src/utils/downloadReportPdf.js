import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const RANGE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

/**
 * Generate and download a PDF report for the current date range (daily/weekly/monthly).
 * @param {object} weekData - From useTrafficData() (must be loaded)
 * @param {string} dateRange - 'daily' | 'weekly' | 'monthly'
 */
export function downloadReportPdf(weekData, dateRange = 'weekly') {
  if (!weekData) return false;

  const rangeLabel = RANGE_LABELS[dateRange] ?? 'Weekly';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 16;
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('IRIS Mobility – Traffic Analytics Report', margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rangeLabel} Report • Period: ${weekData.dateRangeLabel ?? '—'}`, margin, y);
  y += 14;

  // Summary stats
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const totalVehicles = weekData.totalVehicles != null ? weekData.totalVehicles.toLocaleString() : '—';
  const violations = weekData.overLimit != null ? weekData.overLimit.toLocaleString() : '—';
  const avgSpeed = weekData.avgSpeedMph != null ? `${weekData.avgSpeedMph} mph` : '—';

  doc.text(`Total Vehicles: ${totalVehicles}`, margin, y);
  y += 6;
  doc.text(`Violations (≥50 mph): ${violations}`, margin, y);
  y += 6;
  doc.text(`Avg Speed: ${avgSpeed}`, margin, y);
  y += 14;

  // Top Flows by Direction
  const flows = weekData.topFlowsByDirection || [];
  if (flows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Top Flows by Direction', margin, y);
    y += 8;

    const avgFromStats = (s) => (s && /avg\s+(\d+)\s+mph/.test(s) ? `${s.match(/avg\s+(\d+)\s+mph/)[1]} mph` : '—');
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
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : y + 40;
  }

  // Speeding by day (if multiple days)
  const speedingByDay = weekData.speedingByDay || [];
  if (speedingByDay.length > 0) {
    if (y > 240) doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Speeding by Day (≥50 mph)', margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Day', 'Count']],
      body: speedingByDay.map((d) => [d.day ?? '—', String(d.count ?? 0)]),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 10 },
    });
  }

  // Footer on first page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated from CSV data • IRIS Mobility Traffic Analytics Dashboard`,
    margin,
    doc.internal.pageSize.height - 12
  );

  const safeLabel = (weekData.dateRangeLabel ?? 'report').replace(/\s*[–—]\s*/g, '-').replace(/\s/g, '');
  const filename = `traffic-report-${dateRange}-${safeLabel}.pdf`;
  doc.save(filename);
  return true;
}
