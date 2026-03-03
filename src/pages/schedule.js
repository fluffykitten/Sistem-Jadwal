// Schedule Builder page — drag & drop with per-day KBM profiles
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';
import { exportScheduleToExcel } from '../utils/excelExport.js';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let selectedClassId = null;

export function renderSchedule() {
  const classes = DataStore.getClasses();
  const teachers = DataStore.getTeachers();
  const subjects = DataStore.getSubjects();
  const activeSemester = DataStore.getActiveSemester();
  const hasSlots = DataStore.hasKbmSlots();

  if (!activeSemester) {
    return `
      <div class="page-enter">
        <div class="page-header"><div>
          <h2><span class="header-icon">📋</span> Jadwal Pelajaran</h2>
        </div></div>
        <div class="card"><div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Belum ada semester aktif. Silakan buat semester terlebih dahulu.</p>
        </div></div>
      </div>
    `;
  }

  if (classes.length === 0 || teachers.length === 0 || !hasSlots) {
    const missing = [];
    if (classes.length === 0) missing.push('Kelas');
    if (teachers.length === 0) missing.push('Guru');
    if (!hasSlots) missing.push('Profil Jam KBM');
    return `
      <div class="page-enter">
        <div class="page-header"><div>
          <h2><span class="header-icon">📋</span> Jadwal Pelajaran</h2>
        </div></div>
        <div class="card"><div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Data berikut belum tersedia: <strong>${missing.join(', ')}</strong>.<br>Silakan lengkapi terlebih dahulu.</p>
        </div></div>
      </div>
    `;
  }

  if (!selectedClassId || !classes.find(c => c.id === selectedClassId)) {
    selectedClassId = classes[0].id;
  }

  // Teacher panel cards
  const teacherCards = teachers.map(t => {
    const subjNames = (t.subjectIds || []).map(sid => {
      const s = subjects.find(x => x.id === sid);
      return s ? s.code : '';
    }).filter(Boolean).join(', ');
    return `
      <div class="teacher-card" draggable="true" data-teacher-id="${t.id}" data-subject-ids="${(t.subjectIds || []).join(',')}">
        <div class="teacher-name">${t.name}</div>
        <div class="teacher-subject">${subjNames || 'Tidak ada mapel'}</div>
      </div>
    `;
  }).join('');

  // Class tabs
  const classTabs = classes.map(c => `
    <button class="class-tab ${c.id === selectedClassId ? 'active' : ''}" data-class-id="${c.id}">${c.name}</button>
  `).join('');

  // Build per-day schedule grid
  // Collect max rows needed -- find the profile with most slots for each day
  const daySlots = {};
  let maxSlotCount = 0;
  DAYS.forEach(day => {
    const slots = DataStore.getKbmSlotsForDay(day);
    daySlots[day] = slots;
    if (slots.length > maxSlotCount) maxSlotCount = slots.length;
  });

  // We need to render day by day — each day column may have different rows
  // Strategy: use a unified row layout based on max slots, where each row index
  // maps to the slot at that position in the day's profile
  const numCols = 1 + DAYS.length;
  const gridStyle = `grid-template-columns: 100px repeat(${DAYS.length}, 1fr);`;

  // Grid headers
  let gridHeaders = `<div class="grid-header" style="border-right: 1px solid var(--border-color);">Jam</div>`;
  gridHeaders += DAYS.map(d => {
    const slots = daySlots[d];
    const profileNote = slots.length > 0 ? '' : ' (-)';
    return `<div class="grid-header">${d}${profileNote}</div>`;
  }).join('');

  // Grid body — iterate by row index
  let gridBody = '';
  for (let rowIdx = 0; rowIdx < maxSlotCount; rowIdx++) {
    // Find a representative slot for the time label (use first day that has this row)
    let timeLabel = '';
    let timeRange = '';
    let isBreakRow = false;

    // Determine row label from first available profile at this index
    for (const day of DAYS) {
      const slots = daySlots[day];
      if (slots[rowIdx]) {
        const slot = slots[rowIdx];
        timeLabel = slot.isBreak ? '☕' : slot.label;
        timeRange = `${slot.startTime}-${slot.endTime}`;
        isBreakRow = slot.isBreak;
        break;
      }
    }

    // Time column
    gridBody += `
      <div class="grid-time ${isBreakRow ? 'is-break' : ''}">
        <span class="slot-label">${timeLabel}</span>
        <span class="slot-time">${timeRange}</span>
      </div>
    `;

    // Day cells
    DAYS.forEach(day => {
      const slots = daySlots[day];
      const slot = slots[rowIdx];

      if (!slot) {
        gridBody += `<div class="schedule-cell" style="background: var(--bg-glass); pointer-events: none;"></div>`;
      } else if (slot.isBreak) {
        gridBody += `<div class="schedule-cell is-break"></div>`;
      } else {
        const entry = DataStore.getScheduleAt(day, slot.id, selectedClassId);
        let cellContent = '';
        if (entry) {
          const teacher = teachers.find(t => t.id === entry.teacherId);
          const subject = subjects.find(s => s.id === entry.subjectId);
          cellContent = `
            <div class="schedule-entry type-${subject ? (subject.type || 'pelajaran') : 'pelajaran'}" data-schedule-id="${entry.id}">
              <span class="entry-teacher">${teacher ? teacher.name : '?'}</span>
              <span class="entry-subject">${subject ? subject.code : ''}</span>
              <button class="entry-remove" data-schedule-id="${entry.id}" title="Hapus">✕</button>
            </div>
          `;
        }
        gridBody += `
          <div class="schedule-cell" data-day="${day}" data-slot-id="${slot.id}" data-class-id="${selectedClassId}">
            ${cellContent}
          </div>
        `;
      }
    });
  }

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📋</span> Jadwal Pelajaran</h2>
          <p class="page-subtitle">${activeSemester.name} — ${activeSemester.year}</p>
        </div>
        <button class="btn btn-success" id="exportExcelBtn">📥 Ekspor ke Excel</button>
      </div>

      <div class="schedule-builder">
        <!-- Teacher Panel -->
        <div class="teacher-panel">
          <div class="teacher-panel-title">Daftar Guru</div>
          <input type="text" class="teacher-search" id="teacherSearch" placeholder="🔍 Cari guru..." />
          <div id="teacherList">
            ${teacherCards}
          </div>
        </div>

        <!-- Schedule Grid -->
        <div class="schedule-grid-wrap">
          <div class="schedule-controls">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Kelas:</span>
            <div class="class-tabs" id="classTabs">
              ${classTabs}
            </div>
          </div>

          <div class="schedule-grid" id="scheduleGrid" style="${gridStyle}">
            ${gridHeaders}
            ${gridBody}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initSchedule(refreshPage) {
  // Class tab switching
  document.querySelectorAll('.class-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      selectedClassId = tab.dataset.classId;
      refreshPage();
    });
  });

  // Teacher search
  const searchInput = document.getElementById('teacherSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      document.querySelectorAll('.teacher-card').forEach(card => {
        const name = card.querySelector('.teacher-name').textContent.toLowerCase();
        const subject = card.querySelector('.teacher-subject').textContent.toLowerCase();
        card.style.display = (name.includes(query) || subject.includes(query)) ? '' : 'none';
      });
    });
  }

  // Drag & Drop
  setupDragAndDrop(refreshPage);

  // Remove schedule entries
  document.querySelectorAll('.entry-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      DataStore.removeSchedule(btn.dataset.scheduleId);
      showToast('Jadwal dihapus', 'info');
      refreshPage();
    });
  });

  // Export Excel
  document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
    exportScheduleToExcel();
  });
}

