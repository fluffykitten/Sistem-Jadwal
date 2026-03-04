// Reports page — Comprehensive Attendance Dashboard + Export
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';
import { exportDateRangeReport, exportSemesterReport, exportPerTeacherReport, exportRankingReport } from '../utils/attendanceExport.js';
import { computeTeacherStats, computeOverallStats, computeLatecomerRanking, computeAbsenteeRanking, formatDateIndo } from '../utils/attendanceAnalytics.js';

let currentStats = null;

function getDefaultDates() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = todayStr.slice(0, 8) + '01';
  return { start: monthStart, end: todayStr };
}

function buildStatCards(overall) {
  const { totals, totalTeachers, avgPercentage, totalDays } = overall;
  return `
    <div class="rpt-stat-cards">
      <div class="rpt-stat-card rpt-stat-primary">
        <div class="rpt-stat-icon">📅</div>
        <div class="rpt-stat-value">${totalDays}</div>
        <div class="rpt-stat-label">Hari Sekolah</div>
      </div>
      <div class="rpt-stat-card rpt-stat-success">
        <div class="rpt-stat-icon">✅</div>
        <div class="rpt-stat-value">${totals.H}</div>
        <div class="rpt-stat-label">Total Hadir</div>
      </div>
      <div class="rpt-stat-card rpt-stat-info">
        <div class="rpt-stat-icon">📊</div>
        <div class="rpt-stat-value">${avgPercentage}%</div>
        <div class="rpt-stat-label">Rata-rata Kehadiran</div>
      </div>
      <div class="rpt-stat-card rpt-stat-warning">
        <div class="rpt-stat-icon">⏰</div>
        <div class="rpt-stat-value">${totals.T}</div>
        <div class="rpt-stat-label">Total Terlambat</div>
      </div>
      <div class="rpt-stat-card rpt-stat-danger">
        <div class="rpt-stat-icon">❌</div>
        <div class="rpt-stat-value">${totals.A}</div>
        <div class="rpt-stat-label">Total Alfa</div>
      </div>
    </div>`;
}

function buildDistributionBar(overall) {
  const { totals } = overall;
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total === 0) return '<div class="rpt-dist-empty">Belum ada data presensi</div>';

  const pcts = {};
  Object.keys(totals).forEach(k => { pcts[k] = ((totals[k] / total) * 100).toFixed(1); });

  return `
    <div class="rpt-distribution">
      <div class="rpt-dist-title">Distribusi Status Kehadiran</div>
      <div class="rpt-dist-bar">
        ${totals.H > 0 ? `<div class="rpt-dist-seg rpt-seg-H" style="width:${pcts.H}%" title="Hadir ${totals.H} (${pcts.H}%)"></div>` : ''}
        ${totals.T > 0 ? `<div class="rpt-dist-seg rpt-seg-T" style="width:${pcts.T}%" title="Terlambat ${totals.T} (${pcts.T}%)"></div>` : ''}
        ${totals.S > 0 ? `<div class="rpt-dist-seg rpt-seg-S" style="width:${pcts.S}%" title="Sakit ${totals.S} (${pcts.S}%)"></div>` : ''}
        ${totals.I > 0 ? `<div class="rpt-dist-seg rpt-seg-I" style="width:${pcts.I}%" title="Izin ${totals.I} (${pcts.I}%)"></div>` : ''}
        ${totals.A > 0 ? `<div class="rpt-dist-seg rpt-seg-A" style="width:${pcts.A}%" title="Alfa ${totals.A} (${pcts.A}%)"></div>` : ''}
      </div>
      <div class="rpt-dist-legend">
        <span class="rpt-leg"><span class="rpt-leg-dot rpt-seg-H"></span>Hadir ${totals.H} (${pcts.H}%)</span>
        <span class="rpt-leg"><span class="rpt-leg-dot rpt-seg-T"></span>Terlambat ${totals.T} (${pcts.T}%)</span>
        <span class="rpt-leg"><span class="rpt-leg-dot rpt-seg-S"></span>Sakit ${totals.S} (${pcts.S}%)</span>
        <span class="rpt-leg"><span class="rpt-leg-dot rpt-seg-I"></span>Izin ${totals.I} (${pcts.I}%)</span>
        <span class="rpt-leg"><span class="rpt-leg-dot rpt-seg-A"></span>Alfa ${totals.A} (${pcts.A}%)</span>
      </div>
    </div>`;
}

