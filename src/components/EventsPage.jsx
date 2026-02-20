import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Video } from 'lucide-react';
import { useTrafficData } from '../context/TrafficDataContext';

const DIRECTION_OPTIONS = [
  { value: '', label: 'All directions' },
  { value: 'Northbound', label: 'Northbound' },
  { value: 'Southbound', label: 'Southbound' },
  { value: 'Eastbound', label: 'Eastbound' },
  { value: 'Westbound', label: 'Westbound' },
];

function buildDayOptions(weekData) {
  const base = [{ value: '', label: 'All days' }];
  if (!weekData?.dayNames?.length || !weekData?.allDates?.length) return base;
  return base.concat(
    weekData.dayNames.map((label, i) => ({ value: weekData.allDates[i], label }))
  );
}

export default function EventsPage() {
  const { weekData, loading, error } = useTrafficData();
  const [directionFilter, setDirectionFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  const events = weekData?.highSpeedEvents || [];

  const dayOptions = useMemo(() => buildDayOptions(weekData), [weekData]);

  const filteredEvents = useMemo(() => {
    return events.filter((row) => {
      if (directionFilter && row.direction !== directionFilter) return false;
      if (dayFilter) {  
        const dateStr = row.ts?.split(/\s+/)[0];
        if (dateStr !== dayFilter) return false;
      }
      return true;
    });
  }, [events, directionFilter, dayFilter]);

  const handleRowClick = (row) => {
    toast.success('Event details', {
      description: `${row.type} — ${row.direction} • ${(row.speedMph ?? (row.speedKmh / 1.609)).toFixed(1)} mph`,
    });
  };

  return (
    <>
      <div className="clips-section">
        <h2><Video className="section-title-icon" /> High-Speed Events</h2>
        <p className="clips-description">
          Speeding events (≥50 mph) from loaded CSV date range. No video clips in dataset.
        </p>
      </div>

      <div className="chart-container">
        <h2>Event Log (from CSV)</h2>
        <div className="filters-row">
          <select
            className="select"
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              toast.info('Filter applied', { description: e.target.value || 'All directions' });
            }}
            aria-label="Filter by direction"
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={dayFilter}
            onChange={(e) => {
              setDayFilter(e.target.value);
              const label = dayOptions.find((o) => o.value === e.target.value)?.label ?? e.target.value;
              toast.info('Filter applied', { description: e.target.value ? label : 'All days' });
            }}
            aria-label="Filter by day"
          >
            {dayOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {(directionFilter || dayFilter) && (
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setDirectionFilter('');
                setDayFilter('');
                toast.success('Filters cleared');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Direction</th>
              <th>Speed (mph)</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="table-empty">Loading CSV…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="table-empty">{error}</td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  No speeding events match the filters. Clear filters or check CSV.
                </td>
              </tr>
            ) : (
              filteredEvents.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => handleRowClick(row)}
                  className="clickable-row"
                >
                  <td>{row.ts}</td>
                  <td><span className="badge badge-speeding">{row.type}</span></td>
                  <td>{row.direction}</td>
                  <td>{row.speedMph ?? (row.speedKmh != null ? (row.speedKmh / 1.609).toFixed(1) : '—')}</td>
                  <td>{row.confidence}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