function setupDragAndDrop(refreshPage) {
  const teacherCards = document.querySelectorAll('.teacher-card');
  const cells = document.querySelectorAll('.schedule-cell:not(.is-break)');

  let dragData = null;

  teacherCards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      const teacherId = card.dataset.teacherId;
      const subjectIds = (card.dataset.subjectIds || '').split(',').filter(Boolean);
      dragData = { teacherId, subjectIds };
      e.dataTransfer.setData('text/plain', teacherId);
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragData = null;
      cells.forEach(c => {
        c.classList.remove('drag-over');
        c.classList.remove('conflict');
      });
    });
  });

  cells.forEach(cell => {
    if (!cell.dataset.day) return; // Skip empty/inactive cells

    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      if (dragData) {
        const day = cell.dataset.day;
        const slotId = cell.dataset.slotId;

        // Determine if the subject being dragged is 'pelajaran' type
        const subjects = DataStore.getSubjects();
        const dragSubjects = (dragData.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
        const allNonPelajaran = dragSubjects.length > 0 && dragSubjects.every(s => s.type && s.type !== 'pelajaran');

        const hasConflict = allNonPelajaran ? false : DataStore.hasConflict(dragData.teacherId, day, slotId);

        cell.classList.remove('drag-over', 'conflict');
        if (hasConflict) {
          cell.classList.add('conflict');
        } else {
          cell.classList.add('drag-over');
        }
      }
    });

    cell.addEventListener('dragleave', () => {
      cell.classList.remove('drag-over', 'conflict');
    });

    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over', 'conflict');

      if (!dragData) return;

      const day = cell.dataset.day;
      const slotId = cell.dataset.slotId;
      const classId = cell.dataset.classId;
      const teacherId = dragData.teacherId;

      const existing = DataStore.getScheduleAt(day, slotId, classId);
      if (existing) {
        showToast('Slot ini sudah terisi. Hapus dulu untuk mengganti.', 'warning');
        return;
      }

      // Only check conflict for 'pelajaran' type subjects
      const subjects = DataStore.getSubjects();
      const dragSubjects = (dragData.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
      const allNonPelajaran = dragSubjects.length > 0 && dragSubjects.every(s => s.type && s.type !== 'pelajaran');

      if (!allNonPelajaran && DataStore.hasConflict(teacherId, day, slotId)) {
        showToast('Guru ini sudah mengajar di jam yang sama di kelas lain!', 'error');
        return;
      }

      const subjectId = dragData.subjectIds.length > 0 ? dragData.subjectIds[0] : null;

      if (dragData.subjectIds.length > 1) {
        showSubjectPicker(teacherId, dragData.subjectIds, day, slotId, classId, refreshPage);
      } else {
        DataStore.addSchedule({ teacherId, subjectId, day, kbmSlotId: slotId, classId });
        showToast('Jadwal berhasil ditambahkan!', 'success');
        refreshPage();
      }
    });
  });
}