function buildBarChart(teacherStats) {
  if (teacherStats.length === 0) return '';
  const sorted = [...teacherStats].sort((a, b) => b.percentage - a.percentage);
  const top = sorted.slice(0, 15); // Show top 15

  const bars = top.map(ts => {
    const pct = ts.percentage;
    const colorClass = pct >= 90 ? 'rpt-bar-good' : pct >= 75 ? 'rpt-bar-warn' : 'rpt-bar-bad';
    return `
        <div class="rpt-bar-row">
          <div class="rpt-bar-name" title="${ts.teacher.name}">${ts.teacher.name}</div>
          <div class="rpt-bar-track">
            <div class="rpt-bar-fill ${colorClass}" style="width:${pct}%"></div>
          </div>
          <div class="rpt-bar-pct">${pct}%</div>
        </div>`;
  }).join('');

  return `
    <div class="rpt-chart">
      <div class="rpt-chart-title">Persentase Kehadiran per Guru ${sorted.length > 15 ? '(Top 15)' : ''}</div>
      <div class="rpt-bar-chart">${bars}</div>
    </div>`;
}

function getBadgeClass(pct) {
  if (pct >= 90) return 'rpt-badge-good';
  if (pct >= 75) return 'rpt-badge-warn';
  return 'rpt-badge-bad';
}

function getBadgeText(pct) {
  if (pct >= 90) return 'Baik';
  if (pct >= 75) return 'Cukup';
  return 'Perlu Perhatian';
}

