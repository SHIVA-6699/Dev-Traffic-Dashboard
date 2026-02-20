import { toast } from 'sonner';

const FALLBACK_RISK = [0, 0, 0, 0, 0, 1, 2, 3, 4, 3, 2, 2, 2, 2, 3, 3, 4, 4, 4, 3, 2, 1, 1, 0];
const HOUR_LABELS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

// Strong, distinct colors so filter changes are obvious (0=green → 4=red)
const RISK_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];

function getRiskColor(risk) {
  const level = Math.min(4, Math.max(0, Number(risk)));
  return RISK_COLORS[level];
}

const FILTER_STYLES = {
  daily: { label: 'Daily', bg: '#dbeafe', color: '#1d4ed8', border: '#3b82f6' },
  weekly: { label: 'Weekly', bg: '#fef3c7', color: '#b45309', border: '#f59e0b' },
  monthly: { label: 'Monthly', bg: '#ede9fe', color: '#5b21b6', border: '#8b5cf6' },
};

function formatHour(i) {
  if (i === 0) return '12 AM';
  if (i === 12) return '12 PM';
  return i < 12 ? `${i} AM` : `${i - 12} PM`;
}

export default function RiskHeatmap({ riskByHour, vehicleCountByHour, dataPeriodLabel, filterType = 'daily' }) {
  const levels = Array.isArray(riskByHour) && riskByHour.length === 24 ? riskByHour : FALLBACK_RISK;
  const counts = Array.isArray(vehicleCountByHour) && vehicleCountByHour.length === 24
    ? vehicleCountByHour.map((d) => d.value)
    : null;
  const filterStyle = FILTER_STYLES[filterType] || FILTER_STYLES.daily;

  const handleCellClick = (hour, risk) => {
    const count = counts != null ? counts[hour] : null;
    const countStr = count != null ? `${count.toLocaleString()} vehicles` : 'from CSV volume';
    toast.info(`Risk at ${formatHour(hour)}`, {
      description: `Level ${risk} of 4 — ${risk === 0 ? 'Low' : risk <= 2 ? 'Moderate' : risk <= 3 ? 'High' : 'Peak'} • ${countStr}`,
    });
  };

  const cellTitle = (hour, risk) => {
    const countStr = counts != null && counts[hour] != null ? ` (${counts[hour].toLocaleString()} vehicles)` : '';
    return `Hour ${hour}: Risk Level ${risk}${countStr}`;
  };

  return (
    <div className="chart-container risk-heatmap-container">
      <div className="chart-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', rowGap: '6px' }}>
        <h2 style={{ margin: 0 }}>Time-of-Day Risk Heatmap</h2>
        <span
          className="risk-heatmap-filter-badge"
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '9999px',
            backgroundColor: filterStyle.bg,
            color: filterStyle.color,
            border: `2px solid ${filterStyle.border}`,
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {filterStyle.label}
          {dataPeriodLabel ? ` • ${dataPeriodLabel}` : ''}
        </span>
      </div>
      <div className="heatmap-grid" role="img" aria-label="Risk by hour">
        {levels.map((risk, i) => (
          <button
            key={`${i}-${risk}`}
            type="button"
            className="heatmap-cell heatmap-cell--btn"
            style={{ background: getRiskColor(risk) }}
            title={cellTitle(i, risk)}
            onClick={() => handleCellClick(i, risk)}
          >
            <span
              className="heatmap-cell-value"
              aria-hidden="true"
              style={{ color: risk >= 3 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)' }}
            >
              {risk}
            </span>
          </button>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
    </div>
  );
}
