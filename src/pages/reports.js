// Reports page — Attendance report generation
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';
import { exportDateRangeReport, exportSemesterReport, exportPerTeacherReport } from '../utils/attendanceExport.js';

export function renderReports() {
    const school = DataStore.getSchool();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();
    const activeSemester = DataStore.getActiveSemester();

    // Filter teachers who teach pelajaran
    const pelajaranTeachers = teachers.filter(t => {
        const subs = (t.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
        return subs.length === 0 || subs.some(s => !s.type || s.type === 'pelajaran');
    });

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + '01';

    const teacherOptions = pelajaranTeachers.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

    return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📊</span> Laporan Presensi</h2>
          <p class="page-subtitle">Ekspor laporan kehadiran guru ke Excel</p>
        </div>
      </div>

      <div class="reports-grid">
        <!-- Date Range Report -->
        <div class="card report-card">
          <div class="report-card-icon">📅</div>
          <h3 class="report-card-title">Laporan Rentang Tanggal</h3>
          <p class="report-card-desc">Daftar hadir semua guru untuk rentang tanggal tertentu. Cocok untuk laporan mingguan atau bulanan.</p>
          <div class="report-form">
            <div class="form-row">
              <div class="form-group">
                <label>Tanggal Mulai</label>
                <input type="date" class="form-control" id="rangeStart" value="${monthStart}" />
              </div>
              <div class="form-group">
                <label>Tanggal Akhir</label>
                <input type="date" class="form-control" id="rangeEnd" value="${today}" />
              </div>
            </div>
            <button class="btn btn-primary report-btn" id="exportRangeBtn">
              📥 Ekspor Laporan
            </button>
          </div>
        </div>

        <!-- Semester Report -->
        <div class="card report-card">
          <div class="report-card-icon">📊</div>
          <h3 class="report-card-title">Rekap Semester</h3>
          <p class="report-card-desc">Ringkasan kehadiran per bulan selama satu semester. Menampilkan jumlah hadir per bulan dan persentase kehadiran.</p>
          ${activeSemester ? `
            <div class="report-semester-info">
              <span>📚 ${activeSemester.name}</span>
              <span>${activeSemester.year} (${activeSemester.semester})</span>
            </div>
            <button class="btn btn-primary report-btn" id="exportSemesterBtn">
              📥 Ekspor Rekap
            </button>
          ` : `
            <div class="empty-state" style="padding: 16px;">
              <p>Belum ada semester aktif</p>
            </div>
          `}
        </div>

        <!-- Per Teacher Report -->
        <div class="card report-card">
          <div class="report-card-icon">👨‍🏫</div>
          <h3 class="report-card-title">Laporan Per Guru</h3>
          <p class="report-card-desc">Laporan detail untuk satu guru: setiap jam pelajaran dengan status kehadiran dan keterangan.</p>
          <div class="report-form">
            <div class="form-group">
              <label>Pilih Guru</label>
              <select class="form-control" id="reportTeacher">
                <option value="">-- Pilih Guru --</option>
                ${teacherOptions}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Tanggal Mulai</label>
                <input type="date" class="form-control" id="teacherRangeStart" value="${monthStart}" />
              </div>
              <div class="form-group">
                <label>Tanggal Akhir</label>
                <input type="date" class="form-control" id="teacherRangeEnd" value="${today}" />
              </div>
            </div>
            <button class="btn btn-primary report-btn" id="exportTeacherBtn">
              📥 Ekspor Laporan Guru
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initReports() {
    // Date Range Report
    document.getElementById('exportRangeBtn')?.addEventListener('click', async () => {
        const start = document.getElementById('rangeStart')?.value;
        const end = document.getElementById('rangeEnd')?.value;
        if (!start || !end) {
            showToast('Pilih tanggal mulai dan akhir', 'warning');
            return;
        }
        if (start > end) {
            showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning');
            return;
        }
        try {
            await exportDateRangeReport(start, end);
            showToast('Laporan berhasil diunduh!', 'success');
        } catch (err) {
            showToast('Gagal membuat laporan: ' + err.message, 'error');
        }
    });

    // Semester Report
    document.getElementById('exportSemesterBtn')?.addEventListener('click', async () => {
        try {
            await exportSemesterReport();
            showToast('Rekap semester berhasil diunduh!', 'success');
        } catch (err) {
            showToast('Gagal membuat rekap: ' + err.message, 'error');
        }
    });

    // Per Teacher Report
    document.getElementById('exportTeacherBtn')?.addEventListener('click', async () => {
        const teacherId = document.getElementById('reportTeacher')?.value;
        const start = document.getElementById('teacherRangeStart')?.value;
        const end = document.getElementById('teacherRangeEnd')?.value;
        if (!teacherId) {
            showToast('Pilih guru terlebih dahulu', 'warning');
            return;
        }
        if (!start || !end) {
            showToast('Pilih tanggal mulai dan akhir', 'warning');
            return;
        }
        if (start > end) {
            showToast('Tanggal mulai harus sebelum tanggal akhir', 'warning');
            return;
        }
        try {
            await exportPerTeacherReport(teacherId, start, end);
            showToast('Laporan guru berhasil diunduh!', 'success');
        } catch (err) {
            showToast('Gagal membuat laporan: ' + err.message, 'error');
        }
    });
}
