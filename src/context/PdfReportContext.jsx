import { createContext, useContext, useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { toast } from 'sonner';
import ReportPdfView from '../components/ReportPdfView';

const PdfReportContext = createContext(null);

const RANGE_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

export function PdfReportProvider({ children }) {
  const [captureRequest, setCaptureRequest] = useState(null);
  const containerRef = useRef(null);

  const generatePdf = useCallback(async (weekData, dateRange = 'weekly') => {
    if (!weekData) {
      toast.error('No data available to download.');
      return false;
    }

    setCaptureRequest({ weekData, dateRange });

    // Wait for React to render ReportPdfView, then for charts to paint
    await new Promise((r) => setTimeout(r, 100));

    const container = containerRef.current;
    if (!container || !container.firstElementChild) {
      setCaptureRequest(null);
      toast.error('Report view not ready. Try again.');
      return false;
    }

    const target = container.firstElementChild;

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      setCaptureRequest(null);

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW = canvas.width;
      const imgH = canvas.height;

      const rangeLabel = RANGE_LABELS[dateRange] ?? 'Weekly';
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;

      // ----- Page 1: Cover / Title -----
      doc.setFillColor(22, 163, 74); // green-600
      doc.rect(0, 0, pageW, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('IRIS Mobility', margin, 18);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Traffic Analytics Report', margin, 28);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`${rangeLabel} Report • Period: ${weekData.dateRangeLabel ?? '—'}`, margin, 52);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Generated from CSV data', margin, 60);
      doc.setTextColor(0, 0, 0);

      // Summary boxes on cover
      const boxW = (pageW - margin * 2 - 12) / 4;
      let x = margin;
      const boxY = 72;
      const boxH = 28;

      const stats = [
        ['Total Vehicles', weekData.totalVehicles != null ? weekData.totalVehicles.toLocaleString() : '—'],
        ['Violations', weekData.overLimit != null ? weekData.overLimit.toLocaleString() : '—'],
        ['Avg Speed', weekData.avgSpeedMph != null ? `${weekData.avgSpeedMph} mph` : '—'],
        ['Period', weekData.dateRangeLabel ?? '—'],
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      stats.forEach(([label, value], i) => {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(x, boxY, boxW, boxH, 'S');
        doc.setFillColor(248, 250, 252);
        doc.rect(x + 0.5, boxY + 0.5, boxW - 1, boxH - 1, 'F');
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 4, boxY + 8);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(value).length > 12 ? String(value).slice(0, 10) + '…' : value, x + 4, boxY + 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        x += boxW + 4;
      });

      // ----- Page 2+: Charts image (full report screenshot), split across pages if tall -----
      doc.addPage();
      const imgRatio = imgH / imgW;
      const fitW = pageW - margin * 2;
      const fitH = fitW * imgRatio;
      const sliceHeight = pageH - margin * 2;
      const totalImgPages = fitH <= sliceHeight ? 1 : Math.ceil(fitH / sliceHeight);

      if (totalImgPages === 1) {
        doc.addImage(imgData, 'JPEG', margin, margin, fitW, fitH);
      } else {
        for (let i = 0; i < totalImgPages; i++) {
          if (i > 0) doc.addPage();
          const sy = (i * sliceHeight / fitH) * imgH;
          const sh = Math.min((sliceHeight / fitH) * imgH, imgH - sy);
          const dh = (sh / imgH) * fitH;
          doc.addImage(imgData, 'JPEG', margin, margin, fitW, dh, 0, sy, imgW, sh);
        }
      }

      // ----- Last page: Data tables -----
      doc.addPage();
      let y = 20;

      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Top Flows by Direction', margin, y);
      y += 10;

      const flows = weekData.topFlowsByDirection || [];
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
          styles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 16 : y + 40;
      }

      const speedingByDay = weekData.speedingByDay || [];
      if (speedingByDay.length > 0 && y < pageH - 60) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Speeding by Day (≥50 mph)', margin, y);
        y += 10;
        autoTable(doc, {
          startY: y,
          head: [['Day', 'Count']],
          body: speedingByDay.map((d) => [d.day ?? '—', String(d.count ?? 0)]),
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
        });
      }

      // Footer on all pages
      const totalP = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalP; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `IRIS Mobility Traffic Analytics • Page ${p} of ${totalP}`,
          margin,
          doc.internal.pageSize.height - 10
        );
      }

      const safeLabel = (weekData.dateRangeLabel ?? 'report').replace(/\s*[–—]\s*/g, '-').replace(/\s/g, '');
      const filename = `traffic-report-${dateRange}-${safeLabel}.pdf`;
      doc.save(filename);
      toast.success('Report downloaded', { description: `${rangeLabel} report with all charts saved as PDF.` });
      return true;
    } catch (err) {
      setCaptureRequest(null);
      console.error(err);
      toast.error('Could not generate PDF', { description: err?.message || 'Try again.' });
      return false;
    }
  }, []);

  return (
    <PdfReportContext.Provider value={{ generatePdf, isGenerating: !!captureRequest }}>
      {children}
      {/* Off-screen container for report capture */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 900,
          pointerEvents: 'none',
          visibility: captureRequest ? 'visible' : 'hidden',
          zIndex: -1,
        }}
      >
        {captureRequest && (
          <ReportPdfView
            weekData={captureRequest.weekData}
            dateRange={captureRequest.dateRange}
          />
        )}
      </div>
    </PdfReportContext.Provider>
  );
}

export function usePdfReport() {
  const ctx = useContext(PdfReportContext);
  if (!ctx) throw new Error('usePdfReport must be used inside PdfReportProvider');
  return ctx;
}
