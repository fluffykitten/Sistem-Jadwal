// Teachers management page
import DataStore from '../dataStore.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { downloadTeacherTemplate, importTeachersFromExcel } from '../utils/excelImport.js';

export function renderTeachers() {
  const teachers = DataStore.getTeachers();
  const subjects = DataStore.getSubjects();

  const rows = teachers.map(t => {
    const subjBadges = (t.subjectIds || []).map(sid => {
      const s = subjects.find(x => x.id === sid);
      return s ? `<span class="badge badge-subject">${s.code}</span>` : '';
    }).filter(Boolean).join(' ');

    return `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td>${t.nip || '-'}</td>
        <td>${subjBadges || '<span style="color: var(--text-tertiary); font-size: 0.8rem;">Belum ada</span>'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon btn-sm edit-teacher-btn" data-id="${t.id}" title="Edit">✏️</button>
            <button class="btn btn-icon btn-sm delete-teacher-btn" data-id="${t.id}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">👨‍🏫</span> Data Guru</h2>
          <p class="page-subtitle">Kelola data guru dan mata pelajaran yang diampu</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="importTeacherBtn">📥 Import Excel</button>
          <button class="btn btn-primary" id="addTeacherBtn">+ Tambah Guru</button>
        </div>
      </div>

      <div class="card">
        ${teachers.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Guru</th>
                  <th>NIP</th>
                  <th>Mata Pelajaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">👨‍🏫</div>
            <p>Belum ada guru. Klik "Tambah Guru" untuk memulai.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function teacherFormHTML(data = {}, subjects = []) {
  const checkboxes = subjects.map(s => `
    <label class="checkbox-item">
      <input type="checkbox" name="subjectIds" value="${s.id}" ${(data.subjectIds || []).includes(s.id) ? 'checked' : ''} />
      ${s.name} (${s.code})
    </label>
  `).join('');

  return `
    <form id="teacherForm">
      <div class="form-group">
        <label for="teacherName">Nama Guru</label>
        <input type="text" class="form-control" id="teacherName" placeholder="Nama lengkap guru" value="${data.name || ''}" required />
      </div>
      <div class="form-group">
        <label for="teacherNip">NIP (opsional)</label>
        <input type="text" class="form-control" id="teacherNip" placeholder="Nomor Induk Pegawai" value="${data.nip || ''}" />
      </div>
      <div class="form-group">
        <label>Mata Pelajaran yang Diampu</label>
        ${subjects.length > 0
      ? `<div class="checkbox-group">${checkboxes}</div>`
      : `<p style="font-size: 0.8rem; color: var(--text-tertiary);">Belum ada mata pelajaran. Tambahkan di menu Mata Pelajaran.</p>`
    }
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelTeacherBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initTeachers(refreshPage) {
  const subjects = DataStore.getSubjects();

  document.getElementById('addTeacherBtn')?.addEventListener('click', () => {
    const { modal, closeModal: close } = openModal('Tambah Guru', teacherFormHTML({}, subjects));
    modal.querySelector('#cancelTeacherBtn').addEventListener('click', close);
    modal.querySelector('#teacherForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#teacherName').value.trim();
      const nip = modal.querySelector('#teacherNip').value.trim();
      const subjectIds = [...modal.querySelectorAll('input[name="subjectIds"]:checked')].map(cb => cb.value);
      if (!name) return;
      DataStore.addTeacher({ name, nip, subjectIds });
      close();
      showToast('Guru berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });

  document.querySelectorAll('.edit-teacher-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const teacher = DataStore.getTeachers().find(t => t.id === id);
      if (!teacher) return;
      const { modal, closeModal: close } = openModal('Edit Guru', teacherFormHTML(teacher, subjects));
      modal.querySelector('#cancelTeacherBtn').addEventListener('click', close);
      modal.querySelector('#teacherForm').addEventListener('submit', (e) => {
        e.preventDefault();
        DataStore.updateTeacher(id, {
          name: modal.querySelector('#teacherName').value.trim(),
          nip: modal.querySelector('#teacherNip').value.trim(),
          subjectIds: [...modal.querySelectorAll('input[name="subjectIds"]:checked')].map(cb => cb.value)
        });
        close();
        showToast('Data guru berhasil diperbarui!', 'success');
        refreshPage();
      });
    });
  });

  document.querySelectorAll('.delete-teacher-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Hapus data guru ini? Jadwal guru ini juga akan terhapus.')) {
        DataStore.deleteTeacher(btn.dataset.id);
        showToast('Guru berhasil dihapus!', 'success');
        refreshPage();
      }
    });
  });

  // Import Excel logic
  document.getElementById('importTeacherBtn')?.addEventListener('click', () => {
    const modalHtml = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                    Tambahkan data guru secara massal menggunakan file Excel. Pastikan format file sesuai dengan template.
                </p>
                <button class="btn btn-secondary" id="downloadTeacherTplBtn" style="width: fit-content;">📥 Unduh Template</button>
                <div class="form-group" style="margin-top: 8px;">
                    <label>Unggah File (.xlsx)</label>
                    <input type="file" id="teacherExcelFile" accept=".xlsx" class="form-control" />
                </div>
                <div id="importTeacherStatus" style="font-size: 0.85rem; padding: 8px; border-radius: 4px; display: none;"></div>
                <div class="form-actions" style="margin-top: 8px;">
                    <button class="btn btn-primary" id="processImportTeacherBtn" style="width: 100%;">Proses Import</button>
                </div>
            </div>
        `;

    const { modal, closeModal: close } = openModal('Import Data Guru', modalHtml);

    modal.querySelector('#downloadTeacherTplBtn').addEventListener('click', () => {
      downloadTeacherTemplate();
      showToast('Template berhasil diunduh', 'info');
    });

    modal.querySelector('#processImportTeacherBtn').addEventListener('click', async () => {
      const fileInput = modal.querySelector('#teacherExcelFile');
      if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Pilih file Excel terlebih dahulu', 'warning');
        return;
      }

      const file = fileInput.files[0];
      const statusDiv = modal.querySelector('#importTeacherStatus');
      statusDiv.style.display = 'block';
      statusDiv.style.background = 'var(--bg-tertiary)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = '🕒 Memproses file...';

      try {
        const buffer = await file.arrayBuffer();
        const result = await importTeachersFromExcel(buffer);

        if (result.success) {
          let msg = `✅ Berhasil mengimpor ${result.count} data guru.`;
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
            showToast(`${result.count} Guru berhasil ditambahkan!`, 'success');
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
