const FALLBACK_RISK = [0, 0, 0, 0, 0, 1, 2, 3, 4, 3, 2, 2, 2, 2, 3, 3, 4, 4, 4, 3, 2, 1, 1, 0];

// Color gradient: 0=low → 4=high (Old Glory Blue to Old Glory Red)
const RISK_COLORS = ['#0a3161', '#3d73a8', '#eab308', '#f97316', '#b31942'];

function getRiskColor(risk) {
  const level = Math.min(4, Math.max(0, Number(risk)));
  return RISK_COLORS[level];
}

const FILTER_STYLES = {
  daily: { label: 'Daily', bg: '#dbeafe', color: '#1d4ed8', border: '#3b82f6' },
  weekly: { label: 'Weekly', bg: '#fef3c7', color: '#b45309', border: '#f59e0b' },
  monthly: { label: 'Monthly', bg: '#ede9fe', color: '#5b21b6', border: '#8b5cf6' },
  custom: { label: 'Custom', bg: '#e0f2fe', color: '#0369a1', border: '#0ea5e9' },
};

function formatHour(i) {
  if (i === 0) return '12 AM';
  if (i === 12) return '12 PM';
  return i < 12 ? `${i} AM` : `${i - 12} PM`;
}

export default function RiskHeatmap({
  riskByHour,
  riskByDayAndHour,
  dayNames,
  vehicleCountByHour,
  dataPeriodLabel,
  filterType = 'daily',
  // Custom range
  availableDays = [],
  customRangeStart = '',
  customRangeEnd = '',
  onCustomRangeChange,
  customRangeData = null,
  customRangeLoading = false,
  onCustomRangeApply,
}) {
  const useCustom = customRangeData != null || customRangeStart !== '' || customRangeEnd !== '';
  const data = useCustom && customRangeData ? customRangeData : null;
  const effectiveRiskByHour = data?.riskByHour ?? riskByHour;
  const effectiveDayRows = data?.riskByDayAndHour ?? riskByDayAndHour;
  const effectiveDayNames = data?.dayNames ?? dayNames;
  const effectiveCounts = data?.vehicleFrequencyByHour ?? vehicleCountByHour;
  const effectivePeriodLabel = data?.dateRangeLabel ?? dataPeriodLabel;

  const levels = Array.isArray(effectiveRiskByHour) && effectiveRiskByHour.length === 24 ? effectiveRiskByHour : FALLBACK_RISK;
  const counts = Array.isArray(effectiveCounts) && effectiveCounts.length === 24
    ? effectiveCounts.map((d) => d.value)
    : (Array.isArray(vehicleCountByHour) && vehicleCountByHour.length === 24 ? vehicleCountByHour.map((d) => d.value) : null);
  const displayFilterType = useCustom && customRangeData ? 'custom' : filterType;
  const filterStyle = FILTER_STYLES[displayFilterType] || FILTER_STYLES.daily;

  const isMultiDay = displayFilterType === 'weekly' || displayFilterType === 'monthly' || (displayFilterType === 'custom' && Array.isArray(effectiveDayRows) && effectiveDayRows.length > 1);
  const dayRows = Array.isArray(effectiveDayRows) && effectiveDayRows.length >= 1 ? effectiveDayRows : null;
  const labels = Array.isArray(effectiveDayNames) && effectiveDayNames.length >= 1 ? effectiveDayNames : null;

  const cellTitle = (hour, risk, dayIndex = null) => {
    const countStr = counts != null && counts[hour] != null ? ` (${counts[hour].toLocaleString()} vehicles)` : '';
    const dayStr = dayIndex != null && labels && labels[dayIndex] ? ` ${labels[dayIndex]}` : '';
    return `Hour ${hour}${dayStr}: Risk Level ${risk}${countStr}`;
  };

  const renderCell = (risk, hourIndex, dayIndex = null) => (
    <button
      key={dayIndex != null ? `d${dayIndex}-h${hourIndex}` : `h${hourIndex}`}
      type="button"
      className="heatmap-cell heatmap-cell--btn"
      style={{ background: getRiskColor(risk) }}
      title={cellTitle(hourIndex, risk, dayIndex)}
      onClick={() => {}}
      aria-label={cellTitle(hourIndex, risk, dayIndex)}
    />
  );

  const handleApplyCustomRange = () => {
    if (customRangeStart && customRangeEnd && customRangeStart <= customRangeEnd && onCustomRangeApply) {
      onCustomRangeApply();
    }
  };
  const handleFromChange = (e) => {
    const v = e.target.value || '';
    if (onCustomRangeChange) onCustomRangeChange(v, customRangeEnd);
  };
  const handleToChange = (e) => {
    const v = e.target.value || '';
    if (onCustomRangeChange) onCustomRangeChange(customRangeStart, v);
  };

  return (
    <div className="chart-container risk-heatmap-container">
      <div className="chart-header risk-heatmap-header">
        <div className="risk-heatmap-title-row">
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
            {(effectivePeriodLabel || dataPeriodLabel) ? ` • ${effectivePeriodLabel || dataPeriodLabel}` : ''}
          </span>
        </div>
        <div className="risk-heatmap-custom-range">
          <span className="risk-heatmap-range-label">Custom range:</span>
          <select
            className="select select--heatmap-date"
            value={customRangeStart}
            onChange={handleFromChange}
            aria-label="From date"
          >
            <option value="">From</option>
            {availableDays.map((d) => (
              <option key={d.date} value={d.date}>{d.dateLabel}</option>
            ))}
          </select>
          <span className="risk-heatmap-range-sep">–</span>
          <select
            className="select select--heatmap-date"
            value={customRangeEnd}
            onChange={handleToChange}
            aria-label="To date"
          >
            <option value="">To</option>
            {availableDays.map((d) => (
              <option key={d.date} value={d.date}>{d.dateLabel}</option>
            ))}
          </select>
          {customRangeStart && customRangeEnd && customRangeStart <= customRangeEnd && (
            <button
              type="button"
              className="filter-btn risk-heatmap-apply-btn"
              onClick={handleApplyCustomRange}
              disabled={customRangeLoading}
            >
              {customRangeLoading ? 'Loading…' : 'Apply'}
            </button>
          )}
        </div>
      </div>

      {isMultiDay && dayRows && dayRows.length >= 1 ? (
        <div className="risk-heatmap-multiday-scroll" role="img" aria-label="Risk by day and hour">
          <div className="risk-heatmap-weekly">
            {dayRows.map((dayLevels, dayIndex) => (
            <div key={dayIndex} className="risk-heatmap-day-row">
              {labels && labels[dayIndex] != null && (
                <span className="risk-heatmap-day-label" aria-hidden="true">{labels[dayIndex]}</span>
              )}
              <div className="heatmap-grid heatmap-grid--day">
                {(Array.isArray(dayLevels) ? dayLevels : []).slice(0, 24).map((risk, hourIndex) =>
                  renderCell(risk, hourIndex, dayIndex)
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="heatmap-grid" role="img" aria-label="Risk by hour">
          {levels.map((risk, i) => renderCell(risk, i, null))}
        </div>
      )}

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
