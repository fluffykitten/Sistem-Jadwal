// Dashboard page — Daily Schedule + Per-Slot Teacher Attendance
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';
import { getTeacherColorMap } from '../utils/teacherColors.js';

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
let selectedDate = '';
let weekOffset = 0; // 0 = current week, -1 = last week, 1 = next week

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
  return target.toISOString().slice(0, 10);
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

function entryKey(teacherId, slotId, classId) {
  return `${teacherId}__${slotId}__${classId}`;
}

export function renderDashboard() {
  const activeSemester = DataStore.getActiveSemester();
  const school = DataStore.getSchool();
  const teachers = DataStore.getTeachers();
  const subjects = DataStore.getSubjects();
  const classes = DataStore.getClasses();

  if (!selectedDay) {
    const today = getTodayDay();
    selectedDay = DAYS.includes(today) ? today : 'Senin';
  }
  selectedDate = getDateForDay(selectedDay);

  if (!activeSemester) {
    return `
      <div class="page-enter">
        <div class="page-header"><div>
          <h2><span class="header-icon">📊</span> Dashboard</h2>
        </div></div>
        <div class="card"><div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Belum ada semester aktif. Silakan buat semester terlebih dahulu.</p>
        </div></div>
      </div>
    `;
  }

  // Day tabs
  const dayTabs = DAYS.map(d => `
    <button class="day-tab ${d === selectedDay ? 'active' : ''}" data-day="${d}">${d.substring(0, 3)}</button>
  `).join('');

  // Week label
  const weekLabel = getWeekLabel();
  const isCurrentWeek = weekOffset === 0;

  // Get slots for selected day
  const slots = DataStore.getKbmSlotsForDay(selectedDay);
  const teacherColorMap = getTeacherColorMap(teachers);

  // Build schedule mini-table
  let scheduleRows = '';
  if (slots.length === 0) {
    scheduleRows = `<tr><td colspan="${classes.length + 2}" style="text-align:center; padding:24px; color:var(--text-tertiary);">Tidak ada profil jam KBM untuk hari ${selectedDay}</td></tr>`;
  } else {
    slots.forEach(slot => {
      if (slot.isBreak) {
        scheduleRows += `<tr class="break-row"><td class="slot-no">☕</td><td class="slot-time">${slot.startTime}-${slot.endTime}</td>${classes.map(() => `<td class="break-cell"></td>`).join('')}</tr>`;
      } else {
        let classCells = '';
        classes.forEach(cls => {
          const entry = DataStore.getScheduleAt(selectedDay, slot.id, cls.id);
          if (entry) {
            const teacher = entry.teacherId ? teachers.find(t => t.id === entry.teacherId) : null;
            const subject = subjects.find(s => s.id === entry.subjectId);
            const isNonPelajaran = subject && subject.type && subject.type !== 'pelajaran';
            const tc = teacher ? teacherColorMap.get(teacher.id) : null;
            const style = tc ? `background:${tc.bg}; border-left: 3px solid ${tc.text}; color:${tc.text};` : '';
            const teacherName = teacher ? teacher.name : (isNonPelajaran ? subject.type : '?');
            classCells += `<td><div class="mini-entry" style="${style}">${subject ? subject.code : '?'}<br><small>${teacherName}</small></div></td>`;
          } else {
            classCells += `<td class="empty-slot">-</td>`;
          }
        });
        scheduleRows += `<tr><td class="slot-no">${slot.label}</td><td class="slot-time">${slot.startTime}-${slot.endTime}</td>${classCells}</tr>`;
      }
    });
  }

  const classHeaders = classes.map(c => `<th>${c.name}</th>`).join('');

  // Build teacher→slots map for attendance (pelajaran only, with teacher)
  const teacherSlotMap = new Map();
  if (slots.length > 0) {
    classes.forEach(cls => {
      slots.forEach(slot => {
        if (!slot.isBreak) {
          const entry = DataStore.getScheduleAt(selectedDay, slot.id, cls.id);
          if (entry && entry.teacherId) {
            const subject = subjects.find(s => s.id === entry.subjectId);
            if (subject && subject.type && subject.type !== 'pelajaran') return;

            if (!teacherSlotMap.has(entry.teacherId)) {
              teacherSlotMap.set(entry.teacherId, []);
            }
            teacherSlotMap.get(entry.teacherId).push({ slot, cls, subject, entry });
          }
        }
      });
    });
  }

  teacherSlotMap.forEach(items => items.sort((a, b) => a.slot.order - b.slot.order));

  // Load attendance
  const attendance = DataStore.getAttendance(selectedDate) || { entries: [], notes: '' };
  const attMap = new Map();
  (attendance.entries || []).forEach(e => {
    attMap.set(entryKey(e.teacherId, e.kbmSlotId, e.classId), e);
  });

  // Build attendance cards
  let attendanceCards = '';
  const teachersWithSlots = teachers.filter(t => teacherSlotMap.has(t.id));

  if (teachersWithSlots.length === 0) {
    attendanceCards = `<div class="empty-state" style="padding: 24px;"><p>Tidak ada guru yang mengajar pada hari ${selectedDay}</p></div>`;
  } else {
    attendanceCards = teachersWithSlots.map(t => {
      const tc = teacherColorMap.get(t.id);
      const borderStyle = tc ? `border-left: 4px solid ${tc.text};` : '';
      const items = teacherSlotMap.get(t.id);

      const slotRows = items.map(({ slot, cls, subject }) => {
        const key = entryKey(t.id, slot.id, cls.id);
        const record = attMap.get(key); // null = belum diisi
        const status = record ? record.status : null; // null means not yet marked

        const statusBtns = STATUSES.map(s =>
          `<button class="att-btn att-${s.key} ${status === s.key ? 'active' : ''}" data-status="${s.key}" data-teacher="${t.id}" data-slot="${slot.id}" data-class="${cls.id}" title="${s.label}">${s.icon}</button>`
        ).join('');

        const subOpts = status === 'sakit' ? `
          <div class="att-sub-options">
            <label class="att-checkbox"><input type="checkbox" data-field="suratDokter" data-teacher="${t.id}" data-slot="${slot.id}" data-class="${cls.id}" ${record && record.suratDokter ? 'checked' : ''}> Surat Dokter</label>
            <label class="att-checkbox"><input type="checkbox" data-field="menitipkanTugas" data-teacher="${t.id}" data-slot="${slot.id}" data-class="${cls.id}" ${record && record.menitipkanTugas ? 'checked' : ''}> Menitipkan Tugas</label>
          </div>
        ` : status === 'izin' ? `
          <div class="att-sub-options">
            <label class="att-checkbox"><input type="checkbox" data-field="menitipkanTugas" data-teacher="${t.id}" data-slot="${slot.id}" data-class="${cls.id}" ${record && record.menitipkanTugas ? 'checked' : ''}> Menitipkan Tugas</label>
          </div>
        ` : '';

        return `
          <div class="att-slot-row ${status === null ? 'att-unmarked' : ''}" data-teacher="${t.id}" data-slot="${slot.id}" data-class="${cls.id}">
            <div class="att-slot-info">
              <span class="att-slot-label">Jam ${slot.label}</span>
              <span class="att-slot-time">${slot.startTime}–${slot.endTime}</span>
              <span class="att-slot-detail">${subject ? subject.code : '?'} — ${cls.name}</span>
            </div>
            <div class="att-status">${statusBtns}</div>
            ${subOpts}
          </div>
        `;
      }).join('');

      // "Tandai Semua" dropdown
      const markAllOptions = STATUSES.map(s =>
        `<button class="mark-all-option" data-teacher="${t.id}" data-status="${s.key}">${s.icon} ${s.label}</button>`
      ).join('');

      return `
        <div class="att-teacher-card" style="${borderStyle}">
          <div class="att-teacher-header">
            <div class="att-teacher-info">
              <div class="att-name">${t.name}</div>
              <div class="att-subjects">${items.length} jam pelajaran</div>
            </div>
            <div class="mark-all-wrap">
              <button class="btn btn-sm btn-secondary mark-all-toggle" data-teacher="${t.id}">Tandai Semua ▾</button>
              <div class="mark-all-dropdown hidden" id="markAll_${t.id}">${markAllOptions}</div>
            </div>
          </div>
          <div class="att-slots">${slotRows}</div>
        </div>
      `;
    }).join('');
  }

  // Summary counts
  let totalSlots = 0, hadirCount = 0, terlambatCount = 0, sakitCount = 0, izinCount = 0, alfaCount = 0, belumCount = 0;
  teachersWithSlots.forEach(t => {
    const items = teacherSlotMap.get(t.id);
    items.forEach(({ slot, cls }) => {
      totalSlots++;
      const key = entryKey(t.id, slot.id, cls.id);
      const r = attMap.get(key);
      if (!r) { belumCount++; return; }
      const s = r.status;
      if (s === 'hadir') hadirCount++;
      else if (s === 'terlambat') terlambatCount++;
      else if (s === 'sakit') sakitCount++;
      else if (s === 'izin') izinCount++;
      else if (s === 'alfa') alfaCount++;
      else belumCount++;
    });
  });

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📊</span> Dashboard</h2>
          <p class="page-subtitle">Presensi & Jadwal Harian — ${school.name || 'Sekolah'}</p>
        </div>
      </div>

      <!-- Week Navigation -->
      <div class="week-nav">
        <button class="btn btn-sm btn-secondary" id="prevWeekBtn">◀ Minggu Lalu</button>
        <span class="week-label">${weekLabel}${isCurrentWeek ? ' (Minggu Ini)' : ''}</span>
        <button class="btn btn-sm btn-secondary" id="nextWeekBtn">Minggu Depan ▶</button>
        ${!isCurrentWeek ? `<button class="btn btn-sm btn-primary" id="todayBtn" style="margin-left:8px;">Hari Ini</button>` : ''}
      </div>

      <div class="day-picker">
        <div class="day-tabs" id="dayTabs">${dayTabs}</div>
        <div class="day-date">📅 ${formatDateIndo(selectedDate)}</div>
      </div>

      ${totalSlots > 0 ? `
      <div class="att-summary">
        ${belumCount > 0 ? `<div class="att-summary-item att-s-belum"><span class="att-s-count">${belumCount}</span><span class="att-s-label">Belum Diisi</span></div>` : ''}
        <div class="att-summary-item att-s-hadir"><span class="att-s-count">${hadirCount}</span><span class="att-s-label">Hadir</span></div>
        <div class="att-summary-item att-s-terlambat"><span class="att-s-count">${terlambatCount}</span><span class="att-s-label">Terlambat</span></div>
        <div class="att-summary-item att-s-sakit"><span class="att-s-count">${sakitCount}</span><span class="att-s-label">Sakit</span></div>
        <div class="att-summary-item att-s-izin"><span class="att-s-count">${izinCount}</span><span class="att-s-label">Izin</span></div>
        <div class="att-summary-item att-s-alfa"><span class="att-s-count">${alfaCount}</span><span class="att-s-label">Alfa</span></div>
      </div>
      ` : ''}

      <div class="dashboard-two-col">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📋 Jadwal Hari ${selectedDay}</span>
          </div>
          <div class="data-table-wrap">
            <table class="data-table mini-schedule-table">
              <thead><tr><th style="width:40px;">No</th><th style="width:90px;">Jam</th>${classHeaders}</tr></thead>
              <tbody>${scheduleRows}</tbody>
            </table>
          </div>
        </div>

        <div class="dashboard-right-col">
          <div class="card">
            <div class="card-header">
              <span class="card-title">✅ Presensi Guru (${teachersWithSlots.length} guru, ${totalSlots} jam)</span>
            </div>
            <div class="att-list" id="attendanceList">${attendanceCards}</div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">📝 Catatan Hari Ini</span>
            </div>
            <textarea class="form-control att-notes" id="dailyNotes" placeholder="Tulis catatan untuk hari ini..." rows="4">${attendance.notes || ''}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initDashboard(refreshPage) {
  // Week navigation
  document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
    weekOffset--;
    refreshPage();
  });
  document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
    weekOffset++;
    refreshPage();
  });
  document.getElementById('todayBtn')?.addEventListener('click', () => {
    weekOffset = 0;
    const today = getTodayDay();
    selectedDay = DAYS.includes(today) ? today : 'Senin';
    refreshPage();
  });

  // Day tabs
  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectedDay = tab.dataset.day;
      refreshPage();
    });
  });

  // Per-slot status buttons
  document.querySelectorAll('.att-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { teacher, slot, class: classId, status } = btn.dataset;
      updateSlotAttendance(teacher, slot, classId, { status, suratDokter: false, menitipkanTugas: false });
      refreshPage();
    });
  });

  // Per-slot sub-option checkboxes
  document.querySelectorAll('.att-sub-options input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const { teacher, slot, class: classId, field } = cb.dataset;
      const current = getSlotAttendance(teacher, slot, classId);
      updateSlotAttendance(teacher, slot, classId, { ...current, [field]: cb.checked });
    });
  });

  // "Tandai Semua" toggle
  document.querySelectorAll('.mark-all-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const teacherId = btn.dataset.teacher;
      const dropdown = document.getElementById(`markAll_${teacherId}`);
      document.querySelectorAll('.mark-all-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
    });
  });

  // "Tandai Semua" options
  document.querySelectorAll('.mark-all-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const teacherId = btn.dataset.teacher;
      const status = btn.dataset.status;
      document.querySelectorAll(`.att-slot-row[data-teacher="${teacherId}"]`).forEach(row => {
        const slotId = row.dataset.slot;
        const classId = row.dataset.class;
        updateSlotAttendance(teacherId, slotId, classId, { status, suratDokter: false, menitipkanTugas: false });
      });
      refreshPage();
      showToast(`Semua jam ditandai ${status}`, 'info');
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.mark-all-dropdown').forEach(d => d.classList.add('hidden'));
  });

  // Daily notes
  const notesEl = document.getElementById('dailyNotes');
  if (notesEl) {
    let saveTimeout;
    const saveNotes = () => {
      const attendance = DataStore.getAttendance(selectedDate) || { date: selectedDate, entries: [], notes: '' };
      attendance.notes = notesEl.value;
      attendance.date = selectedDate;
      DataStore.saveAttendance(attendance);
    };
    notesEl.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveNotes, 500);
    });
    notesEl.addEventListener('blur', saveNotes);
  }
}

function getSlotAttendance(teacherId, slotId, classId) {
  const attendance = DataStore.getAttendance(selectedDate);
  if (!attendance) return { status: null, suratDokter: false, menitipkanTugas: false };
  const entry = (attendance.entries || []).find(
    e => e.teacherId === teacherId && e.kbmSlotId === slotId && e.classId === classId
  );
  return entry || { status: null, suratDokter: false, menitipkanTugas: false };
}

function updateSlotAttendance(teacherId, slotId, classId, updates) {
  let attendance = DataStore.getAttendance(selectedDate);
  if (!attendance) attendance = { date: selectedDate, entries: [], notes: '' };
  if (!attendance.entries) attendance.entries = [];

  const idx = attendance.entries.findIndex(
    e => e.teacherId === teacherId && e.kbmSlotId === slotId && e.classId === classId
  );
  const entry = {
    teacherId, kbmSlotId: slotId, classId,
    status: null, suratDokter: false, menitipkanTugas: false,
    ...updates
  };

  if (idx !== -1) {
    attendance.entries[idx] = entry;
  } else {
    attendance.entries.push(entry);
  }

  attendance.date = selectedDate;
  DataStore.saveAttendance(attendance);
}
