import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Globe2, MapPinned, Video } from 'lucide-react';
import { TrafficDataProvider } from './context/TrafficDataContext';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import IntersectionPage from './components/IntersectionPage';
import EventsPage from './components/EventsPage';
import ReportForPdf from './components/ReportForPdf';
import domtoimage from 'dom-to-image';
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
  const pdfCaptureRef = useRef(null);

  useEffect(() => {
    if (!pdfCaptureRequest || !pdfCaptureRef.current) return;
    const el = pdfCaptureRef.current;
    const originalLeft = el.style.left;
    const originalTop = el.style.top;
    const originalZIndex = el.style.zIndex;
    const originalOpacity = el.style.opacity;

    const timer = setTimeout(() => {
      if (!el?.firstElementChild) {
        setPdfCaptureRequest(null);
        return;
      }
      const node = el.firstElementChild;

      // Move report on-screen so browser paints charts (required for dom-to-image)
      el.style.left = '0';
      el.style.top = '0';
      el.style.zIndex = '9999';
      el.style.opacity = '0.02';

      const doCapture = () => {
        domtoimage
          .toPng(node, { bgcolor: '#f8fafc' })
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
              img.onerror = () => reject(new Error('Failed to load capture image'));
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
            toast.error('PDF export failed', { id: 'pdf-gen', description: err?.message || 'Could not capture report.' });
          })
          .finally(() => {
            el.style.left = originalLeft;
            el.style.top = originalTop;
            el.style.zIndex = originalZIndex;
            el.style.opacity = originalOpacity;
            setPdfCaptureRequest(null);
          });
      };

      // Wait for browser to paint the now-visible report (charts need layout/paint)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(doCapture, 150);
        });
      });
    }, 1800);
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

        {/* Hidden report view for PDF capture */}
        <div
          aria-hidden="true"
          ref={pdfCaptureRef}
          style={{
            position: 'fixed',
            left: -9999,
            top: 0,
            width: 920,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          {pdfCaptureRequest && (
            <ReportForPdf reportData={pdfCaptureRequest.reportData} options={pdfCaptureRequest.options} />
          )}
        </div>
      </div>
    </div>
    </TrafficDataProvider>
  );
}
