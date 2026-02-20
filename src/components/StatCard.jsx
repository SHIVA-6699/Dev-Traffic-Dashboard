export default function StatCard({ title, value, change }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      <div className="stat-change">{change}</div>
    </div>
  );
}
