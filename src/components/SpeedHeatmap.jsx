import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { toast } from 'sonner';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { SEPTEMBER_CSV_DAYS, getCsvUrl } from '../data/csvPaths';
import { fetchAndParseCsv } from '../data/parseTrafficCsv';
import OverviewPage from './OverviewPage';
const CENTER = [40.7128, -74.006];

const DIRECTION_OFFSETS = {
  north: [0.0012, 0],
  south: [-0.0012, 0],
  east: [0, 0.0015],
  west: [0, -0.0015],
};

const FALLBACK_SEGMENTS = [
  { id: 'north', label: 'Northbound', offset: [0.0012, 0], avgSpeedMph: 32, volume: 12450 },
  { id: 'south', label: 'Southbound', offset: [-0.0012, 0], avgSpeedMph: 36, volume: 10234 },
  { id: 'east', label: 'Eastbound', offset: [0, 0.0015], avgSpeedMph: 34, volume: 8891 },
  { id: 'west', label: 'Westbound', offset: [0, -0.0015], avgSpeedMph: 38, volume: 9567 },
];

function speedToColor(speedMph) {
  if (speedMph <= 25) return '#0a3161';
  if (speedMph <= 35) return '#eab308';
  if (speedMph <= 45) return '#f97316';
  return '#b31942';
}

function volumeToRadius(volume) {
  const base = Math.sqrt(volume) / 15;
  return Math.min(Math.max(base, 8), 24);
}

export default function SpeedHeatmap({ onReport }) {
  const [speedFilter, setSpeedFilter] = useState('aggregated');
  const [selectedDay, setSelectedDay] = useState(null);
  const [segments, setSegments] = useState(FALLBACK_SEGMENTS);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState("aggregated");
  const handleTimeFilter = (value) => {
    setTimeFilter(value);
    onTimeFilterChange?.(value);
  };
  useEffect(() => {
    if (selectedDay == null) {
      setSegments(FALLBACK_SEGMENTS);
      return;
    }
    const file = SEPTEMBER_CSV_DAYS.find((d) => d.day === selectedDay)?.file;
    if (!file) return;
    setLoading(true);
    fetchAndParseCsv(getCsvUrl(file))
      .then((agg) => {
        const list = agg.map((a) => ({
          id: a.id,
          label: a.label,
          offset: DIRECTION_OFFSETS[a.id] || [0, 0],
          avgSpeedMph: a.avgSpeedMph,
          volume: a.volume,
        }));
        setSegments(list);
      })
      .catch((err) => {
        toast.error('Could not load CSV', { description: err?.message || 'Check file path.' });
        setSegments(FALLBACK_SEGMENTS);
      })
      .finally(() => setLoading(false));
  }, [selectedDay]);

  const handleReport = (type) => {
    onReport?.(type);
  };

  return (
    <div className="chart-container " style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
      <div className="chart-header">
        <h2>Speed Map by Direction</h2>
        <div className="filter-group">
          <select
            className="select select--day"
            value={selectedDay ?? ''}
            onChange={(e) => setSelectedDay(e.target.value ? Number(e.target.value) : null)}
            aria-label="Select day"
          >
            <option value="">Demo data</option>
            {SEPTEMBER_CSV_DAYS.map(({ day, file }) => (
              <option key={day} value={day}>
                Sept {day} ({file})
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`filter-btn ${speedFilter === 'aggregated' ? 'active' : ''}`}
            onClick={() => setSpeedFilter('aggregated')}
          >
            Aggregated
          </button>
          <button
            type="button"
            className={`filter-btn ${speedFilter === 'time' ? 'active' : ''}`}
            onClick={() => setSpeedFilter('time')}
          >
            By Time
          </button>
        </div>
      </div>
           
      {loading && (
        <div className="map-loading">
          <span>Loading CSV data…</span>
        </div>
      )}
      <div className="chart-inner speed-map-wrapper">
        <MapContainer
          center={CENTER}
          zoom={15}
          scrollWheelZoom={true}
          className="speed-map-container"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {segments.map((segment) => (
            <CircleMarker
              key={segment.id}
              center={[
                CENTER[0] + segment.offset[0],
                CENTER[1] + segment.offset[1],
              ]}
              radius={volumeToRadius(segment.volume)}
              pathOptions={{
                color: speedToColor(segment.avgSpeedMph),
                fillColor: speedToColor(segment.avgSpeedMph),
                fillOpacity: 0.7,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {},
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.9} permanent={false}>
                <div>
                  <strong>{segment.label}</strong>
                  <br />
                  {segment.avgSpeedMph} mph • {segment.volume.toLocaleString()} vehicles
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="report-buttons report-buttons--center">
        <button type="button" className="report-btn" onClick={() => handleReport('daily')}>
          <Calendar className="btn-icon" />
          Generate Daily Report
        </button>
        <button type="button" className="report-btn" onClick={() => handleReport('weekly')}>
          <TrendingUp className="btn-icon" />
          Generate Weekly Report
        </button>
        <button type="button" className="report-btn" onClick={() => handleReport('monthly')}>
          <TrendingDown className="btn-icon" />
          Generate Monthly Report
        </button>
      </div>
      <OverviewPage timeFilter={handleTimeFilter} />
    </div>
  );
}
