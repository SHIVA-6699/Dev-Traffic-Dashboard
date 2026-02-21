import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SpeedHeatmap from './SpeedHeatmap';
import { useTrafficData } from '../context/TrafficDataContext';

const INTERSECTION_OPTIONS = [
  { id: 'main', name: 'Main St & 5th Ave' },
  { id: 'oak', name: 'Oak Blvd & Elm St' },
  { id: 'park', name: 'Park Ave & Broadway' },
];

const DEFAULT_INTERSECTION = INTERSECTION_OPTIONS[0].name;

export default function IntersectionPage({ selectedIntersection: propIntersection, setSelectedIntersection: setPropIntersection }) {
  const { weekData, loading, error } = useTrafficData();
  const [localIntersection, setLocalIntersection] = useState(DEFAULT_INTERSECTION);
  const selectedIntersection = propIntersection ?? localIntersection;
  const setSelectedIntersection = setPropIntersection ?? setLocalIntersection;

  const handleIntersectionChange = (e) => {
    const name = e.target.value;
    setSelectedIntersection(name);
  };

  const handleReport = () => {};

  const speedingTotal = weekData?.overLimit ?? 0;
  const violationsFromCsv = [
    { type: 'Speeding ≥50 mph', value: speedingTotal, className: 'speeding' },
  ];

  return (
    <>
      <div className="chart-container">
        <div className="chart-header">
          <h2>Intersection: {selectedIntersection}</h2>
          <select
            className="select"
            value={selectedIntersection}
            onChange={handleIntersectionChange}
            aria-label="Select intersection"
          >
            {INTERSECTION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SpeedHeatmap onReport={handleReport} />

      {/* <div className="chart-container">
        <h2>Violation Types (from CSV)</h2>
        <div className="violations-grid">
          {violationsFromCsv.map((v) => (
            <button
              key={v.type}
              type="button"
              className={`violation-card violation-card--btn ${v.className}`}
              onClick={() => {}}
            >
              <h4>{v.type}</h4>
              <div className="value">{loading ? '…' : v.value.toLocaleString()}</div>
              <div className="change">From CSV</div>
            </button>
          ))}
        </div>
      </div> */}

      {/* <div className="chart-container">
        <h2>Vehicle Counts by Direction & Type (from CSV)</h2>
        <div className="chart-inner chart-inner--tall">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={weekData?.directionClassBars || []}
              margin={{ top: 24, right: 16, bottom: 48, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="label" angle={-25} textAnchor="end" height={64} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v?.toLocaleString?.(), 'Count']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {(weekData?.directionClassBars || []).map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> */}

      {/* <div className="chart-container">
        <h2>Speeding Trend by Day (from CSV)</h2>
        <div className="chart-inner chart-inner--tall">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={weekData?.speedingByDay || []}
              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--red-500)" radius={[6, 6, 0, 0]} name="Speeding ≥50 mph" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container">
        <h2>Violation Count by Day (from CSV)</h2>
        <div className="chart-inner chart-inner--tall">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={weekData?.speedingByDay || []}
              margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} name="Speeding events" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> */}
    </>
  );
}
