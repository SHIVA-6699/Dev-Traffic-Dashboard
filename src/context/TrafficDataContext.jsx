import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchDataByRange, fetchDataForDate } from '../data/parseTrafficCsv';

const TrafficDataContext = createContext(null);

export function TrafficDataProvider({ children, dateRange = 'daily', selectedDate = null }) {
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // When a specific date is selected, load that day's CSV; otherwise use Daily/Weekly/Monthly range
  useEffect(() => {
    setLoading(true);
    setError(null);
    const load = selectedDate
      ? fetchDataForDate(selectedDate, 80)
      : fetchDataByRange(dateRange, 80);
    load
      .then((data) => {
        setWeekData(data);
        const label = selectedDate ? selectedDate : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);
        toast.success(selectedDate ? `Date ${data.dateRangeLabel} loaded` : `${label} data loaded from CSV`, {
          description: `${data.totalVehicles.toLocaleString()} vehicles (${data.dateRangeLabel})`,
        });
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load CSV');
        toast.error('Could not load CSV data', { description: 'Check CSV files in public folder.' });
      })
      .finally(() => setLoading(false));
  }, [dateRange, selectedDate]);

  return (
    <TrafficDataContext.Provider value={{ weekData, loading, error, dateRange, selectedDate }}>
      {children}
    </TrafficDataContext.Provider>
  );
}

export function useTrafficData() {
  const ctx = useContext(TrafficDataContext);
  if (!ctx) throw new Error('useTrafficData must be used inside TrafficDataProvider');
  return ctx;
}
