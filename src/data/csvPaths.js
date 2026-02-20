/**
 * All CSV files in public/ with date-based names: 2017-09-01.csv through 2017-10-31.csv.
 * Covers Sept 1 – Oct 31, 2017 (61 days). Used for daily/weekly/monthly range loading.
 */

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function formatDateLabel(dateStr) {
  const { month, day } = parseDate(dateStr);
  return `${MONTH_LABELS[month]} ${day}`;
}

/** Generate list of { date, dateLabel, file } from 2017-09-01 to 2017-10-31 */
function buildAllCsvDays() {
  const start = new Date(2017, 8, 1);   // Sept 1, 2017
  const end = new Date(2017, 9, 31);   // Oct 31, 2017
  const list = [];
  const d = new Date(start);
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const date = `${y}-${m}-${day}`;
    list.push({
      date,
      dateLabel: formatDateLabel(date),
      file: `${date}.csv`,
    });
    d.setDate(d.getDate() + 1);
  }
  return list;
}

export const ALL_CSV_DAYS = buildAllCsvDays();

/** Legacy: Sept 5–9 only (old filenames). Prefer ALL_CSV_DAYS + date range. */
export const SEPTEMBER_CSV_DAYS = [
  { day: 5, file: 'september5.csv' },
  { day: 6, file: 'september6.csv' },
  { day: 7, file: 'september7.csv' },
  { day: 8, file: 'september 8.csv' },
  { day: 9, file: 'september 9.csv' },
];

export function getCsvUrl(filename) {
  return `/${encodeURI(filename)}`;
}
