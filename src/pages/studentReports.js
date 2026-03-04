import DataStore from '../dataStore.js';
import { generateStudentAttendanceReport } from '../utils/excelExport.js';

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
        <div>
          <button id="exportStudentReportsBtn" class="btn btn-secondary">
            <span style="margin-right:8px;">📥</span> Ekspor Laporan Excel
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
                <th style="text-align:center;">Sakit</th>
                <th style="text-align:center;">Izin</th>
                <th style="text-align:center;">Alfa</th>
                <th style="text-align:center;">% Kehadiran</th>
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
    let totalH = 0, totalS = 0, totalI = 0, totalA = 0;
    filtered.forEach(a => {
        if (a.status === 'H') totalH++;
        if (a.status === 'S') totalS++;
        if (a.status === 'I') totalI++;
        if (a.status === 'A') totalA++;
    });
    const totalRecords = totalH + totalS + totalI + totalA;
    const avgAttendance = totalRecords > 0 ? Math.round((totalH / totalRecords) * 1000) / 10 : 0;

    // Per-class stats
    const classMap = {};
    classes.forEach(c => { classMap[c.id] = c.name; });

    const perClass = {};
    classes.forEach(c => {
        const classStudents = students.filter(s => s.classId === c.id);
        perClass[c.id] = {
            name: c.name,
            studentCount: classStudents.length,
            h: 0, s: 0, i: 0, a: 0
        };
    });

    filtered.forEach(a => {
        const student = students.find(s => s.id === a.studentId);
        if (student && perClass[student.classId]) {
            const pc = perClass[student.classId];
            if (a.status === 'H') pc.h++;
            if (a.status === 'S') pc.s++;
            if (a.status === 'I') pc.i++;
            if (a.status === 'A') pc.a++;
        }
    });

    // Per-student stats
    const perStudent = {};
    students.forEach(s => {
        perStudent[s.id] = {
            name: s.name,
            gender: s.gender || '-',
            className: classMap[s.classId] || '-',
            classId: s.classId,
            h: 0, s: 0, i: 0, a: 0
        };
    });

    filtered.forEach(a => {
        if (perStudent[a.studentId]) {
            const ps = perStudent[a.studentId];
            if (a.status === 'H') ps.h++;
            if (a.status === 'S') ps.s++;
            if (a.status === 'I') ps.i++;
            if (a.status === 'A') ps.a++;
        }
    });

    return {
        totalStudents: students.length,
        effectiveDays,
        totalH, totalS, totalI, totalA,
        avgAttendance,
        perClass: Object.values(perClass),
        perStudent: Object.values(perStudent).map(ps => ({
            ...ps,
            total: ps.h + ps.s + ps.i + ps.a,
            pct: (ps.h + ps.s + ps.i + ps.a) > 0 ? Math.round((ps.h / (ps.h + ps.s + ps.i + ps.a)) * 1000) / 10 : 0
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

    // Export
    document.getElementById('exportStudentReportsBtn')?.addEventListener('click', () => {
        const students = DataStore.getStudents();
        if (students.length === 0) {
            alert('Belum ada data siswa.');
            return;
        }
        generateStudentAttendanceReport(currentMonth, currentYear);
    });

    // Initial render
    render();
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
            const total = c.h + c.s + c.i + c.a;
            c.pct = total > 0 ? Math.round((c.h / total) * 1000) / 10 : 0;
            return c;
        })
        .sort((a, b) => a.pct - b.pct); // lowest attendance first

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-tertiary); padding: 24px;">Belum ada data.</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-tertiary); padding: 24px;">Tidak ada data siswa yang sesuai filter.</td></tr>`;
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
                <td style="text-align:center;">${s.s}</td>
                <td style="text-align:center;">${s.i}</td>
                <td style="text-align:center; ${s.a > 0 ? 'color: var(--accent-danger); font-weight: bold;' : ''}">${s.a}</td>
                <td style="text-align:center; ${pctColor}">${s.total > 0 ? s.pct + '%' : '-'}</td>
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
