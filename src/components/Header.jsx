import { FileBarChart2, Download, Calendar } from 'lucide-react';
import { useTrafficData } from '../context/TrafficDataContext';
import { fetchDataByRange, fetchDataForDate } from '../data/parseTrafficCsv';
import { ALL_CSV_DAYS } from '../data/csvPaths';

export default function Header({ timeFilter, setTimeFilter, dateRange, onDateRangeChange, selectedDate, onSelectedDateChange, selectedIntersection, onRequestPdf, onTimeFilterChange }) {
  const { weekData, loading } = useTrafficData();

  const handleTimeFilter = (value) => {
    setTimeFilter(value);
    onTimeFilterChange?.(value);
  };

  const handleDownload = async () => {
    if (loading) return;
    if (!onRequestPdf) return;
    try {
      const reportData = selectedDate
        ? await fetchDataForDate(selectedDate, 80)
        : await fetchDataByRange(dateRange, 80);
      onRequestPdf({
        reportData,
        options: {
          reportType: selectedDate ? 'daily' : dateRange,
          selectedDate: selectedDate ?? null,
          selectedIntersection: selectedIntersection ?? undefined,
        },
      });
    } catch (err) {
      // silent fail on download
    }
  };

  const handleDateSelect = (e) => {
    const value = e.target.value || null;
    onSelectedDateChange?.(value);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1>
          <img src="/irislogo.png" alt="IRIS Mobility" className="header-logo" />
        </h1>
      </div>
      <div className="header-right">
        <div className="header-date-filter">
          <label htmlFor="header-date-select" className="header-date-label">
            <Calendar className="header-date-icon" size={18} />
            Date
          </label>
          <select
            id="header-date-select"
            className="select select--header-date"
            value={selectedDate ?? ''}
            onChange={handleDateSelect}
            aria-label="Select date (available CSV files)"
          >
            <option value="">By range (Daily/Weekly/Monthly)</option>
            {ALL_CSV_DAYS.map((d) => (
              <option key={d.date} value={d.date}>
                {d.dateLabel} ({d.date})
              </option>
            ))}
          </select>
        </div>
        <div className="report-buttons">
          <button
            type="button"
            className={`report-btn ${dateRange === 'daily' ? 'active' : ''}`}
            onClick={() => onDateRangeChange?.('daily')}
          >
            <FileBarChart2 className="btn-icon" />
            Daily
          </button>
          <button
            type="button"
            className={`report-btn ${dateRange === 'weekly' ? 'active' : ''}`}
            onClick={() => onDateRangeChange?.('weekly')}
          >
            <FileBarChart2 className="btn-icon" />
            Weekly
          </button>
          <button
            type="button"
            className={`report-btn ${dateRange === 'monthly' ? 'active' : ''}`}
            onClick={() => onDateRangeChange?.('monthly')}
          >
            <FileBarChart2 className="btn-icon" />
            Monthly
          </button>
          <button type="button" className="report-btn report-btn--download" onClick={handleDownload}>
            <Download className="btn-icon" />
            Download
          </button>
        </div>
      </div>
    </header>
  );
}
