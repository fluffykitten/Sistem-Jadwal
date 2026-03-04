import DataStore from '../dataStore.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { downloadStudentTemplate, importStudentsFromExcel } from '../utils/excelImport.js';

export function renderStudents() {
  const students = DataStore.getStudents();
  const classes = DataStore.getClasses();

  // Create class map
  const classMap = {};
  classes.forEach(c => classMap[c.id] = c.name);

  // Filter UI
  const filterOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const rows = students.map(s => {
    return `
      <tr data-class-id="${s.classId || ''}" class="student-row">
        <td><strong>${s.name}</strong></td>
        <td>${s.nisn || '-'}</td>
        <td>${s.gender === 'P' ? 'Perempuan' : (s.gender === 'L' ? 'Laki-laki' : '-')}</td>
        <td><span class="badge badge-class">${classMap[s.classId] || 'Tanpa Kelas'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon btn-sm edit-student-btn" data-id="${s.id}" title="Edit">✏️</button>
            <button class="btn btn-icon btn-sm delete-student-btn" data-id="${s.id}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">👦👧</span> Data Siswa</h2>
          <p class="page-subtitle">Kelola master data siswa dan penempatan kelas</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-danger" id="resetStudentBtn" title="Hapus semua siswa (Tahun Ajaran Baru)">⚠️ Kosongkan Data</button>
          <button class="btn btn-secondary" id="importStudentBtn">📥 Import Excel</button>
          <button class="btn btn-primary" id="addStudentBtn">+ Tambah Siswa</button>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar" style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-secondary);">Pilih Kelas:</label>
          <select id="studentClassFilter" class="form-control" style="width: 250px;">
            <option value="all">Semua Kelas</option>
            ${filterOptions}
          </select>
        </div>

        ${students.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>NISN</th>
                  <th>L/P</th>
                  <th>Kelas</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <p>Belum ada data siswa. Klik "Tambah Siswa" atau "Import Excel" untuk memulai.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function studentFormHTML(data = {}, classes = []) {
  const classOptions = classes.map(c => `
    <option value="${c.id}" ${(data.classId === c.id) ? 'selected' : ''}>${c.name}</option>
  `).join('');

  return `
    <form id="studentForm">
      <div class="form-group">
        <label for="studentName">Nama Lengkap Siswa</label>
        <input type="text" class="form-control" id="studentName" placeholder="Nama lengkap siswa" value="${data.name || ''}" required />
      </div>
      <div class="form-group">
        <label for="studentNisn">NISN</label>
        <input type="text" class="form-control" id="studentNisn" placeholder="Nomor Induk Siswa Nasional" value="${data.nisn || ''}" required />
      </div>
      <div class="form-group">
        <label for="studentGender">Jenis Kelamin</label>
        <select class="form-control" id="studentGender" required>
          <option value="">-- Pilih L/P --</option>
          <option value="L" ${(data.gender === 'L') ? 'selected' : ''}>Laki-laki</option>
          <option value="P" ${(data.gender === 'P') ? 'selected' : ''}>Perempuan</option>
        </select>
      </div>
      <div class="form-group">
        <label for="studentClass">Kelas</label>
        <select class="form-control" id="studentClass" required>
          <option value="">-- Pilih Kelas --</option>
          ${classOptions}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelStudentBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initStudents(refreshPage) {
  const classes = DataStore.getClasses();

  // Filter Handler
  const filterSelect = document.getElementById('studentClassFilter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      document.querySelectorAll('.student-row').forEach(row => {
        if (selectedId === 'all') {
          row.style.display = 'table-row';
        } else {
          row.style.display = row.dataset.classId === selectedId ? 'table-row' : 'none';
        }
      });
    });
  }

  // Add Button
  document.getElementById('addStudentBtn')?.addEventListener('click', () => {
    if (classes.length === 0) {
      showToast('Harap buat Kelas terlebih dahulu di menu Kelas!', 'warning');
      return;
    }

    const { modal, closeModal: close } = openModal('Tambah Siswa', studentFormHTML({}, classes));
    modal.querySelector('#cancelStudentBtn').addEventListener('click', close);
    modal.querySelector('#studentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#studentName').value.trim();
      const nisn = modal.querySelector('#studentNisn').value.trim();
      const gender = modal.querySelector('#studentGender').value;
      const classId = modal.querySelector('#studentClass').value;
      if (!name || !nisn || !classId || !gender) return;
      DataStore.addStudent({ name, nisn, gender, classId });
      close();
      showToast('Siswa berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });

  // Edit Button
  document.querySelectorAll('.edit-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const student = DataStore.getStudents().find(s => s.id === id);
      if (!student) return;
      const { modal, closeModal: close } = openModal('Edit Siswa', studentFormHTML(student, classes));
      modal.querySelector('#cancelStudentBtn').addEventListener('click', close);
      modal.querySelector('#studentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        DataStore.updateStudent(id, {
          name: modal.querySelector('#studentName').value.trim(),
          nisn: modal.querySelector('#studentNisn').value.trim(),
          gender: modal.querySelector('#studentGender').value,
          classId: modal.querySelector('#studentClass').value
        });
        close();
        showToast('Data siswa berhasil diperbarui!', 'success');
        refreshPage();
      });
    });
  });

  // Delete Button
  document.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Hapus data siswa ini? Semua data presensi atas nama siswa ini juga akan terhapus.')) {
        DataStore.deleteStudent(btn.dataset.id);
        showToast('Siswa berhasil dihapus!', 'success');
        refreshPage();
      }
    });
  });

  // Reset / Kosongkan Data Button
  document.getElementById('resetStudentBtn')?.addEventListener('click', () => {
    const confirmMsg = "⚠️ PERINGATAN BAHAYA ⚠️\\n\\nAnda yakin ingin MENGHAPUS SELURUH DATA SISWA beserta riwayat presensinya? Fitur ini idealnya hanya dipakai saat RESET TAHUN AJARAN BARU.\\n\\nKetik 'RESET' untuk melanjutkan:";
    const promptInput = prompt(confirmMsg);

    if (promptInput === 'RESET') {
      DataStore.clearStudents();
      showToast('Seluruh data siswa & presensi telah dikosongkan.', 'success');
      refreshPage();
    } else if (promptInput !== null) {
      showToast('Aksi dibatalkan karena kata kunci tidak sesuai.', 'info');
    }
  });

  // Import Excel
  document.getElementById('importStudentBtn')?.addEventListener('click', () => {
    const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <p style="font-size: 0.9rem; color: var(--text-secondary);">
                Tambahkan data siswa secara massal menggunakan file Excel. Pastikan Anda sudah membuat Data Kelas sebelumnya karena kolom Kelas di Excel harus sesuai dengan nama kelas yang ada di sistem.
            </p>
            <button class="btn btn-secondary" id="downloadStudentTplBtn" style="width: fit-content;">📥 Unduh Template Siswa</button>
            <div class="form-group" style="margin-top: 8px;">
                <label>Unggah File (.xlsx)</label>
                <input type="file" id="studentExcelFile" accept=".xlsx" class="form-control" />
            </div>
            <div id="importStudentStatus" style="font-size: 0.85rem; padding: 10px; border-radius: 4px; display: none; max-height: 200px; overflow-y: auto;"></div>
            <div class="form-actions" style="margin-top: 8px;">
                <button class="btn btn-primary" id="processImportStudentBtn" style="width: 100%;">Proses Import</button>
            </div>
        </div>
    `;

    const { modal, closeModal: close } = openModal('Import Data Siswa', modalHtml);

    modal.querySelector('#downloadStudentTplBtn').addEventListener('click', () => {
      downloadStudentTemplate();
      showToast('Template berhasil diunduh', 'info');
    });

    modal.querySelector('#processImportStudentBtn').addEventListener('click', async () => {
      const fileInput = modal.querySelector('#studentExcelFile');
      if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Pilih file Excel terlebih dahulu', 'warning');
        return;
      }

      const file = fileInput.files[0];
      const statusDiv = modal.querySelector('#importStudentStatus');
      statusDiv.style.display = 'block';
      statusDiv.style.background = 'var(--bg-tertiary)';
      statusDiv.style.color = 'var(--text-primary)';
      statusDiv.innerHTML = '🕒 Memproses file...';

      try {
        const buffer = await file.arrayBuffer();
        const result = await importStudentsFromExcel(buffer);

        if (result.success) {
          let msg = `✅ Berhasil mengimpor ${result.count} data siswa.`;
          if (result.errors && result.errors.length > 0) {
            msg += `<br><br><b>Perhatian:</b><br><ul style="padding-left:16px;margin:4px 0; color: #ef4444;">${result.errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
            statusDiv.style.background = 'rgba(234, 179, 8, 0.1)';
            statusDiv.style.color = 'inherit';
          } else {
            statusDiv.style.background = 'rgba(34, 197, 94, 0.1)';
            statusDiv.style.color = '#22c55e';
          }
          statusDiv.innerHTML = msg;

          if (result.count > 0) {
            showToast(`${result.count} Siswa berhasil ditambahkan!`, 'success');
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
