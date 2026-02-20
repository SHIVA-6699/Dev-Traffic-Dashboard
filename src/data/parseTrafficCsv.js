import { ALL_CSV_DAYS, getCsvUrl } from './csvPaths.js';

/** Parse "DD-MM-YYYY HH:MM" to hour 0-23 */
function parseHour(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return 0;
  const part = timestamp.trim().split(/\s+/)[1];
  if (!part) return 0;
  const h = parseInt(part.split(':')[0], 10);
  return Number.isNaN(h) ? 0 : Math.min(23, Math.max(0, h));
}

/**
 * Parse full row: Timestamp, Class, Entry, Exit, Distance_m, Speed_kmh
 * Returns { hour, class, entry, speedKmh, day } when day is provided (for multi-file)
 */
function parseCsvRow(parts, dayLabel = null) {
  if (parts.length < 6) return null;
  const timestamp = (parts[0] || '').trim();
  const cls = (parts[1] || '').trim().toLowerCase();
  const entry = (parts[2] || '').trim().toUpperCase();
  const speedKmh = parseFloat(parts[5], 10);
  if (Number.isNaN(speedKmh)) return null;
  return {
    hour: parseHour(timestamp),
    class: cls === 'car' || cls === 'truck' || cls === 'bus' ? cls : 'car',
    entry,
    speedKmh,
    day: dayLabel,
  };
}

function parseCsvToFullRows(text, dayLabel = null) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const row = parseCsvRow(parts, dayLabel);
    if (row) rows.push(row);
  }
  return rows;
}

/** Legacy: minimal rows for aggregateByEntry */
function parseCsvText(text) {
  const lines = text.trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 6) {
      rows.push({
        entry: (parts[2] || '').trim(),
        speedKmh: parseFloat(parts[5], 10),
      });
    }
  }
  return rows;
}

export function aggregateByEntry(rows) {
  const byEntry = {};
  const dirOrder = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
  dirOrder.forEach((d) => {
    byEntry[d] = { sum: 0, count: 0 };
  });
  rows.forEach((r) => {
    const entry = r.entry?.toUpperCase?.() || r.entry;
    if (byEntry[entry]) {
      if (!Number.isNaN(r.speedKmh)) {
        byEntry[entry].sum += r.speedKmh;
        byEntry[entry].count += 1;
      }
    }
  });
  return dirOrder.map((dir) => {
    const { sum, count } = byEntry[dir];
    const avgKmh = count > 0 ? sum / count : 0;
    const avgMph = avgKmh / 1.609;
    return {
      id: dir.toLowerCase(),
      label: dir.charAt(0) + dir.slice(1).toLowerCase() + 'bound',
      avgSpeedKmh: Math.round(avgKmh * 10) / 10,
      avgSpeedMph: Math.round(avgMph * 10) / 10,
      volume: count,
    };
  });
}

export async function fetchAndParseCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const text = await res.text();
  const rows = parseCsvText(text);
  return aggregateByEntry(rows);
}

export function getCsvStats(text, speedLimitKmh = 80) {
  const rows = parseCsvText(text);
  let sumSpeed = 0;
  let count = 0;
  let overLimit = 0;
  rows.forEach((r) => {
    if (!Number.isNaN(r.speedKmh)) {
      sumSpeed += r.speedKmh;
      count += 1;
      if (r.speedKmh >= speedLimitKmh) overLimit += 1;
    }
  });
  const avgSpeedKmh = count > 0 ? sumSpeed / count : 0;
  return { totalVehicles: count, avgSpeedKmh, overLimit };
}

export async function fetchCsvStats(url, speedLimitKmh = 80) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const text = await res.text();
  return getCsvStats(text, speedLimitKmh);
}

export async function fetchAllSeptemberStats(speedLimitKmh = 80) {
  let totalVehicles = 0;
  let totalSpeedSum = 0;
  let totalOverLimit = 0;
  for (const { file } of SEPTEMBER_CSV_DAYS) {
    const stats = await fetchCsvStats(getCsvUrl(file), speedLimitKmh);
    totalVehicles += stats.totalVehicles;
    totalSpeedSum += stats.totalVehicles * stats.avgSpeedKmh;
    totalOverLimit += stats.overLimit;
  }
  const avgSpeedKmh = totalVehicles > 0 ? totalSpeedSum / totalVehicles : 0;
  const avgSpeedMph = avgSpeedKmh / 1.609;
  return {
    totalVehicles,
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
    avgSpeedMph: Math.round(avgSpeedMph * 10) / 10,
    overLimit: totalOverLimit,
  };
}

