import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Globe2, MapPinned, Video } from 'lucide-react';
import { TrafficDataProvider } from './context/TrafficDataContext';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import IntersectionPage from './components/IntersectionPage';
import EventsPage from './components/EventsPage';
import ReportForPdf from './components/ReportForPdf';
import { toPng } from 'html-to-image';
import { generateReportPdfFromCanvas } from './data/pdfExport';
import './App.css';

const TABS = [
  { id: 'overview', label: 'City Overview', icon: Globe2 },
  { id: 'intersection', label: 'Intersection Detail', icon: MapPinned },
  { id: 'events', label: 'Events & Evidence', icon: Video },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeFilter, setTimeFilter] = useState('aggregated');
  const [dateRange, setDateRange] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedIntersection, setSelectedIntersection] = useState('Main St & 5th Ave');
  const [pdfCaptureRequest, setPdfCaptureRequest] = useState(null);
  const pdfReportRef = useRef(null);

  useEffect(() => {
    if (!pdfCaptureRequest || !pdfReportRef.current) return;
    const node = pdfReportRef.current;
    const timer = setTimeout(() => {
      toPng(node, { backgroundColor: '#f8fafc', cacheBust: true, pixelRatio: 2 })
        .then((dataUrl) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
          });
        })
        .then((canvas) => {
          generateReportPdfFromCanvas(canvas, {
            ...pdfCaptureRequest.options,
            reportData: pdfCaptureRequest.reportData,
          });
          const label = pdfCaptureRequest.options.reportType === 'daily' ? 'Daily' : pdfCaptureRequest.options.reportType === 'weekly' ? 'Weekly' : 'Monthly';
          toast.success(`${label} report downloaded`, { id: 'pdf-gen', description: 'PDF with charts and data saved.' });
        })
        .catch((err) => {
          toast.error('PDF export failed', { id: 'pdf-gen', description: err?.message || 'Could not capture charts.' });
        })
        .finally(() => setPdfCaptureRequest(null));
    }, 2500);
    return () => clearTimeout(timer);
  }, [pdfCaptureRequest]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const label = TABS.find((t) => t.id === tabId)?.label ?? tabId;
    toast.success(label, { description: 'View updated', duration: 2000 });
  };

  return (
    <TrafficDataProvider dateRange={dateRange} selectedDate={selectedDate}>
    <div className="dashboard-wrap">
      <div className="container">
        <Header
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          selectedIntersection={selectedIntersection}
          onRequestPdf={setPdfCaptureRequest}
          onTimeFilterChange={(v) => toast.info(v === 'aggregated' ? 'Showing time-aggregated data' : 'Showing data by time')}
        />

        <nav className="tabs" role="tablist" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon && <tab.icon className="tab-icon" />}
              {tab.label}
            </button>
          ))}
        </nav>

        <main>
          <div
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            hidden={activeTab !== 'overview'}
            className={`page ${activeTab === 'overview' ? 'active' : ''}`}
          >
            {activeTab === 'overview' && <OverviewPage timeFilter={timeFilter} />}
          </div>
          <div
            id="panel-intersection"
            role="tabpanel"
            aria-labelledby="tab-intersection"
            hidden={activeTab !== 'intersection'}
            className={`page ${activeTab === 'intersection' ? 'active' : ''}`}
          >
            {activeTab === 'intersection' && (
              <IntersectionPage
                selectedIntersection={selectedIntersection}
                setSelectedIntersection={setSelectedIntersection}
              />
            )}
          </div>
          <div
            id="panel-events"
            role="tabpanel"
            aria-labelledby="tab-events"
            hidden={activeTab !== 'events'}
            className={`page ${activeTab === 'events' ? 'active' : ''}`}
          >
            {activeTab === 'events' && <EventsPage />}
          </div>
        </main>

        {/* Visible overlay for PDF capture so charts paint; captured after 2.5s */}
        {pdfCaptureRequest && (
          <div
            className="pdf-capture-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: '#f8fafc',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div ref={pdfReportRef}>
              <ReportForPdf reportData={pdfCaptureRequest.reportData} options={pdfCaptureRequest.options} />
            </div>
          </div>
        )}
      </div>
    </div>
    </TrafficDataProvider>
  );
}