function buildRankingTable(teacherStats) {
  if (teacherStats.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada data presensi untuk ditampilkan</p></div>';
  }
  const sorted = [...teacherStats].sort((a, b) => b.percentage - a.percentage);
  const rows = sorted.map((ts, i) => `
      <tr>
        <td class="rpt-tbl-center">${i + 1}</td>
        <td>${ts.teacher.name}</td>
        <td class="rpt-tbl-center rpt-c-H">${ts.counts.H}</td>
        <td class="rpt-tbl-center rpt-c-T">${ts.counts.T}</td>
        <td class="rpt-tbl-center rpt-c-S">${ts.counts.S}</td>
        <td class="rpt-tbl-center rpt-c-I">${ts.counts.I}</td>
        <td class="rpt-tbl-center rpt-c-A">${ts.counts.A}</td>
        <td class="rpt-tbl-center"><strong>${ts.percentage}%</strong></td>
        <td class="rpt-tbl-center"><span class="rpt-badge ${getBadgeClass(ts.percentage)}">${getBadgeText(ts.percentage)}</span></td>
      </tr>`).join('');

  return `
    <div class="rpt-ranking">
      <div class="rpt-ranking-title">Ranking Kehadiran Guru</div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Guru</th>
              <th>H</th>
              <th>T</th>
              <th>S</th>
              <th>I</th>
              <th>A</th>
              <th>%</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function buildLatecomersCard(teacherStats) {
  const latecomers = computeLatecomerRanking(teacherStats);
  if (latecomers.length === 0) return '';

  const top5 = latecomers.slice(0, 5);
  const items = top5.map((ts, i) => `
      <div class="rpt-late-item">
        <span class="rpt-late-rank">${i + 1}</span>
        <span class="rpt-late-name">${ts.teacher.name}</span>
        <span class="rpt-late-count">${ts.counts.T}× terlambat</span>
      </div>`).join('');

  return `
    <div class="rpt-late-card">
      <div class="rpt-late-title">⏰ Guru Paling Sering Terlambat</div>
      <div class="rpt-late-list">${items}</div>
    </div>`;
}

function buildAbsenteesCard(teacherStats) {
  const absentees = computeAbsenteeRanking(teacherStats);
  if (absentees.length === 0) return '';

  const top5 = absentees.slice(0, 5);
  const items = top5.map((ts, i) => {
    const totalAbsent = ts.counts.S + ts.counts.I + ts.counts.A;
    return `
        <div class="rpt-late-item">
          <span class="rpt-late-rank">${i + 1}</span>
          <span class="rpt-late-name">${ts.teacher.name}</span>
          <span class="rpt-late-count">${totalAbsent}× tidak hadir</span>
        </div>`;
  }).join('');

  return `
    <div class="rpt-late-card rpt-absent-card">
      <div class="rpt-late-title">📉 Guru Paling Sering Tidak Hadir</div>
      <div class="rpt-late-list">${items}</div>
    </div>`;
}

function buildExportPanel() {
  const teachers = DataStore.getTeachers();
  const subjects = DataStore.getSubjects();
  const activeSemester = DataStore.getActiveSemester();

  const pelajaranTeachers = teachers.filter(t => {
    const subs = (t.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
    return subs.length === 0 || subs.some(s => !s.type || s.type === 'pelajaran');
  });

  const teacherOptions = pelajaranTeachers.map(t =>
    `<option value="${t.id}">${t.name}</option>`
  ).join('');

  const { start, end } = getDefaultDates();

  return `
    <div class="rpt-export-panel">
      <div class="rpt-export-header" id="exportPanelToggle">
        <span>📥 Panel Ekspor Excel</span>
        <svg class="rpt-export-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="rpt-export-body" id="exportPanelBody">
        <div class="rpt-export-grid">

          <!-- Date Range Report -->
          <div class="rpt-export-card">
            <div class="rpt-export-icon">📅</div>
            <h4>Laporan Rentang Tanggal</h4>
            <p>Daftar hadir semua guru untuk rentang tanggal tertentu</p>
            <div class="form-row">
              <div class="form-group"><label>Mulai</label><input type="date" class="form-control" id="rangeStart" value="${start}" /></div>
              <div class="form-group"><label>Akhir</label><input type="date" class="form-control" id="rangeEnd" value="${end}" /></div>
            </div>
            <button class="btn btn-primary btn-sm" id="exportRangeBtn">📥 Ekspor</button>
          </div>

          <!-- Semester Report -->
          <div class="rpt-export-card">
            <div class="rpt-export-icon">📊</div>
            <h4>Rekap Semester</h4>
            <p>Ringkasan kehadiran per bulan selama satu semester</p>
            ${activeSemester ? `
              <div class="rpt-semester-badge">📚 ${activeSemester.name} — ${activeSemester.year}</div>
              <button class="btn btn-primary btn-sm" id="exportSemesterBtn">📥 Ekspor Rekap</button>
            ` : `<div class="empty-state" style="padding:12px"><p>Belum ada semester aktif</p></div>`}
          </div>

          <!-- Per Teacher Report -->
          <div class="rpt-export-card">
            <div class="rpt-export-icon">👨‍🏫</div>
            <h4>Laporan Per Guru</h4>
            <p>Detail kehadiran per jam pelajaran untuk satu guru</p>
            <div class="form-group"><label>Pilih Guru</label>
              <select class="form-control" id="reportTeacher"><option value="">-- Pilih Guru --</option>${teacherOptions}</select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Mulai</label><input type="date" class="form-control" id="teacherRangeStart" value="${start}" /></div>
              <div class="form-group"><label>Akhir</label><input type="date" class="form-control" id="teacherRangeEnd" value="${end}" /></div>
            </div>
            <button class="btn btn-primary btn-sm" id="exportTeacherBtn">📥 Ekspor</button>
          </div>

          <!-- Ranking Report (NEW) -->
          <div class="rpt-export-card rpt-export-new">
            <div class="rpt-export-icon">🏆</div>
            <h4>Ranking & Analisis <span class="rpt-new-tag">BARU</span></h4>
            <p>Ranking kehadiran + detail keterlambatan & ketidakhadiran (3 sheet)</p>
            <div class="form-row">
              <div class="form-group"><label>Mulai</label><input type="date" class="form-control" id="rankingStart" value="${start}" /></div>
              <div class="form-group"><label>Akhir</label><input type="date" class="form-control" id="rankingEnd" value="${end}" /></div>
            </div>
            <button class="btn btn-primary btn-sm" id="exportRankingBtn">📥 Ekspor Ranking</button>
          </div>

        </div>
      </div>
    </div>`;
}

export function renderReports() {
  const { start, end } = getDefaultDates();

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📊</span> Laporan Presensi</h2>
          <p class="page-subtitle">Dashboard kehadiran guru & ekspor laporan</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="rpt-filter-bar card">
        <div class="rpt-filter-row">
          <div class="rpt-filter-item">
            <label>Tanggal Mulai</label>
            <input type="date" class="form-control" id="filterStart" value="${start}" />
          </div>
          <div class="rpt-filter-item">
            <label>Tanggal Akhir</label>
            <input type="date" class="form-control" id="filterEnd" value="${end}" />
          </div>
          <button class="btn btn-primary" id="applyFilterBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Terapkan
          </button>
        </div>
      </div>

      <!-- Dashboard Content (will be filled by JS) -->
      <div id="reportDashboard">
        <div class="rpt-loading">Memuat data...</div>
      </div>

      <!-- Export Panel -->
      ${buildExportPanel()}
    </div>
  `;
}