const SPEED_LIMIT_KMH = 80;

/** Get which CSV days to load: 'all' = every file, 'daily' = last 1, 'weekly' = last 7, 'monthly' = last 30 */
function getDaysForRange(range) {
  const all = ALL_CSV_DAYS;
  if (range === 'all') return all;
  if (range === 'daily') return all.slice(-1);
  if (range === 'weekly') return all.slice(-7);
  if (range === 'monthly') return all.slice(-30);
  return all;
}

/** Get single day entry for a date string (e.g. '2017-09-15') from available CSV days */
function getDayForDate(dateStr) {
  return ALL_CSV_DAYS.find((d) => d.date === dateStr) || null;
}

/**
 * Fetch data for a single date (one CSV file). Returns same shape as fetchDataByRange.
 * @param {string} dateStr - e.g. '2017-09-15'
 */
export async function fetchDataForDate(dateStr, speedLimitKmh = SPEED_LIMIT_KMH) {
  const dayEntry = getDayForDate(dateStr);
  if (!dayEntry) throw new Error(`No CSV for date ${dateStr}`);
  return fetchWithDays([dayEntry], speedLimitKmh, 'daily');
}

/**
 * Internal: fetch and aggregate CSV data for a given list of days.
 * @param {string} [rangeLabel] - optional label for return.range (e.g. 'daily', 'weekly', or date for single day)
 */
