/**
 * Full report content rendered for PDF capture: stats, Top Flows, Risk Heatmap, all charts.
 * Rendered in a fixed-width container so html2canvas captures consistently.
 */
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from './StatCard';
import RiskHeatmap from './RiskHeatmap';

const RANGE_LABELS = { daily: 'Day', weekly: 'Week', monthly: 'Month' };

export default function ReportPdfView({ weekData, dateRange = 'weekly' }) {
  const rangeLabel = RANGE_LABELS[dateRange] ?? 'Week';
  const dateCaption = weekData?.dateRangeLabel ?? '—';

  return (
    <div className="report-pdf-view" style={{ width: 900, background: '#ffffff', padding: 16, boxSizing: 'border-box' }}>
      {/* PDF Page 1: stats + Top Flows + Heatmap + Vehicle Frequency (2 graphs) */}
      <div className="report-pdf-page" data-pdf-page="1">
        <div className="stats-grid" style={{ marginBottom: 12 }}>
          <StatCard
            title={`Total Vehicles (${rangeLabel})`}
            value={weekData?.totalVehicles != null ? weekData.totalVehicles.toLocaleString() : '—'}
            change={`From ${dateCaption}`}
          />
          <StatCard
            title={`Pedestrians (${rangeLabel})`}
            value={weekData?.estimatedPedestrians != null ? weekData.estimatedPedestrians.toLocaleString() : '—'}
            change={weekData != null ? 'Estimated from traffic volume' : 'Not available'}
          />
          <StatCard
            title={`Violations (${rangeLabel})`}
            value={weekData?.overLimit != null ? weekData.overLimit.toLocaleString() : '—'}
            change="Speed ≥50 mph"
          />
          <StatCard
            title="Avg Speed"
            value={weekData?.avgSpeedMph != null ? weekData.avgSpeedMph : '—'}
            change="mph"
          />
        </div>

        <div className="chart-container" style={{ marginBottom: 10 }}>
          <h2>Top Flows by Direction</h2>
          <div className="intersection-list">
            {(weekData?.topFlowsByDirection || []).map((item) => (
              <div key={item.rank} className="intersection-item">
                <span className="intersection-rank">{item.rank}</span>
                <div className="intersection-info">
                  <div className="intersection-name">{item.name}</div>
                  <div className="intersection-stats">{item.stats}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <RiskHeatmap
            riskByHour={weekData?.riskByHour}
            riskByDayAndHour={weekData?.riskByDayAndHour}
            dayNames={weekData?.dayNames}
            vehicleCountByHour={weekData?.vehicleFrequencyByHour}
            dataPeriodLabel={dateCaption}
            filterType={dateRange}
          />
        </div>

        <div className="chart-container" style={{ marginBottom: 10 }}>
          <h2>Vehicle Frequency Throughout Day</h2>
          <div className="chart-inner chart-inner--tall">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={weekData?.vehicleFrequencyByHour || []}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={64} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v?.toLocaleString?.() ?? v, 'Vehicles']} />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} name="Vehicles" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PDF Page 2: Vehicle Classification + Donut (2 graphs) */}
      <div className="report-pdf-page" data-pdf-page="2">
        <div className="chart-container" style={{ marginBottom: 10 }}>
          <h2>Vehicle Classification by Hour</h2>
          <div className="chart-inner chart-inner--tall">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart
                data={weekData?.vehicleTrendByHour || []}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Area type="monotone" dataKey="cars" stackId="1" stroke="#0a3161" fill="#0a3161" fillOpacity={0.3} name="Cars" />
                <Area type="monotone" dataKey="trucks" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Trucks" />
                <Area type="monotone" dataKey="buses" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Buses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container pie-container" style={{ marginBottom: 0 }}>
          <h2>Vehicle Class Distribution</h2>
          <div className="pie-chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={weekData?.classDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {(weekData?.classDistribution || []).map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v?.toLocaleString?.(), name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="color-legend-text">
            {weekData?.classDistribution?.map((d) => `${d.name} ${d.percent}%`).join(' • ') || 'No class data'}
          </p>
        </div>
      </div>
    </div>
  );
}
