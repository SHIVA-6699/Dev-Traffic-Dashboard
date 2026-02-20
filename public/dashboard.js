/**
 * Iris Mobility - Traffic Analytics Dashboard
 * Charts, tabs, filters, and interactions
 */

(function () {
  'use strict';

  const CHART_COLORS = {
    green: '#22c55e',
    greenDark: '#16a34a',
    blue: '#3b82f6',
    amber: '#f59e0b',
    emerald: '#10b981',
    violet: '#8b5cf6',
    red: '#ef4444',
    gray: '#6b7280',
    white: '#ffffff',
    black: '#1a1a1a',
    yellow: '#fbbf24',
  };

  let currentClipIndex = 0;
  const clips = [
    { title: 'Wrong Way Event - Main St & 5th Ave', time: '2024-01-15 14:32:18', confidence: '94.2%' },
    { title: 'Red Light Run - Oak Blvd & Elm St', time: '2024-01-15 14:28:45', confidence: '91.7%' },
    { title: 'Fail to Yield - Park Ave & Broadway', time: '2024-01-15 14:25:12', confidence: '88.3%' },
    { title: 'Red Light Run - Main St & 5th Ave', time: '2024-01-15 14:19:33', confidence: '96.1%' },
    { title: 'Wrong Way Event - River Rd & Bridge St', time: '2024-01-15 14:15:07', confidence: '92.5%' },
    { title: 'Fail to Yield - Central Ave & Market St', time: '2024-01-15 14:08:22', confidence: '89.6%' },
    { title: 'Red Light Run - Oak Blvd & Elm St', time: '2024-01-15 14:02:51', confidence: '93.8%' },
  ];

  // ----- Tabs -----
  function showPage(pageId, ev) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.remove('active');
    });
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    if (ev && ev.target) ev.target.classList.add('active');
  }

  // ----- Filters -----
  function setTimeFilter(type, ev) {
    var btns = document.querySelectorAll('.header-right .filter-btn');
    btns.forEach(function (b) {
      b.classList.remove('active');
    });
    if (ev && ev.target) ev.target.classList.add('active');
  }

  function setSpeedFilter(type, ev) {
    var container = document.getElementById('intersection');
    if (!container) return;
    var btns = container.querySelectorAll('.filter-group .filter-btn');
    btns.forEach(function (b) {
      b.classList.remove('active');
    });
    if (ev && ev.target) ev.target.classList.add('active');
  }

  function generateReport(type) {
    // In production would generate PDF/Excel
    if (typeof alert !== 'undefined') {
      alert('Generating ' + type + ' report…\n\nThis would produce a full report with charts and analytics. Excel export can be added when you provide the data file.');
    }
  }

  // ----- Video clips -----
  function playClip(index) {
    currentClipIndex = index;
    var clip = clips[index];
    var titleEl = document.getElementById('videoTitle');
    var metaEl = document.querySelector('.video-info div:last-child');
    if (titleEl) titleEl.textContent = clip.title;
    if (metaEl) metaEl.textContent = clip.time + ' • Confidence: ' + clip.confidence;
  }

  function nextClip() {
    currentClipIndex = (currentClipIndex + 1) % clips.length;
    playClip(currentClipIndex);
  }

  function previousClip() {
    currentClipIndex = (currentClipIndex - 1 + clips.length) % clips.length;
    playClip(currentClipIndex);
  }

  // ----- Heatmaps -----
  function renderRiskHeatmap() {
    var el = document.getElementById('heatmap');
    if (!el) return;
    el.innerHTML = '';
    var riskLevels = [0, 0, 0, 0, 0, 1, 2, 3, 4, 3, 2, 2, 2, 2, 3, 3, 4, 4, 4, 3, 2, 1, 1, 0];
    riskLevels.forEach(function (risk, i) {
      var cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      var intensity = risk / 4;
      var g = Math.floor(34 + intensity * 50);
      var r = Math.floor(197 - intensity * 100);
      cell.style.background = 'rgb(' + r + ',' + g + ',94)';
      cell.title = 'Hour ' + i + ': Risk Level ' + risk;
      el.appendChild(cell);
    });
  }

  function renderSpeedHeatmap() {
    var el = document.getElementById('speedHeatmap');
    if (!el) return;
    el.innerHTML = '';
    var directions = ['North', 'South', 'East', 'West'];
    var speedData = [
      [28, 30, 25, 27], [26, 28, 24, 26], [25, 27, 23, 25], [24, 26, 22, 24],
      [23, 25, 21, 23], [22, 24, 20, 22], [25, 27, 24, 26], [30, 32, 28, 30],
      [35, 37, 32, 34], [38, 40, 35, 37], [36, 38, 34, 36], [34, 36, 32, 34],
      [33, 35, 31, 33], [34, 36, 32, 34], [36, 38, 34, 36], [38, 40, 36, 38],
      [40, 42, 38, 40], [42, 44, 40, 42], [38, 40, 36, 38], [35, 37, 33, 35],
      [32, 34, 30, 32], [30, 32, 28, 30], [28, 30, 26, 28], [27, 29, 25, 27],
      [26, 28, 24, 26], [25, 27, 23, 25],
    ];
    directions.forEach(function (dir, di) {
      speedData.forEach(function (hourSpeeds, hi) {
        var speed = hourSpeeds[di];
        var cell = document.createElement('div');
        cell.className = 'speed-heatmap-cell';
        var r, g, b;
        if (speed < 30) {
          var ratio = speed / 30;
          r = Math.floor(34 + ratio * 50);
          g = Math.floor(197 - ratio * 50);
          b = 94;
        } else if (speed < 45) {
          var ratio = (speed - 30) / 15;
          r = Math.floor(251 - ratio * 50);
          g = Math.floor(191 - ratio * 50);
          b = Math.floor(36 - ratio * 20);
        } else {
          var ratio = (speed - 45) / 15;
          r = Math.floor(239 - ratio * 20);
          g = Math.floor(68 - ratio * 40);
          b = Math.floor(68 - ratio * 20);
        }
        cell.style.background = 'rgb(' + r + ',' + g + ',' + b + ')';
        cell.textContent = speed;
        cell.title = dir + ' - Hour ' + hi + ': ' + speed + ' mph';
        el.appendChild(cell);
      });
    });
  }

  // ----- Charts (Chart.js) -----
  function initCharts() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, sans-serif";
    Chart.defaults.color = '#374151';

    // Overview: Vehicle classification multi-line
    var multiLineCtx = document.getElementById('chartVehicleTrend');
    if (multiLineCtx) {
      new Chart(multiLineCtx, {
        type: 'line',
        data: {
          labels: ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'],
          datasets: [
            { label: 'Cars', data: [120, 80, 320, 380, 420, 280, 140], borderColor: CHART_COLORS.blue, backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.35 },
            { label: 'Trucks', data: [40, 25, 180, 220, 200, 120, 50], borderColor: CHART_COLORS.amber, backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.35 },
            { label: 'Buses', data: [15, 10, 85, 95, 90, 60, 25], borderColor: CHART_COLORS.emerald, backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.35 },
            { label: 'Motorcycles', data: [25, 15, 65, 80, 75, 55, 30], borderColor: CHART_COLORS.violet, backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.35 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    // Overview: Pedestrian frequency horizontal bars (use bar chart)
    var pedCtx = document.getElementById('chartPedestrian');
    if (pedCtx) {
      var pedLabels = ['12 AM', '2 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
      var pedValues = [45, 78, 234, 1234, 987, 1456, 1567, 1678, 1789, 1123, 567];
      new Chart(pedCtx, {
        type: 'bar',
        data: {
          labels: pedLabels,
          datasets: [{ label: 'Pedestrians', data: pedValues, backgroundColor: 'rgba(34, 197, 94, 0.85)', borderRadius: 6 }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            y: { grid: { display: false } },
          },
        },
      });
    }

    // Overview: Color distribution pie
    var pieCtx = document.getElementById('chartColorPie');
    if (pieCtx) {
      new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['White', 'Black', 'Red', 'Blue', 'Gray', 'Yellow', 'Green'],
          datasets: [{
            data: [28.4, 22.1, 15.7, 12.3, 10.8, 6.2, 4.5],
            backgroundColor: [CHART_COLORS.white, CHART_COLORS.black, CHART_COLORS.red, CHART_COLORS.blue, CHART_COLORS.gray, CHART_COLORS.yellow, CHART_COLORS.green],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          cutout: '58%',
        },
      });
    }

    // Intersection: Wrong-way trend (last 7 days)
    var wrongWayCtx = document.getElementById('chartWrongWayTrend');
    if (wrongWayCtx) {
      new Chart(wrongWayCtx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ label: 'Wrong Way', data: [3, 2, 4, 5, 3, 2, 1], backgroundColor: 'rgba(239, 68, 68, 0.85)', borderRadius: 8 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    // Intersection: Violation count trend (last 7 days)
    var violCtx = document.getElementById('chartViolationTrend');
    if (violCtx) {
      new Chart(violCtx, {
        type: 'bar',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ label: 'Violations', data: [48, 42, 54, 57, 63, 44, 35], backgroundColor: 'rgba(34, 197, 94, 0.85)', borderRadius: 8 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }

  // ----- Event bindings -----
  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var pageId = tab.getAttribute('data-page');
        if (pageId) showPage(pageId, { target: tab });
      });
    });

    document.querySelectorAll('.header-right .filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        setTimeFilter('', e);
      });
    });

    var interPage = document.getElementById('intersection');
    if (interPage) {
      interPage.querySelectorAll('.filter-group .filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          setSpeedFilter('', e);
        });
      });
    }

    document.querySelectorAll('[data-report]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        generateReport(btn.getAttribute('data-report'));
      });
    });

    document.querySelectorAll('[data-clip]').forEach(function (row) {
      row.addEventListener('click', function () {
        var idx = parseInt(row.getAttribute('data-clip'), 10);
        if (!isNaN(idx)) playClip(idx);
      });
    });

    var prevBtn = document.getElementById('btnPrevClip');
    var nextBtn = document.getElementById('btnNextClip');
    if (prevBtn) prevBtn.addEventListener('click', previousClip);
    if (nextBtn) nextBtn.addEventListener('click', nextClip);
  }

  // ----- Init -----
  function init() {
    renderRiskHeatmap();
    renderSpeedHeatmap();
    bindEvents();
    if (typeof Chart !== 'undefined') {
      initCharts();
    }
    playClip(0);

    // Optional: auto-advance clips when on Events page
    setInterval(function () {
      var eventsPage = document.getElementById('events');
      if (eventsPage && eventsPage.classList.contains('active')) {
        nextClip();
      }
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
