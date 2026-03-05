import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_MAP = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 0: 'Minggu' };

const STATUSES = [
  { key: 'hadir', icon: '✅', label: 'Hadir' },
  { key: 'terlambat', icon: '🕐', label: 'Terlambat' },
  { key: 'sakit', icon: '🤒', label: 'Sakit' },
  { key: 'izin', icon: '📋', label: 'Izin' },
  { key: 'alfa', icon: '❌', label: 'Alfa' },
];

let selectedDay = null;
let selectedClassId = '';
let weekOffset = 0;

function getTodayDay() {
  const jsDay = new Date().getDay();
  return DAY_MAP[jsDay] || 'Senin';
}

function getDateForDay(dayName) {
  const today = new Date();
  const todayDayIdx = today.getDay();
  const targetIdx = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 }[dayName] || 1;
  const diff = targetIdx - todayDayIdx + (weekOffset * 7);
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

function getWeekLabel() {
  const mondayDate = getDateForDay('Senin');
  const saturdayDate = getDateForDay('Sabtu');
  const d1 = new Date(mondayDate + 'T00:00:00');
  const d2 = new Date(saturdayDate + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (d1.getMonth() === d2.getMonth()) {
    return `${d1.getDate()}–${d2.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
  }
  return `${d1.getDate()} ${months[d1.getMonth()]} – ${d2.getDate()} ${months[d2.getMonth()]} ${d2.getFullYear()}`;
}

function formatDateIndo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function renderStudentAttendance() {
  const classes = DataStore.getClasses();
  const allStudents = DataStore.getStudents();

  if (!selectedDay) {
    const today = getTodayDay();
    selectedDay = DAYS.includes(today) ? today : 'Senin';
  }

  const selectedDate = getDateForDay(selectedDay);
  const isCurrentWeek = weekOffset === 0;
  const weekLabel = getWeekLabel();

  // Day tabs
  const dayTabs = DAYS.map(d => `
    <button class="day-tab ${d === selectedDay ? 'active' : ''}" data-day="${d}">${d.substring(0, 3)}</button>
  `).join('');

  // Class options
  const classOptions = classes.map(c => `<option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>${c.name}</option>`).join('');

  // Get students for selected class
  const students = selectedClassId
    ? allStudents.filter(s => s.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Load attendance data for the selected date
  const allAttendance = DataStore.getStudentAttendance();
  const dayAttendance = allAttendance.filter(a => a.date === selectedDate);

  // Build records for current class
  const records = {};
  students.forEach(s => {
    const existing = dayAttendance.find(a => a.studentId === s.id);
    records[s.id] = existing ? { status: existing.status, notes: existing.notes || '' } : { status: '', notes: '' };
  });

  // Summary counts for current class
  let hadirCount = 0, terlambatCount = 0, sakitCount = 0, izinCount = 0, alfaCount = 0, belumCount = 0;
  students.forEach(s => {
    const r = records[s.id];
    if (!r || !r.status) { belumCount++; return; }
    if (r.status === 'hadir') hadirCount++;
    else if (r.status === 'terlambat') terlambatCount++;
    else if (r.status === 'sakit') sakitCount++;
    else if (r.status === 'izin') izinCount++;
    else if (r.status === 'alfa') alfaCount++;
    else belumCount++;
  });

  // Find classes that have no attendance records at all for this day
  const unmarkedClasses = classes.filter(cls => {
    const classStudents = allStudents.filter(s => s.classId === cls.id);
    if (classStudents.length === 0) return false;
    const hasAnyRecord = classStudents.some(s => dayAttendance.find(a => a.studentId === s.id && a.status));
    return !hasAnyRecord;
  });

  // Build student cards
  let studentCards = '';
  if (!selectedClassId) {
    studentCards = `<div class="empty-state" style="padding: 24px;"><div class="empty-icon">👆</div><p>Pilih kelas terlebih dahulu untuk mulai mengabsen.</p></div>`;
  } else if (students.length === 0) {
    studentCards = `<div class="empty-state" style="padding: 24px;"><p>Tidak ada siswa di kelas ini.</p></div>`;
  } else {
    studentCards = students.map(student => {
      const record = records[student.id];
      const genderLabel = student.gender === 'P' ? 'Perempuan' : (student.gender === 'L' ? 'Laki-laki' : '');

      const statusBtns = STATUSES.map(s =>
        `<button class="att-btn att-${s.key} ${record.status === s.key ? 'active' : ''}" data-status="${s.key}" data-student="${student.id}" title="${s.label}">${s.icon}</button>`
      ).join('');

      const showNotes = record.status === 'sakit' || record.status === 'izin' || record.status === 'terlambat';

      return `
        <div class="att-teacher-card" style="border-left: 4px solid ${record.status ? 'var(--accent-' + (record.status === 'hadir' ? 'secondary' : record.status === 'terlambat' ? 'warning' : record.status === 'sakit' ? 'info' : record.status === 'izin' ? 'primary' : 'danger') + ')' : 'var(--border-color)'};">
          <div class="att-teacher-header">
            <div class="att-teacher-info">
              <div class="att-name">${student.name}</div>
              <div class="att-subjects">NISN: ${student.nisn || '-'} ${genderLabel ? '• ' + genderLabel : ''}</div>
            </div>
            <div class="att-status">${statusBtns}</div>
          </div>
          ${showNotes ? `
          <div class="att-sub-options">
            <input type="text" class="form-control sa-note-input" data-student="${student.id}" 
              placeholder="Keterangan (opsional)" 
              value="${record.notes || ''}" 
              style="height: 32px; font-size: 0.8rem; width: 100%; border-radius: 6px;" 
            />
          </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">✅</span> Presensi Siswa</h2>
          <p class="page-subtitle">Input absensi harian siswa oleh guru piket</p>
        </div>
      </div>

      <!-- Week Navigation -->
      <div class="week-nav">
        <button class="btn btn-sm btn-secondary" id="saPrevWeekBtn">◀ Minggu Lalu</button>
        <span class="week-label">${weekLabel}${isCurrentWeek ? ' (Minggu Ini)' : ''}</span>
        <button class="btn btn-sm btn-secondary" id="saNextWeekBtn">Minggu Depan ▶</button>
        ${!isCurrentWeek ? `<button class="btn btn-sm btn-primary" id="saTodayBtn" style="margin-left:8px;">Hari Ini</button>` : ''}
      </div>

      <div class="day-picker">
        <div class="day-tabs" id="saDayTabs">${dayTabs}</div>
        <div class="day-date">📅 ${formatDateIndo(selectedDate)}</div>
      </div>

      <!-- Class Selector -->
      <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
        <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
          <div class="form-group" style="margin: 0; min-width: 200px; flex: 1;">
            <label style="margin-bottom: 4px; font-size: 0.82rem; font-weight: 600;">Pilih Kelas</label>
            <select id="saClassSelect" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              ${classOptions}
            </select>
          </div>
          ${selectedClassId && students.length > 0 ? `
          <button id="saMarkAllHadirBtn" class="btn" style="background: var(--accent-secondary); color: #ffffff !important; border: none; font-weight: 600; padding: 8px 16px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height: 42px; align-self: flex-end;">
            ☑️ Tandai Semua Hadir
          </button>
          ` : ''}
        </div>
      </div>

      ${selectedClassId && students.length > 0 ? `
      <!-- Summary Bar -->
      <div class="att-summary">
        ${belumCount > 0 ? `<div class="att-summary-item att-s-belum"><span class="att-s-count">${belumCount}</span><span class="att-s-label">Belum Diisi</span></div>` : ''}
        <div class="att-summary-item att-s-hadir"><span class="att-s-count">${hadirCount}</span><span class="att-s-label">Hadir</span></div>
        <div class="att-summary-item att-s-terlambat"><span class="att-s-count">${terlambatCount}</span><span class="att-s-label">Terlambat</span></div>
        <div class="att-summary-item att-s-sakit"><span class="att-s-count">${sakitCount}</span><span class="att-s-label">Sakit</span></div>
        <div class="att-summary-item att-s-izin"><span class="att-s-count">${izinCount}</span><span class="att-s-label">Izin</span></div>
        <div class="att-summary-item att-s-alfa"><span class="att-s-count">${alfaCount}</span><span class="att-s-label">Alfa</span></div>
      </div>
      ` : ''}

      ${unmarkedClasses.length > 0 ? `
      <!-- Unmarked Classes Alert -->
      <div class="card" style="margin-bottom: 20px; padding: 14px 20px; border-left: 4px solid var(--accent-warning);">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.2rem;">⚠️</span>
          <div>
            <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 4px;">
              ${unmarkedClasses.length} kelas belum diabsen hari ini
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-wrap: wrap; gap: 6px;">
              ${unmarkedClasses.map(c => `
                <button class="sa-unmarked-class-btn" data-classid="${c.id}" style="
                  background: rgba(234, 179, 8, 0.1); 
                  border: 1px solid rgba(234, 179, 8, 0.3); 
                  border-radius: 4px; 
                  padding: 2px 10px; 
                  font-size: 0.78rem; 
                  color: var(--accent-warning); 
                  cursor: pointer;
                  font-family: inherit;
                  font-weight: 600;
                  transition: all 0.15s ease;
                ">${c.name}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Student List -->
      <div class="card" style="padding: 0;">
        ${selectedClassId && students.length > 0 ? `
        <div class="card-header" style="padding: 12px 16px;">
          <span class="card-title">📋 Daftar Siswa — ${classes.find(c => c.id === selectedClassId)?.name || ''} (${students.length} siswa)</span>
        </div>
        ` : ''}
        <div class="att-list" id="saStudentList" style="max-height: none;">
          ${studentCards}
        </div>
      </div>

    </div>
  `;
}

export function initStudentAttendance(refreshPage) {
  const selectedDate = getDateForDay(selectedDay);

  // Week navigation
  document.getElementById('saPrevWeekBtn')?.addEventListener('click', () => {
    weekOffset--;
    refreshPage();
  });
  document.getElementById('saNextWeekBtn')?.addEventListener('click', () => {
    weekOffset++;
    refreshPage();
  });
  document.getElementById('saTodayBtn')?.addEventListener('click', () => {
    weekOffset = 0;
    const today = getTodayDay();
    selectedDay = DAYS.includes(today) ? today : 'Senin';
    refreshPage();
  });

  // Day tabs
  document.querySelectorAll('#saDayTabs .day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectedDay = tab.dataset.day;
      refreshPage();
    });
  });

  // Class selector
  document.getElementById('saClassSelect')?.addEventListener('change', (e) => {
    selectedClassId = e.target.value;
    refreshPage();
  });

  // Unmarked class buttons — click to select that class
  document.querySelectorAll('.sa-unmarked-class-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClassId = btn.dataset.classid;
      refreshPage();
    });
  });

  // Status buttons — auto-save
  document.querySelectorAll('.att-btn[data-student]').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = btn.dataset.student;
      const status = btn.dataset.status;

      // Get current status from the DOM: check if this button is already active
      const isActive = btn.classList.contains('active');
      const newStatus = isActive ? '' : status;

      DataStore.saveOneStudentAttendance({
        studentId,
        date: selectedDate,
        status: newStatus,
        notes: newStatus ? '' : ''
      });

      refreshPage();
    });
  });

  // Notes input — auto-save
  document.querySelectorAll('.sa-note-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const studentId = input.dataset.student;
      const allAttendance = DataStore.getStudentAttendance();
      const existing = allAttendance.find(a => a.studentId === studentId && a.date === selectedDate);
      if (existing) {
        DataStore.saveOneStudentAttendance({
          studentId,
          date: selectedDate,
          status: existing.status,
          notes: e.target.value
        });
      }
    });
  });

  // Mark all as Hadir
  document.getElementById('saMarkAllHadirBtn')?.addEventListener('click', () => {
    const allStudents = DataStore.getStudents();
    const students = allStudents.filter(s => s.classId === selectedClassId);
    const allAttendance = DataStore.getStudentAttendance();

    const recordsToSave = [];
    students.forEach(s => {
      const existing = allAttendance.find(a => a.studentId === s.id && a.date === selectedDate);
      if (!existing || !existing.status) {
        recordsToSave.push({
          studentId: s.id,
          date: selectedDate,
          status: 'hadir',
          notes: ''
        });
      }
    });

    if (recordsToSave.length > 0) {
      DataStore.saveStudentAttendance(recordsToSave);
      showToast(`${recordsToSave.length} siswa ditandai Hadir`, 'success');
    } else {
      showToast('Semua siswa sudah diabsen', 'info');
    }
    refreshPage();
  });
}