function renderDashboardContent(startDate, endDate) {
  const teacherStats = computeTeacherStats(startDate, endDate);
  currentStats = teacherStats;
  const overall = computeOverallStats(teacherStats);

  const periodLabel = `${formatDateIndo(startDate)} — ${formatDateIndo(endDate)}`;

  const html = `
      <div class="rpt-period-label">Periode: ${periodLabel}</div>
      ${buildStatCards(overall)}

      <div class="rpt-two-col">
        <div class="card rpt-section">
          ${buildDistributionBar(overall)}
        </div>
        <div class="rpt-insights">
          ${buildLatecomersCard(teacherStats)}
          ${buildAbsenteesCard(teacherStats)}
          ${teacherStats.length > 0 && computeLatecomerRanking(teacherStats).length === 0 && computeAbsenteeRanking(teacherStats).length === 0 ? '<div class="rpt-no-issues">🎉 Semua guru hadir dengan baik!</div>' : ''}
        </div>
      </div>

      <div class="card rpt-section">
        ${buildBarChart(teacherStats)}
      </div>

      <div class="card rpt-section">
        ${buildRankingTable(teacherStats)}
      </div>
    `;

  const container = document.getElementById('reportDashboard');
  if (container) container.innerHTML = html;
}

export function initReports(refreshPage) {
  const { start, end } = getDefaultDates();

  // Render initial dashboard
  setTimeout(() => renderDashboardContent(start, end), 50);

  // Filter button
  document.getElementById('applyFilterBtn')?.addEventListener('click', () => {
    const s = document.getElementById('filterStart')?.value;
    const e = document.getElementById('filterEnd')?.value;
    if (!s || !e) { showToast('Pilih tanggal mulai dan akhir', 'warning'); return; }
    if (s > e) { showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning'); return; }
    renderDashboardContent(s, e);
    showToast('Dashboard diperbarui', 'success');
  });

  // Export panel toggle
  document.getElementById('exportPanelToggle')?.addEventListener('click', () => {
    const panel = document.getElementById('exportPanelBody');
    const header = document.getElementById('exportPanelToggle');
    if (panel && header) {
      panel.classList.toggle('open');
      header.classList.toggle('open');
    }
  });

  // Date Range Report
  document.getElementById('exportRangeBtn')?.addEventListener('click', async () => {
    const s = document.getElementById('rangeStart')?.value;
    const e = document.getElementById('rangeEnd')?.value;
    if (!s || !e) { showToast('Pilih tanggal mulai dan akhir', 'warning'); return; }
    if (s > e) { showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning'); return; }
    try {
      await exportDateRangeReport(s, e);
      showToast('Laporan berhasil diunduh!', 'success');
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
  });

  // Semester Report
  document.getElementById('exportSemesterBtn')?.addEventListener('click', async () => {
    try {
      await exportSemesterReport();
      showToast('Rekap semester berhasil diunduh!', 'success');
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
  });

  // Per Teacher Report
  document.getElementById('exportTeacherBtn')?.addEventListener('click', async () => {
    const tid = document.getElementById('reportTeacher')?.value;
    const s = document.getElementById('teacherRangeStart')?.value;
    const e = document.getElementById('teacherRangeEnd')?.value;
    if (!tid) { showToast('Pilih guru terlebih dahulu', 'warning'); return; }
    if (!s || !e) { showToast('Pilih tanggal mulai dan akhir', 'warning'); return; }
    if (s > e) { showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning'); return; }
    try {
      await exportPerTeacherReport(tid, s, e);
      showToast('Laporan guru berhasil diunduh!', 'success');
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
  });

  // Ranking Report (NEW)
  document.getElementById('exportRankingBtn')?.addEventListener('click', async () => {
    const s = document.getElementById('rankingStart')?.value;
    const e = document.getElementById('rankingEnd')?.value;
    if (!s || !e) { showToast('Pilih tanggal mulai dan akhir', 'warning'); return; }
    if (s > e) { showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning'); return; }
    try {
      await exportRankingReport(s, e);
      showToast('Ranking & Analisis berhasil diunduh!', 'success');
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
  });
}
