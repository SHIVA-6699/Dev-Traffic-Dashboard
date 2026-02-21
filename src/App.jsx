import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Globe2, MapPinned, Video } from 'lucide-react';
import { TrafficDataProvider } from './context/TrafficDataContext';
import Header from './components/Header';
import OverviewPage from './components/OverviewPage';
import IntersectionPage from './components/IntersectionPage';
import EventsPage from './components/EventsPage';
import ReportForPdf from './components/ReportForPdf';
import html2canvas from 'html2canvas';
import { generateReportPdfFromCanvas } from './data/pdfExport';
import { replaceSvgsWithImages } from './utils/replaceSvgsWithImages';
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
    const wrapper = pdfReportRef.current;
    const node = wrapper.firstElementChild || wrapper;
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            await replaceSvgsWithImages(node);
            requestAnimationFrame(async () => {
              const pageEls = node.querySelectorAll('.report-pdf-page');
              const opts = {
                ...pdfCaptureRequest.options,
                reportData: pdfCaptureRequest.reportData,
              };
              const h2cOpts = {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
              };
              if (pageEls.length >= 2) {
                const canvases = [];
                for (let i = 0; i < pageEls.length; i++) {
                  const el = pageEls[i];
                  const w = Math.max(el.scrollWidth || 900, 900);
                  const h = Math.max(el.scrollHeight || 400, el.offsetHeight || 400);
                  try {
                    const canvas = await html2canvas(el, { ...h2cOpts, width: w, height: h });
                    if (canvas && canvas.width >= 200) canvases.push(canvas);
                  } catch (_) {}
                }
                generateReportPdfFromCanvas(canvases.length ? canvases : null, opts);
              } else {
                const w = Math.max(node.scrollWidth || 900, 900);
                const h = Math.max(node.scrollHeight || 1000, node.offsetHeight || 1000);
                html2canvas(node, { ...h2cOpts, width: w, height: h })
                  .then((canvas) => generateReportPdfFromCanvas(canvas, opts))
                  .catch(() => generateReportPdfFromCanvas(null, opts))
                  .finally(() => setPdfCaptureRequest(null));
                return;
              }
              setPdfCaptureRequest(null);
            });
          } catch (err) {
            const w = Math.max(node.scrollWidth || 900, 900);
            const h = Math.max(node.scrollHeight || 1000, node.offsetHeight || 1000);
            html2canvas(node, {
              width: w,
              height: h,
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false,
            })
              .then((canvas) => {
                generateReportPdfFromCanvas(canvas, {
                  ...pdfCaptureRequest.options,
                  reportData: pdfCaptureRequest.reportData,
                });
              })
              .catch(() => {
                generateReportPdfFromCanvas(null, {
                  ...pdfCaptureRequest.options,
                  reportData: pdfCaptureRequest.reportData,
                });
              })
              .finally(() => setPdfCaptureRequest(null));
          }
        });
      });
    }, 4500);
    return () => clearTimeout(timer);
  }, [pdfCaptureRequest]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const label = TABS.find((t) => t.id === tabId)?.label ?? tabId;
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
          onTimeFilterChange={() => {}}
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
              background: '#ffffff',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: 16,
            }}
          >
            <div ref={pdfReportRef} style={{ width: 900, minHeight: 1, flexShrink: 0 }}>
              <ReportForPdf reportData={pdfCaptureRequest.reportData} options={pdfCaptureRequest.options} />
            </div>
          </div>
        )}
      </div>
    </div>
    </TrafficDataProvider>
  );
}
