// Dashboard page
import DataStore from '../dataStore.js';

export function renderDashboard() {
  const semesters = DataStore.getSemesters();
  const subjects = DataStore.getSubjects();
  const classes = DataStore.getClasses();
  const teachers = DataStore.getTeachers();
  const kbmSlots = DataStore.getAllKbmSlots();
  const activeSemester = DataStore.getActiveSemester();
  const school = DataStore.getSchool();
  const schedules = DataStore.getSchedules();

  const totalSlots = classes.length * kbmSlots.filter(s => !s.isBreak).length * 6; // 6 days
  const filledSlots = schedules.length;
  const fillPercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📊</span> Dashboard</h2>
          <p class="page-subtitle">Selamat datang di Sistem Jadwal ${school.name || 'Sekolah'}</p>
        </div>
      </div>

      ${activeSemester ? `
        <div style="margin-bottom: 20px; padding: 12px 18px; background: linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,170,0.05)); border: 1px solid rgba(108,99,255,0.2); border-radius: var(--radius-md); font-size: 0.85rem;">
          📅 Semester Aktif: <strong>${activeSemester.name} — ${activeSemester.year} (${activeSemester.semester})</strong>
        </div>
      ` : `
        <div style="margin-bottom: 20px; padding: 12px 18px; background: rgba(255,179,71,0.08); border: 1px solid rgba(255,179,71,0.2); border-radius: var(--radius-md); font-size: 0.85rem; color: var(--accent-warning);">
          ⚠️ Belum ada semester aktif. Silakan buat semester terlebih dahulu.
        </div>
      `}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${subjects.length}</div>
          <div class="stat-label">Mata Pelajaran</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏫</div>
          <div class="stat-value">${classes.length}</div>
          <div class="stat-label">Kelas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👨‍🏫</div>
          <div class="stat-value">${teachers.length}</div>
          <div class="stat-label">Guru</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏰</div>
          <div class="stat-value">${kbmSlots.filter(s => !s.isBreak).length}</div>
          <div class="stat-label">Jam Pelajaran</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-value">${fillPercent}%</div>
          <div class="stat-label">Jadwal Terisi</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📆</div>
          <div class="stat-value">${semesters.length}</div>
          <div class="stat-label">Semester</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚡ Aksi Cepat</span>
          </div>
          <div class="quick-actions">
            <button class="quick-action-btn" data-nav="school"><span class="qa-icon">🏫</span> Identitas Sekolah</button>
            <button class="quick-action-btn" data-nav="semester"><span class="qa-icon">📅</span> Kelola Semester</button>
            <button class="quick-action-btn" data-nav="teachers"><span class="qa-icon">👨‍🏫</span> Kelola Guru</button>
            <button class="quick-action-btn" data-nav="schedule"><span class="qa-icon">📋</span> Buat Jadwal</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">📝 Langkah Setup</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 2;">
            <div>${school.name ? '✅' : '⬜'} 1. Isi identitas sekolah</div>
            <div>${semesters.length > 0 ? '✅' : '⬜'} 2. Buat semester & tahun pelajaran</div>
            <div>${subjects.length > 0 ? '✅' : '⬜'} 3. Input mata pelajaran</div>
            <div>${classes.length > 0 ? '✅' : '⬜'} 4. Input daftar kelas</div>
            <div>${teachers.length > 0 ? '✅' : '⬜'} 5. Input data guru</div>
            <div>${DataStore.hasKbmSlots() ? '✅' : '⬜'} 6. Atur profil jam KBM</div>
            <div>${filledSlots > 0 ? '✅' : '⬜'} 7. Buat jadwal pelajaran</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initDashboard() {
  document.querySelectorAll('.quick-action-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.nav;
      document.querySelector(`.nav-item[data-page="${page}"]`)?.click();
    });
  });
}
