// Subjects management page
import DataStore from '../dataStore.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { downloadSubjectTemplate, importSubjectsFromExcel } from '../utils/excelImport.js';

const SUBJECT_TYPES = [
  { value: 'pelajaran', label: 'Pelajaran', color: 'subject' },
  { value: 'ekskul', label: 'Ekskul', color: 'ekskul' },
  { value: 'keagamaan', label: 'Keagamaan', color: 'keagamaan' },
  { value: 'upacara', label: 'Upacara/Kegiatan', color: 'upacara' },
];

function getTypeLabel(type) {
  return SUBJECT_TYPES.find(t => t.value === type)?.label || 'Pelajaran';
}

function getTypeBadgeClass(type) {
  return SUBJECT_TYPES.find(t => t.value === type)?.color || 'subject';
}

export function renderSubjects() {
  const subjects = DataStore.getSubjects();

  const rows = subjects.map(s => `
    <tr>
      <td><span class="badge badge-subject">${s.code}</span></td>
      <td>${s.name}</td>
      <td><span class="badge badge-type-${getTypeBadgeClass(s.type)}">${getTypeLabel(s.type)}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-sm edit-subj-btn" data-id="${s.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-sm delete-subj-btn" data-id="${s.id}" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📚</span> Mata Pelajaran</h2>
          <p class="page-subtitle">Kelola daftar mata pelajaran sekolah</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="importSubjectBtn">📥 Import Excel</button>
          <button class="btn btn-primary" id="addSubjectBtn">+ Tambah Mapel</button>
        </div>
      </div>

      <div class="card">
        ${subjects.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Mata Pelajaran</th>
                  <th>Tipe</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <p>Belum ada mata pelajaran. Klik "Tambah Mapel" untuk memulai.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function subjectFormHTML(data = {}) {
  const typeOptions = SUBJECT_TYPES.map(t =>
    `<option value="${t.value}" ${(data.type || 'pelajaran') === t.value ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  return `
    <form id="subjectForm">
      <div class="form-group">
        <label for="subjName">Nama Mata Pelajaran / Kegiatan</label>
        <input type="text" class="form-control" id="subjName" placeholder="Contoh: Matematika" value="${data.name || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="subjCode">Kode Singkat</label>
          <input type="text" class="form-control" id="subjCode" placeholder="Contoh: MTK" value="${data.code || ''}" required />
        </div>
        <div class="form-group">
          <label for="subjType">Tipe</label>
          <select class="form-control" id="subjType">${typeOptions}</select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelSubjBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initSubjects(refreshPage) {
  document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
    const { modal, closeModal: close } = openModal('Tambah Mata Pelajaran', subjectFormHTML());
    modal.querySelector('#cancelSubjBtn').addEventListener('click', close);
    modal.querySelector('#subjectForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#subjName').value.trim();
      const code = modal.querySelector('#subjCode').value.trim().toUpperCase();
      const type = modal.querySelector('#subjType').value;
      if (!name || !code) return;
      DataStore.addSubject({ name, code, type });
      close();
      showToast('Mata pelajaran berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });

  document.querySelectorAll('.edit-subj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const subj = DataStore.getSubjects().find(s => s.id === id);
      if (!subj) return;
      const { modal, closeModal: close } = openModal('Edit Mata Pelajaran', subjectFormHTML(subj));
      modal.querySelector('#cancelSubjBtn').addEventListener('click', close);
      modal.querySelector('#subjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        DataStore.updateSubject(id, {
          name: modal.querySelector('#subjName').value.trim(),
          code: modal.querySelector('#subjCode').value.trim().toUpperCase(),
          type: modal.querySelector('#subjType').value
        });
        close();
        showToast('Mata pelajaran berhasil diperbarui!', 'success');
        refreshPage();
      });
    });
  });

  document.querySelectorAll('.delete-subj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Hapus mata pelajaran ini?')) {
        DataStore.deleteSubject(btn.dataset.id);
        showToast('Mata pelajaran berhasil dihapus!', 'success');
        refreshPage();
      }
    });
  });

  // Import Excel logic
  document.getElementById('importSubjectBtn')?.addEventListener('click', () => {
    const modalHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <p style="font-size: 0.9rem; color: var(--text-secondary);">
          Tambahkan data mata pelajaran secara massal menggunakan file Excel.
        </p>
        <button class="btn btn-secondary" id="downloadSubjTplBtn" style="width: fit-content;">📥 Unduh Template</button>
        <div class="form-group" style="margin-top: 8px;">
          <label>Unggah File (.xlsx)</label>
          <input type="file" id="subjExcelFile" accept=".xlsx" class="form-control" />
        </div>
        <div id="importSubjStatus" style="font-size: 0.85rem; padding: 8px; border-radius: 4px; display: none;"></div>
        <div class="form-actions" style="margin-top: 8px;">
          <button class="btn btn-primary" id="processImportSubjBtn" style="width: 100%;">Proses Import</button>
        </div>
      </div>
    `;

    const { modal, closeModal: close } = openModal('Import Mata Pelajaran', modalHtml);

    modal.querySelector('#downloadSubjTplBtn').addEventListener('click', () => {
      downloadSubjectTemplate();
      showToast('Template berhasil diunduh', 'info');
    });

    modal.querySelector('#processImportSubjBtn').addEventListener('click', async () => {
      const fileInput = modal.querySelector('#subjExcelFile');
      if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Pilih file Excel terlebih dahulu', 'warning');
        return;
      }

      const file = fileInput.files[0];
      const statusDiv = modal.querySelector('#importSubjStatus');
      statusDiv.style.display = 'block';
      statusDiv.style.background = 'var(--bg-tertiary)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = '🕒 Memproses file...';

      try {
        const buffer = await file.arrayBuffer();
        const result = await importSubjectsFromExcel(buffer);

        if (result.success) {
          let msg = `✅ Berhasil mengimpor ${result.count} mata pelajaran.`;
          if (result.errors && result.errors.length > 0) {
            msg += `<br><br><b>Perhatian:</b><br><ul style="padding-left:16px;margin:4px 0;">${result.errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
            statusDiv.style.background = 'rgba(234, 179, 8, 0.1)';
            statusDiv.style.color = '#ca8a04';
          } else {
            statusDiv.style.background = 'rgba(34, 197, 94, 0.1)';
            statusDiv.style.color = '#22c55e';
          }
          statusDiv.innerHTML = msg;

          if (result.count > 0) {
            showToast(`${result.count} Mapel berhasil ditambahkan!`, 'success');
            refreshPage();
          }
        } else {
          statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
          statusDiv.style.color = '#ef4444';
          statusDiv.innerHTML = `❌ Gagal memproses file: ${result.error}`;
        }
      } catch (err) {
        statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.color = '#ef4444';
        statusDiv.innerHTML = `❌ Gagal: ${err.message}`;
      }
    });
  });
}
