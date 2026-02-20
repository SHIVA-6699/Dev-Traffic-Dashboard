/**
 * Report view used for PDF capture. Accepts reportData (same shape as weekData) and options.
 * Renders the same content as ReportPdfView for html2canvas capture.
 */
import ReportPdfView from './ReportPdfView';

export default function ReportForPdf({ reportData, options = {} }) {
  const reportType = options.reportType || 'weekly';
  return (
    <ReportPdfView
      weekData={reportData}
      dateRange={reportType}
    />
  );
}
