// Backup & Restore page
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';

export function renderBackup() {
    const school = DataStore.getSchool();
    const stats = {
        semesters: DataStore.getSemesters().length,
        subjects: DataStore.getSubjects().length,
        classes: DataStore.getClasses().length,
        teachers: DataStore.getTeachers().length,
        schedules: DataStore.getSchedules().length,
    };

    return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">💾</span> Backup & Restore</h2>
          <p class="page-subtitle">Simpan dan pulihkan seluruh data aplikasi</p>
        </div>
      </div>

      <div class="backup-grid">
        <!-- Backup Section -->
        <div class="card backup-card">
          <div class="backup-card-icon">📤</div>
          <h3 class="backup-card-title">Backup Data</h3>
          <p class="backup-card-desc">
            Ekspor seluruh data ke file JSON. Simpan file ini sebagai cadangan.
          </p>
          <div class="backup-stats">
            <div class="backup-stat-row"><span>Sekolah</span><strong>${school.name || '-'}</strong></div>
            <div class="backup-stat-row"><span>Semester</span><strong>${stats.semesters}</strong></div>
            <div class="backup-stat-row"><span>Mata Pelajaran</span><strong>${stats.subjects}</strong></div>
            <div class="backup-stat-row"><span>Kelas</span><strong>${stats.classes}</strong></div>
            <div class="backup-stat-row"><span>Guru</span><strong>${stats.teachers}</strong></div>
            <div class="backup-stat-row"><span>Jadwal</span><strong>${stats.schedules}</strong></div>
          </div>
          <button class="btn btn-primary backup-btn" id="backupBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Backup
          </button>
        </div>

        <!-- Restore Section -->
        <div class="card backup-card">
          <div class="backup-card-icon">📥</div>
          <h3 class="backup-card-title">Restore Data</h3>
          <p class="backup-card-desc">
            Pulihkan data dari file backup JSON. <strong>Data saat ini akan diganti sepenuhnya.</strong>
          </p>
          <div class="restore-drop-zone" id="restoreDropZone">
            <div class="drop-zone-icon">📂</div>
            <p>Seret file backup ke sini<br>atau klik untuk memilih file</p>
            <input type="file" id="restoreFileInput" accept=".json" style="display:none;">
          </div>
          <div class="restore-preview hidden" id="restorePreview">
            <div class="restore-file-info" id="restoreFileInfo"></div>
            <div class="restore-actions">
              <button class="btn btn-danger" id="confirmRestoreBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Restore Sekarang
              </button>
              <button class="btn btn-secondary" id="cancelRestoreBtn">Batal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initBackup(refreshPage) {
    let pendingData = null;

    // --- Backup ---
    document.getElementById('backupBtn')?.addEventListener('click', () => {
        try {
            const json = DataStore.exportData();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const school = DataStore.getSchool();
            const date = new Date().toISOString().slice(0, 10);
            const schoolSlug = (school.name || 'sekolah').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            a.href = url;
            a.download = `backup_${schoolSlug}_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup berhasil didownload!', 'success');
        } catch (err) {
            showToast('Gagal membuat backup: ' + err.message, 'error');
        }
    });

    // --- Restore ---
    const dropZone = document.getElementById('restoreDropZone');
    const fileInput = document.getElementById('restoreFileInput');
    const preview = document.getElementById('restorePreview');
    const fileInfo = document.getElementById('restoreFileInfo');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-active');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-active');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) handleFile(file);
        });
    }

    function handleFile(file) {
        if (!file.name.endsWith('.json')) {
            showToast('File harus berformat .json', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                pendingData = e.target.result;

                // Show preview
                const meta = parsed._meta || {};
                const exportDate = meta.exportedAt
                    ? new Date(meta.exportedAt).toLocaleString('id-ID')
                    : 'Tidak diketahui';
                const schoolName = parsed.school?.name || '-';
                const semCount = (parsed.semesters || []).length;
                const teacherCount = (parsed.teachers || []).length;
                const subjectCount = (parsed.subjects || []).length;
                const classCount = (parsed.classes || []).length;
                const scheduleCount = (parsed.schedules || []).length;

                fileInfo.innerHTML = `
          <div class="restore-info-grid">
            <div class="backup-stat-row"><span>📄 File</span><strong>${file.name}</strong></div>
            <div class="backup-stat-row"><span>📅 Tanggal Backup</span><strong>${exportDate}</strong></div>
            <div class="backup-stat-row"><span>🏫 Sekolah</span><strong>${schoolName}</strong></div>
            <div class="backup-stat-row"><span>📚 Semester</span><strong>${semCount}</strong></div>
            <div class="backup-stat-row"><span>👨‍🏫 Guru</span><strong>${teacherCount}</strong></div>
            <div class="backup-stat-row"><span>📖 Mapel</span><strong>${subjectCount}</strong></div>
            <div class="backup-stat-row"><span>🏛 Kelas</span><strong>${classCount}</strong></div>
            <div class="backup-stat-row"><span>📋 Jadwal</span><strong>${scheduleCount}</strong></div>
          </div>
          <div class="restore-warning">
            ⚠️ Data saat ini akan diganti sepenuhnya. Pastikan Anda sudah membuat backup terlebih dahulu.
          </div>
        `;

                dropZone.classList.add('hidden');
                preview.classList.remove('hidden');
            } catch (err) {
                showToast('File tidak valid: ' + err.message, 'error');
                pendingData = null;
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('cancelRestoreBtn')?.addEventListener('click', () => {
        pendingData = null;
        dropZone.classList.remove('hidden');
        preview.classList.add('hidden');
        fileInput.value = '';
    });

    document.getElementById('confirmRestoreBtn')?.addEventListener('click', () => {
        if (!pendingData) return;

        try {
            const result = DataStore.importData(pendingData);
            showToast(`Data berhasil dipulihkan! (${result.teachers} guru, ${result.subjects} mapel, ${result.schedules} jadwal)`, 'success');
            pendingData = null;

            // Refresh the entire app
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        } catch (err) {
            showToast('Gagal memulihkan data: ' + err.message, 'error');
        }
    });
}
