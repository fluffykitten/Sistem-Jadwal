import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';

export function renderStudentAttendance() {
  const classes = DataStore.getClasses();
  const today = new Date().toISOString().split('T')[0];

  const classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">✅</span> Presensi Siswa</h2>
          <p class="page-subtitle">Input absensi harian siswa oleh guru piket</p>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin: 0; min-width: 200px;">
            <label>Pilih Kelas</label>
            <select id="attendanceClassSelect" class="form-control">
              <option value="">-- Pilih Kelas --</option>
              ${classOptions}
            </select>
          </div>
          <div class="form-group" style="margin: 0; min-width: 200px;">
            <label>Tanggal</label>
            <input type="date" id="attendanceDateInput" class="form-control" value="${today}" />
          </div>
          <button id="loadAttendanceBtn" class="btn btn-primary" style="height: 42px;">Muat Daftar Siswa</button>
        </div>
      </div>

      <div id="attendanceContainer" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Daftar Siswa</h3>
          <button id="markAllPresentBtn" class="btn" style="background: var(--accent-secondary); color: #ffffff !important; border: none; font-weight: 600; padding: 8px 16px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ☑️ Tandai Semua Hadir
          </button>
        </div>
        
        <div id="studentGrid" style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Kartu list siswa akan di-render di sini -->
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
          <button id="saveAttendanceBtn" class="btn btn-primary btn-lg">💾 Simpan Presensi</button>
        </div>
      </div>
      
      <div id="emptyAttendanceState" class="empty-state">
        <div class="empty-icon">👆</div>
        <p>Pilih kelas dan tanggal, lalu klik "Muat Daftar Siswa" untuk mulai mengabsen.</p>
      </div>

    </div>
  `;
}

// Helper untuk format styling kartu status
const STATUS_STYLES = {
  '': { bg: 'var(--bg-tertiary)', border: 'var(--border-color)', color: 'var(--text-secondary)', label: 'Belum Diabsen' },
  'H': { bg: 'rgba(34, 197, 94, 0.1)', border: 'var(--success)', color: 'var(--success)', label: 'Hadir' },
  'S': { bg: 'rgba(234, 179, 8, 0.1)', border: 'var(--warning)', color: 'var(--warning-dark, #a16207)', label: 'Sakit' },
  'I': { bg: 'rgba(56, 189, 248, 0.1)', border: 'var(--info, #38bdf8)', color: 'var(--info-dark, #0284c7)', label: 'Izin' },
  'A': { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--danger)', color: 'var(--danger)', label: 'Alfa' }
};

// Urutan mutasi status pas di-klik
const NEXT_STATUS = {
  '': 'H',
  'H': 'S',
  'S': 'I',
  'I': 'A',
  'A': 'H'
};

export function initStudentAttendance() {
  const loadBtn = document.getElementById('loadAttendanceBtn');
  const classSelect = document.getElementById('attendanceClassSelect');
  const dateInput = document.getElementById('attendanceDateInput');
  const container = document.getElementById('attendanceContainer');
  const emptyState = document.getElementById('emptyAttendanceState');
  const grid = document.getElementById('studentGrid');
  const markAllBtn = document.getElementById('markAllPresentBtn');
  const saveBtn = document.getElementById('saveAttendanceBtn');

  // State local selama di halaman ini
  let currentStudents = [];
  let currentRecords = {}; // { studentId: { status, notes } }

  const renderGrid = () => {
    grid.innerHTML = currentStudents.map(student => {
      const record = currentRecords[student.id] || { status: '', notes: '' };
      const genderLabel = student.gender === 'P' ? 'Perempuan' : (student.gender === 'L' ? 'Laki-laki' : '');

      const btnStyle = (type, isActive) => {
        const colors = {
          'H': { bg: 'var(--accent-secondary)', text: '#ffffff' },
          'S': { bg: 'var(--accent-warning)', text: '#ffffff' },
          'I': { bg: 'var(--accent-info)', text: '#ffffff' },
          'A': { bg: 'var(--accent-danger)', text: '#ffffff' }
        };
        const activeCss = isActive
          ? `background: ${colors[type].bg} !important; color: ${colors[type].text} !important; border-color: ${colors[type].bg} !important;`
          : `background: transparent; color: var(--text-secondary); border-color: var(--border-color);`;
        return `width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid; font-weight: bold; cursor: pointer; transition: all 0.2s ease; ${activeCss}`;
      };

      return `
        <div class="student-list-item" data-id="${student.id}" style="
          background: var(--bg-tertiary); 
          border: 1px solid var(--border-color);
          border-left: 4px solid ${record.status ? 'var(--accent-' + (record.status === 'H' ? 'secondary' : record.status === 'S' ? 'warning' : record.status === 'I' ? 'info' : 'danger') + ')' : 'var(--border-color)'}; 
          border-radius: 8px; 
          padding: 12px 16px; 
          display: flex;
          flex-direction: column;
          gap: 12px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 1.05rem;" class="student-name">${student.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 4px;">NISN: ${student.nisn || '-'} ${genderLabel ? '• ' + genderLabel : ''}</div>
            </div>
            <div style="display: flex; gap: 6px;" class="status-selector">
              <button type="button" class="stat-btn" data-status="H" style="${btnStyle('H', record.status === 'H')}">H</button>
              <button type="button" class="stat-btn" data-status="S" style="${btnStyle('S', record.status === 'S')}">S</button>
              <button type="button" class="stat-btn" data-status="I" style="${btnStyle('I', record.status === 'I')}">I</button>
              <button type="button" class="stat-btn" data-status="A" style="${btnStyle('A', record.status === 'A')}">A</button>
            </div>
          </div>
          
          <div class="notes-container" style="display: ${record.status === 'S' || record.status === 'I' ? 'block' : 'none'};">
            <input type="text" class="form-control stat-note-input" placeholder="Keterangan (Opsional) - mis: Surat dokter, acara keluarga" 
              value="${record.notes || ''}" 
              style="height: 34px; font-size: 0.85rem; width: 100%; border-radius: 6px;" 
            />
          </div>
        </div>
      `;
    }).join('');

    // Attach click events on buttons
    grid.querySelectorAll('.student-list-item').forEach(item => {
      const id = item.dataset.id;

      item.querySelectorAll('.stat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const newStatus = btn.dataset.status;

          // Toggle off if clicking the active one
          if (currentRecords[id].status === newStatus) {
            currentRecords[id].status = '';
          } else {
            currentRecords[id].status = newStatus;
          }

          // Reset notes if it's no longer S or I
          if (currentRecords[id].status !== 'S' && currentRecords[id].status !== 'I') {
            currentRecords[id].notes = '';
          }

          renderGrid(); // Re-render to update UI state
        });
      });

      // Bind input events to save notes without re-rendering so input focus isn't lost
      const noteInput = item.querySelector('.stat-note-input');
      if (noteInput) {
        noteInput.addEventListener('input', (e) => {
          currentRecords[id].notes = e.target.value;
        });
      }
    });
  };

  loadBtn?.addEventListener('click', () => {
    const classId = classSelect.value;
    const date = dateInput.value;

    if (!classId || !date) {
      showToast('Pilih Kelas dan Tanggal terlebih dahulu', 'warning');
      return;
    }

    // Ambil data siswa di kelas tersebut
    const allStudents = DataStore.getStudents();
    currentStudents = allStudents.filter(s => s.classId === classId);

    if (currentStudents.length === 0) {
      showToast('Tidak ada siswa di kelas ini.', 'info');
      emptyState.style.display = 'flex';
      container.style.display = 'none';
      return;
    }

    // Sort by name
    currentStudents.sort((a, b) => a.name.localeCompare(b.name));

    // Cek apakah sudah ada absen di tanggal tsb
    const allAttendance = DataStore.getStudentAttendance();
    currentRecords = {};

    currentStudents.forEach(s => {
      const existing = allAttendance.find(a => a.studentId === s.id && a.date === date);
      if (existing) {
        currentRecords[s.id] = { status: existing.status, notes: existing.notes || '' };
      } else {
        currentRecords[s.id] = { status: '', notes: '' }; // Default belum diabsen
      }
    });

    emptyState.style.display = 'none';
    container.style.display = 'block';
    renderGrid();
  });

  markAllBtn?.addEventListener('click', () => {
    currentStudents.forEach(s => {
      // Hanya ubah yang masih kosong (belum diabsen)
      if (currentRecords[s.id].status === '') {
        currentRecords[s.id].status = 'H';
      }
    });
    renderGrid();
  });

  saveBtn?.addEventListener('click', () => {
    const date = dateInput.value;

    // Validasi: pastikan semua sudah diabsen
    const unrecorded = currentStudents.filter(s => currentRecords[s.id].status === '');
    if (unrecorded.length > 0) {
      showToast('Masih ada ' + unrecorded.length + ' siswa yang belum diabsen (kotak abu-abu).', 'warning');
      return;
    }

    // Buat format untuk disave
    const recordsToSave = currentStudents.map(s => ({
      studentId: s.id,
      date: date,
      status: currentRecords[s.id].status,
      notes: currentRecords[s.id].notes
    }));

    DataStore.saveStudentAttendance(recordsToSave);
    showToast('Presensi kelas berhasil disimpan!', 'success');
  });
}
