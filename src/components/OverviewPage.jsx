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
import { toast } from 'sonner';
import StatCard from './StatCard';
import RiskHeatmap from './RiskHeatmap';
import { useTrafficData } from '../context/TrafficDataContext';

const HOUR_LABELS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

const RANGE_LABELS = { daily: 'Day', weekly: 'Week', monthly: 'Month' };

export default function OverviewPage({ timeFilter }) {
  const { weekData, loading, error, dateRange = 'daily' } = useTrafficData();
  const rangeLabel = RANGE_LABELS[dateRange] ?? 'Day';
  const dateCaption = weekData?.dateRangeLabel ?? (dateRange === 'daily' ? 'Most recent day' : dateRange === 'weekly' ? 'Last 7 days' : 'Last 30 days');

  return (
    <>
      <div className="stats-grid">
        <StatCard
          title={`Total Vehicles (${rangeLabel})`}
          value={loading ? '…' : error ? '—' : weekData?.totalVehicles?.toLocaleString() ?? '—'}
          change={loading ? 'Loading…' : error ? 'Error' : `From ${dateCaption}`}
        />
        <StatCard
          title={`Pedestrians (${rangeLabel})`}
          value={loading ? '…' : error ? '—' : weekData?.estimatedPedestrians != null ? weekData.estimatedPedestrians.toLocaleString() : '—'}
          change={loading ? '…' : weekData != null ? 'Estimated from traffic volume' : 'Not available'}
        />
        <StatCard
          title={`Violations (${rangeLabel})`}
          value={loading ? '…' : error ? '—' : weekData?.overLimit != null ? weekData.overLimit.toLocaleString() : '—'}
          change={loading ? '…' : error ? '' : 'Speed ≥50 mph'}
        />
        <StatCard
          title="Avg Speed"
          value={loading ? '…' : error ? '—' : weekData?.avgSpeedMph ?? '—'}
          change={loading ? '…' : weekData != null ? 'mph' : ''}
        />
      </div>

      <div className="chart-container">
        <h2>Top Flows by Direction</h2>
        <div className="intersection-list">
          {(weekData?.topFlowsByDirection || []).map((item) => (
            <button
              key={item.rank}
              type="button"
              className="intersection-item intersection-item--btn"
              onClick={() => toast.info(`#${item.rank} ${item.name}`, { description: item.stats })}
            >
              <span className="intersection-rank">{item.rank}</span>
              <div className="intersection-info">
                <div className="intersection-name">{item.name}</div>
                <div className="intersection-stats">{item.stats}</div>
              </div>
            </button>
          ))}
          {!loading && !error && (!weekData?.topFlowsByDirection?.length) && (
            <p className="chart-empty">No direction data.</p>
          )}
        </div>
      </div>

      <RiskHeatmap
        key={`risk-heatmap-${dateRange}-${weekData?.dateRangeLabel ?? ''}`}
        riskByHour={weekData?.riskByHour}
        vehicleCountByHour={weekData?.vehicleFrequencyByHour}
        dataPeriodLabel={weekData?.dateRangeLabel}
        filterType={dateRange}
      />

      <div className="chart-container">
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
              <Bar dataKey="value" fill="var(--green-500)" radius={[0, 6, 6, 0]} name="Vehicles" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container">
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
              <Area type="monotone" dataKey="cars" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Cars" />
              <Area type="monotone" dataKey="trucks" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Trucks" />
              <Area type="monotone" dataKey="buses" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Buses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container pie-container">
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
    </>
  );
}
