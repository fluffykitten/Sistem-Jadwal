import DataStore from '../dataStore.js';
import { generateStudentAttendanceReport } from '../utils/excelExport.js';
import { generateBulkMonthlyPdf, generateSingleStudentPdf, generateBulkSemesterPdf } from '../utils/studentPdfReport.js';

export function renderStudentReports() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // Generate month options
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthOptions = months.map((m, i) => `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`).join('');

  // Year range: current year ± 2
  const yearOptions = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    yearOptions.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
  }

  const classes = DataStore.getClasses();
  const classFilterOpts = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📊</span> Laporan Kehadiran Siswa</h2>
          <p class="page-subtitle">Pusat pemantauan & rekap kehadiran siswa secara komprehensif</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="exportStudentReportsBtn" class="btn btn-secondary">
            <span style="margin-right:6px;">📥</span> Excel
          </button>
          <button id="exportPdfBulkBtn" class="btn btn-primary">
            <span style="margin-right:6px;">📄</span> PDF Per Kelas
          </button>
          <button id="exportPdfSemesterBtn" class="btn" style="background: var(--accent-info); color: #fff; border: none;">
            <span style="margin-right:6px;">📄</span> PDF Semester
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin: 0; min-width: 160px;">
            <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">Bulan</label>
            <select id="reportMonthSelect" class="form-control">${monthOptions}</select>
          </div>
          <div class="form-group" style="margin: 0; min-width: 120px;">
            <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary);">Tahun</label>
            <select id="reportYearSelect" class="form-control">${yearOptions.join('')}</select>
          </div>
          <button id="applyReportFilterBtn" class="btn btn-primary" style="height: 42px;">🔄 Terapkan</button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div id="reportStatCards" class="reports-grid" style="margin-bottom: 24px;">
        <!-- Populated by JS -->
      </div>

      <!-- Per-Class Table -->
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 16px;">🏫 Rekap Kehadiran Per Kelas</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Persentase kehadiran tiap kelas pada bulan yang dipilih. Kelas dengan kehadiran terendah ditampilkan di atas.
        </p>
        <div class="data-table-wrap">
          <table class="data-table" id="perClassTable">
            <thead>
              <tr>
                <th>Kelas</th>
                <th style="text-align:center;">Jumlah Siswa</th>
                <th style="text-align:center;">Hadir</th>
                <th style="text-align:center;">Terlambat</th>
                <th style="text-align:center;">Sakit</th>
                <th style="text-align:center;">Izin</th>
                <th style="text-align:center;">Alfa</th>
                <th style="text-align:center;">% Kehadiran</th>
              </tr>
            </thead>
            <tbody id="perClassTbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Per-Student Table -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <h3 style="margin: 0;">👤 Rekap Individu Siswa</h3>
          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <select id="individualClassFilter" class="form-control" style="width: 220px;">
              <option value="all">-- Semua Kelas --</option>
              ${classFilterOpts}
            </select>
            <input type="text" id="studentSearchInput" class="form-control" placeholder="🔍 Cari nama siswa..." style="width: 220px;" />
          </div>
        </div>
        <div class="data-table-wrap">
          <table class="data-table" id="perStudentTable">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th>Nama Siswa</th>
                <th>L/P</th>
                <th>Kelas</th>
                <th style="text-align:center;">Hadir</th>
                <th style="text-align:center;">Terlambat</th>
                <th style="text-align:center;">Sakit</th>
                <th style="text-align:center;">Izin</th>
                <th style="text-align:center;">Alfa</th>
                <th style="text-align:center;">% Kehadiran</th>
                <th style="text-align:center; width:50px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="perStudentTbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Warning Table -->
      <div class="card">
        <h3 style="margin-bottom: 8px;">⚠️ Peringatan: Siswa Bermasalah</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Siswa dengan Alfa ≥ 3 atau persentase kehadiran &lt; 80% pada bulan terpilih. Untuk ditindaklanjuti Guru BK.
        </p>
        <div class="data-table-wrap">
          <table class="data-table" id="warningTable">
            <thead>
              <tr>
                <th style="width:50px;">Rank</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th style="text-align:center;">Total Alfa</th>
                <th style="text-align:center;">Izin/Sakit</th>
                <th style="text-align:center;">% Kehadiran</th>
              </tr>
            </thead>
            <tbody id="warningTbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ---- Helper: compute stats for a given month/year ----