function showSubjectPicker(teacherId, subjectIds, day, slotId, classId, refreshPage) {
  const subjects = DataStore.getSubjects();
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('hidden');

  const options = subjectIds.map(sid => {
    const s = subjects.find(x => x.id === sid);
    return s ? `<button class="btn btn-secondary" style="width: 100%; margin-bottom: 6px;" data-subject-id="${s.id}">${s.name} (${s.code})</button>` : '';
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Pilih Mata Pelajaran</h3>
      <button class="modal-close" id="modalCloseBtn">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">Guru ini mengampu lebih dari 1 mapel. Pilih mapel untuk slot ini:</p>
      ${options}
    </div>
  `;

  overlay.innerHTML = '';
  overlay.appendChild(modal);

  const closeModal = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  };

  modal.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  modal.querySelectorAll('[data-subject-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenSubjectId = btn.dataset.subjectId;
      const chosenSubject = subjects.find(s => s.id === chosenSubjectId);
      const isNonPelajaran = chosenSubject && chosenSubject.type && chosenSubject.type !== 'pelajaran';

      if (!isNonPelajaran && DataStore.hasConflict(teacherId, day, slotId)) {
        showToast('Guru ini sudah mengajar di jam yang sama di kelas lain!', 'error');
        return;
      }

      DataStore.addSchedule({
        teacherId,
        subjectId: chosenSubjectId,
        day,
        kbmSlotId: slotId,
        classId
      });
      closeModal();
      showToast('Jadwal berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });
}