async function fetchWithDays(daysToLoad, speedLimitKmh, rangeLabel = 'daily') {
  const allRows = [];
  const dayNames = daysToLoad.map((d) => d.dateLabel);

  for (let i = 0; i < daysToLoad.length; i++) {
    const { file } = daysToLoad[i];
    const res = await fetch(getCsvUrl(file));
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const text = await res.text();
    const rows = parseCsvToFullRows(text, i);
    allRows.push(...rows);
  }

  const numDays = daysToLoad.length;
  const dirOrder = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
  const classes = ['car', 'truck', 'bus'];

  const byHour = Array.from({ length: 24 }, () => ({ count: 0, overLimit: 0 }));
  const byClass = { car: 0, truck: 0, bus: 0 };
  const byDay = Array.from({ length: numDays }, () => ({ count: 0, overLimit: 0 }));
  const byEntry = {};
  dirOrder.forEach((d) => {
    byEntry[d] = { count: 0, sumSpeed: 0, car: 0, truck: 0, bus: 0 };
  });
  const byHourClass = Array.from({ length: 24 }, () => ({ car: 0, truck: 0, bus: 0 }));
  const highSpeedEvents = [];

  allRows.forEach((r) => {
    const h = r.hour;
    byHour[h].count += 1;
    if (r.speedKmh >= speedLimitKmh) {
      byHour[h].overLimit += 1;
      byDay[r.day].overLimit += 1;
      const speedMph = Math.round((r.speedKmh / 1.609) * 10) / 10;
      highSpeedEvents.push({
        ts: `${daysToLoad[r.day].date} ${String(h).padStart(2, '0')}:00`,
        type: 'Speeding',
        direction: r.entry.charAt(0) + r.entry.slice(1).toLowerCase() + 'bound',
        speedKmh: Math.round(r.speedKmh * 10) / 10,
        speedMph,
        confidence: `${Math.min(99, Math.round(70 + (r.speedKmh - speedLimitKmh) / 2))}%`,
      });
    }
    byDay[r.day].count += 1;
    byClass[r.class] = (byClass[r.class] || 0) + 1;
    byHourClass[h][r.class] += 1;
    if (byEntry[r.entry]) {
      byEntry[r.entry].count += 1;
      byEntry[r.entry].sumSpeed += r.speedKmh;
      byEntry[r.entry][r.class] += 1;
    }
  });

  const totalVehicles = allRows.length;
  const totalSpeedSum = allRows.reduce((s, r) => s + r.speedKmh, 0);
  const avgSpeedKmh = totalVehicles > 0 ? totalSpeedSum / totalVehicles : 0;
  const totalOverLimit = highSpeedEvents.length;

  const topFlowsByDirection = dirOrder.map((dir) => {
    const d = byEntry[dir];
    const count = d.count;
    const avgKmh = count > 0 ? d.sumSpeed / count : 0;
    return {
      rank: 0,
      name: dir.charAt(0) + dir.slice(1).toLowerCase() + 'bound',
      stats: `${count.toLocaleString()} vehicles • avg ${Math.round(avgKmh / 1.609)} mph • ${d.car} car, ${d.truck} truck, ${d.bus} bus`,
      volume: count,
    };
  });
  topFlowsByDirection.sort((a, b) => b.volume - a.volume);
  topFlowsByDirection.forEach((f, i) => { f.rank = i + 1; });

  const vehicleFrequencyByHour = byHour.map((h, i) => {
    const label = i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`;
    return { label, value: h.count };
  });

  const vehicleTrendByHour = byHourClass.map((h, i) => {
    const label = i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`;
    return { time: label, cars: h.car, trucks: h.truck, buses: h.bus };
  });

  const classDistribution = [
    { name: 'Car', value: byClass.car, color: '#3b82f6' },
    { name: 'Truck', value: byClass.truck, color: '#f59e0b' },
    { name: 'Bus', value: byClass.bus, color: '#10b981' },
  ].filter((d) => d.value > 0);

  const totalClass = classDistribution.reduce((s, d) => s + d.value, 0);
  classDistribution.forEach((d) => {
    d.percent = totalClass > 0 ? Math.round((d.value / totalClass) * 1000) / 10 : 0;
  });

  // Absolute count buckets so Daily vs Weekly vs Monthly show different heatmap colors
  const riskByHour = byHour.map((h) => {
    const c = h.count || 0;
    if (c >= 700) return 4;
    if (c >= 350) return 3;
    if (c >= 150) return 2;
    if (c >= 50) return 1;
    return 0;
  });

  const directionClassBars = [];
  dirOrder.forEach((dir) => {
    const d = byEntry[dir];
    const label = dir.charAt(0) + dir.slice(1).toLowerCase();
    if (d.car) directionClassBars.push({ label: `${label} Car`, value: d.car, fill: 'var(--green-500)' });
    if (d.truck) directionClassBars.push({ label: `${label} Truck`, value: d.truck, fill: '#f59e0b' });
    if (d.bus) directionClassBars.push({ label: `${label} Bus`, value: d.bus, fill: '#10b981' });
  });

  const speedingByDay = byDay.map((d, i) => ({
    day: dayNames[i],
    count: d.overLimit,
  }));

  const dateRangeLabel = numDays === 1 ? dayNames[0] : `${dayNames[0]}–${dayNames[numDays - 1]}`;
  const allDates = daysToLoad.map((d) => d.date);

  // Pedestrian count estimated from traffic volume (~3.6% of vehicle count)
  const estimatedPedestrians = Math.round(totalVehicles * 0.036);

  return {
    range: rangeLabel,
    dateRangeLabel,
    dayNames,
    allDates,
    totalVehicles,
    estimatedPedestrians,
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
    avgSpeedMph: Math.round(avgSpeedKmh / 1.609 * 10) / 10,
    overLimit: totalOverLimit,
    topFlowsByDirection,
    vehicleFrequencyByHour,
    vehicleTrendByHour,
    classDistribution,
    riskByHour,
    directionClassBars,
    speedingByDay,
    highSpeedEvents: highSpeedEvents.slice(0, 100),
  };
}

/**
 * Fetch CSV data for a date range and return combined dataset + aggregates for charts.
 * @param {'all'|'daily'|'weekly'|'monthly'} range - all = every CSV, daily = 1 day, weekly = 7 days, monthly = 30 days
 */
export async function fetchDataByRange(range = 'all', speedLimitKmh = SPEED_LIMIT_KMH) {
  const daysToLoad = getDaysForRange(range);
  return fetchWithDays(daysToLoad, speedLimitKmh, range);
}

/**
 * Fetch all 5 September CSVs (legacy). Prefer fetchDataByRange('weekly') for range-based loading.
 */
export async function fetchFullWeekData(speedLimitKmh = SPEED_LIMIT_KMH) {
  return fetchDataByRange('weekly', speedLimitKmh);
}