function computeMonthlyStats(month, year) {
  const students = DataStore.getStudents();
  const classes = DataStore.getClasses();
  const attendance = DataStore.getStudentAttendance();

  // Filter attendance to the selected month/year
  const filtered = attendance.filter(a => {
    const [y, m] = a.date.split('-').map(Number);
    return y === year && (m - 1) === month; // m is 1-indexed in YYYY-MM-DD
  });

  // Unique effective days (days where at least 1 record exists)
  const effectiveDays = new Set(filtered.map(a => a.date)).size;

  // Totals
  let totalH = 0, totalT = 0, totalS = 0, totalI = 0, totalA = 0;
  filtered.forEach(a => {
    if (a.status === 'hadir') totalH++;
    else if (a.status === 'terlambat') totalT++;
    else if (a.status === 'sakit') totalS++;
    else if (a.status === 'izin') totalI++;
    else if (a.status === 'alfa') totalA++;
  });
  const totalRecords = totalH + totalT + totalS + totalI + totalA;
  // Hadir + Terlambat both count as 'present' for percentage
  const avgAttendance = totalRecords > 0 ? Math.round(((totalH + totalT) / totalRecords) * 1000) / 10 : 0;

  // Per-class stats
  const classMap = {};
  classes.forEach(c => { classMap[c.id] = c.name; });

  const perClass = {};
  classes.forEach(c => {
    const classStudents = students.filter(s => s.classId === c.id);
    perClass[c.id] = {
      name: c.name,
      studentCount: classStudents.length,
      h: 0, t: 0, s: 0, i: 0, a: 0
    };
  });

  filtered.forEach(a => {
    const student = students.find(s => s.id === a.studentId);
    if (student && perClass[student.classId]) {
      const pc = perClass[student.classId];
      if (a.status === 'hadir') pc.h++;
      else if (a.status === 'terlambat') pc.t++;
      else if (a.status === 'sakit') pc.s++;
      else if (a.status === 'izin') pc.i++;
      else if (a.status === 'alfa') pc.a++;
    }
  });

  // Per-student stats
  const perStudent = {};
  students.forEach(s => {
    perStudent[s.id] = {
      id: s.id,
      name: s.name,
      gender: s.gender || '-',
      className: classMap[s.classId] || '-',
      classId: s.classId,
      h: 0, t: 0, s: 0, i: 0, a: 0
    };
  });

  filtered.forEach(a => {
    if (perStudent[a.studentId]) {
      const ps = perStudent[a.studentId];
      if (a.status === 'hadir') ps.h++;
      else if (a.status === 'terlambat') ps.t++;
      else if (a.status === 'sakit') ps.s++;
      else if (a.status === 'izin') ps.i++;
      else if (a.status === 'alfa') ps.a++;
    }
  });

  return {
    totalStudents: students.length,
    effectiveDays,
    totalH, totalT, totalS, totalI, totalA,
    avgAttendance,
    perClass: Object.values(perClass),
    perStudent: Object.values(perStudent).map(ps => ({
      ...ps,
      total: ps.h + ps.t + ps.s + ps.i + ps.a,
      pct: (ps.h + ps.t + ps.s + ps.i + ps.a) > 0 ? Math.round(((ps.h + ps.t) / (ps.h + ps.t + ps.s + ps.i + ps.a)) * 1000) / 10 : 0
    }))
  };
}

export function initStudentReports() {
  const monthSelect = document.getElementById('reportMonthSelect');
  const yearSelect = document.getElementById('reportYearSelect');
  const applyBtn = document.getElementById('applyReportFilterBtn');
  const classFilter = document.getElementById('individualClassFilter');
  const searchInput = document.getElementById('studentSearchInput');

  let currentMonth = parseInt(monthSelect.value);
  let currentYear = parseInt(yearSelect.value);
  let currentStats = null;

  function render() {
    currentStats = computeMonthlyStats(currentMonth, currentYear);
    renderStatCards(currentStats, currentMonth, currentYear);
    renderPerClassTable(currentStats);
    renderPerStudentTable(currentStats, classFilter.value, searchInput.value);
    renderWarningTable(currentStats);
  }

  applyBtn?.addEventListener('click', () => {
    currentMonth = parseInt(monthSelect.value);
    currentYear = parseInt(yearSelect.value);
    render();
  });

  classFilter?.addEventListener('change', () => {
    if (currentStats) renderPerStudentTable(currentStats, classFilter.value, searchInput.value);
  });

  searchInput?.addEventListener('input', () => {
    if (currentStats) renderPerStudentTable(currentStats, classFilter.value, searchInput.value);
  });

  // Export Excel
  document.getElementById('exportStudentReportsBtn')?.addEventListener('click', () => {
    const students = DataStore.getStudents();
    if (students.length === 0) {
      alert('Belum ada data siswa.');
      return;
    }
    generateStudentAttendanceReport(currentMonth, currentYear);
  });

  // PDF Bulk Monthly
  document.getElementById('exportPdfBulkBtn')?.addEventListener('click', () => {
    const classes = DataStore.getClasses();
    if (classes.length === 0) { alert('Belum ada data kelas.'); return; }
    const classOpts = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    showPdfDialog('Cetak PDF Bulanan Per Kelas', `
      <div class="form-group">
        <label style="font-weight:600;font-size:0.85rem;">Pilih Kelas</label>
        <select id="pdfClassSelect" class="form-control">${classOpts}</select>
      </div>
      <p style="font-size:0.82rem;color:var(--text-secondary);">PDF akan dicetak untuk bulan <strong>${monthsArr[currentMonth]} ${currentYear}</strong> (sesuai filter aktif).</p>
    `, () => {
      const classId = document.getElementById('pdfClassSelect').value;
      generateBulkMonthlyPdf(classId, currentMonth, currentYear);
    });
  });

  // PDF Bulk Semester
  document.getElementById('exportPdfSemesterBtn')?.addEventListener('click', () => {
    const classes = DataStore.getClasses();
    if (classes.length === 0) { alert('Belum ada data kelas.'); return; }
    const classOpts = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    showPdfDialog('Cetak PDF Semester Per Kelas', `
      <div class="form-group">
        <label style="font-weight:600;font-size:0.85rem;">Pilih Kelas</label>
        <select id="pdfSemClassSelect" class="form-control">${classOpts}</select>
      </div>
      <div class="form-row" style="gap:12px;">
        <div class="form-group" style="margin:0;flex:1;">
          <label style="font-weight:600;font-size:0.85rem;">Tahun</label>
          <input type="number" id="pdfSemYear" class="form-control" value="${currentYear}" />
        </div>
        <div class="form-group" style="margin:0;flex:1;">
          <label style="font-weight:600;font-size:0.85rem;">Semester</label>
          <select id="pdfSemType" class="form-control">
            <option value="1">Ganjil (Jul-Des)</option>
            <option value="2">Genap (Jan-Jun)</option>
          </select>
        </div>
      </div>
    `, () => {
      const classId = document.getElementById('pdfSemClassSelect').value;
      const year = parseInt(document.getElementById('pdfSemYear').value);
      const semType = document.getElementById('pdfSemType').value;
      generateBulkSemesterPdf(classId, year, semType);
    });
  });

  // Per-student PDF print button (delegated)
  document.getElementById('perStudentTable')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.print-student-pdf-btn');
    if (!btn) return;
    const studentId = btn.dataset.studentId;
    generateSingleStudentPdf(studentId, currentMonth, currentYear);
  });

  // Initial render
  render();
}

// ---- PDF Dialog Helper ----
const monthsArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function showPdfDialog(title, bodyHtml, onConfirm) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal-header">
        <h3>📄 ${title}</h3>
        <button class="modal-close" id="pdfDialogClose">✕</button>
      </div>
      <div class="modal-body" style="padding: 16px 20px;">
        ${bodyHtml}
      </div>
      <div class="modal-footer" style="padding: 12px 20px; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn btn-secondary" id="pdfDialogCancel">Batal</button>
        <button class="btn btn-primary" id="pdfDialogConfirm">📄 Cetak PDF</button>
      </div>
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('pdfDialogClose')?.addEventListener('click', close);
  document.getElementById('pdfDialogCancel')?.addEventListener('click', close);
  document.getElementById('pdfDialogConfirm')?.addEventListener('click', () => {
    onConfirm();
    close();
  });
}

// ---- Renderer functions ----

function renderStatCards(stats, month, year) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const container = document.getElementById('reportStatCards');
  if (!container) return;

  container.innerHTML = `
        <div class="stat-card" style="border-left-color: var(--accent-primary);">
          <div class="stat-title">Total Siswa</div>
          <div class="stat-value">${stats.totalStudents}</div>
          <div class="stat-desc">Di seluruh kelas</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-info);">
          <div class="stat-title">Hari Efektif</div>
          <div class="stat-value">${stats.effectiveDays}</div>
          <div class="stat-desc">${months[month]} ${year}</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-secondary);">
          <div class="stat-title">Rata-rata Kehadiran</div>
          <div class="stat-value">${stats.avgAttendance}%</div>
          <div class="stat-desc">Bulan ini</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-secondary);">
          <div class="stat-title">Total Hadir</div>
          <div class="stat-value">${stats.totalH}</div>
          <div class="stat-desc">Record</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-warning);">
          <div class="stat-title">Terlambat</div>
          <div class="stat-value">${stats.totalT}</div>
          <div class="stat-desc">Record</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-warning);">
          <div class="stat-title">Sakit + Izin</div>
          <div class="stat-value">${stats.totalS + stats.totalI}</div>
          <div class="stat-desc">${stats.totalS}S / ${stats.totalI}I</div>
        </div>
        <div class="stat-card" style="border-left-color: var(--accent-danger);">
          <div class="stat-title">Total Alfa</div>
          <div class="stat-value" style="color: var(--accent-danger);">${stats.totalA}</div>
          <div class="stat-desc">Tanpa keterangan</div>
        </div>
    `;
}

function renderPerClassTable(stats) {
  const tbody = document.getElementById('perClassTbody');
  if (!tbody) return;

  const sorted = [...stats.perClass]
    .filter(c => c.studentCount > 0)
    .map(c => {
      const total = c.h + c.t + c.s + c.i + c.a;
      c.pct = total > 0 ? Math.round(((c.h + c.t) / total) * 1000) / 10 : 0;
      return c;
    })
    .sort((a, b) => a.pct - b.pct); // lowest attendance first

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-tertiary); padding: 24px;">Belum ada data.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(c => {
    const warningStyle = c.pct < 90 ? 'background: rgba(239, 68, 68, 0.08);' : '';
    const pctColor = c.pct < 80 ? 'color: var(--accent-danger); font-weight: bold;' : (c.pct < 90 ? 'color: var(--accent-warning); font-weight: 600;' : 'color: var(--accent-secondary); font-weight: 600;');
    return `
            <tr style="${warningStyle}">
                <td><strong>${c.name}</strong></td>
                <td style="text-align:center;">${c.studentCount}</td>
                <td style="text-align:center;">${c.h}</td>
                <td style="text-align:center;">${c.t}</td>
                <td style="text-align:center;">${c.s}</td>
                <td style="text-align:center;">${c.i}</td>
                <td style="text-align:center;">${c.a}</td>
                <td style="text-align:center; ${pctColor}">${c.pct}%</td>
            </tr>
        `;
  }).join('');
}

function renderPerStudentTable(stats, classFilterValue, searchQuery) {
  const tbody = document.getElementById('perStudentTbody');
  if (!tbody) return;

  let data = stats.perStudent;

  // Filter by class
  if (classFilterValue && classFilterValue !== 'all') {
    data = data.filter(s => s.classId === classFilterValue);
  }

  // Filter by search
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    data = data.filter(s => s.name.toLowerCase().includes(q));
  }

  // Sort by % attendance ascending (worst first)
  data.sort((a, b) => a.pct - b.pct);

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: var(--text-tertiary); padding: 24px;">Tidak ada data siswa yang sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((s, i) => {
    const warningStyle = s.a >= 3 ? 'background: rgba(239, 68, 68, 0.08);' : '';
    const pctColor = s.pct < 80 ? 'color: var(--accent-danger); font-weight: bold;' : (s.pct < 90 ? 'color: var(--accent-warning); font-weight: 600;' : 'color: var(--accent-secondary); font-weight: 600;');
    return `
            <tr style="${warningStyle}">
                <td style="text-align:center;">${i + 1}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.gender === 'L' ? 'L' : s.gender === 'P' ? 'P' : '-'}</td>
                <td><span class="badge badge-class">${s.className}</span></td>
                <td style="text-align:center;">${s.h}</td>
                <td style="text-align:center;">${s.t}</td>
                <td style="text-align:center;">${s.s}</td>
                <td style="text-align:center;">${s.i}</td>
                <td style="text-align:center; ${s.a > 0 ? 'color: var(--accent-danger); font-weight: bold;' : ''}">${s.a}</td>
                <td style="text-align:center; ${pctColor}">${s.total > 0 ? s.pct + '%' : '-'}</td>
                <td style="text-align:center;"><button class="print-student-pdf-btn" data-student-id="${s.id}" title="Cetak PDF" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 6px;">📄</button></td>
            </tr>
        `;
  }).join('');
}

function renderWarningTable(stats) {
  const tbody = document.getElementById('warningTbody');
  if (!tbody) return;

  // Students with alfa >= 3 OR attendance < 80%
  const warnings = stats.perStudent
    .filter(s => s.a >= 3 || (s.total > 0 && s.pct < 80))
    .sort((a, b) => b.a - a.a); // Most alfa first

  if (warnings.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-tertiary); padding: 24px;">
                    Tidak ada siswa bermasalah pada bulan ini. Bagus! 🎉
                </td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = warnings.map((s, index) => {
    const pctColor = s.pct < 80 ? 'color: var(--accent-danger); font-weight: bold;' : 'color: var(--accent-warning);';
    return `
            <tr style="background: rgba(239, 68, 68, 0.05);">
                <td style="text-align: center; font-weight: bold; color: ${index < 3 ? 'var(--accent-danger)' : 'inherit'}">#${index + 1}</td>
                <td><strong>${s.name}</strong></td>
                <td><span class="badge badge-class">${s.className}</span></td>
                <td style="text-align: center; font-weight: bold; color: var(--accent-danger);">${s.a} Hari</td>
                <td style="text-align: center;">${s.s + s.i} Hari</td>
                <td style="text-align: center; ${pctColor}">${s.total > 0 ? s.pct + '%' : '-'}</td>
            </tr>
        `;
  }).join('');
}
