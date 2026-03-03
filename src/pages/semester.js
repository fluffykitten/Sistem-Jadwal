// Semester management page
import DataStore from '../dataStore.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderSemester() {
    const semesters = DataStore.getSemesters();
    const activeId = DataStore.getActiveSemesterId();

    const rows = semesters.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.year}</td>
      <td>${s.semester}</td>
      <td>
        ${s.id === activeId
            ? '<span class="badge badge-active">Aktif</span>'
            : `<button class="btn btn-success btn-sm set-active-btn" data-id="${s.id}">Set Aktif</button>`
        }
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-sm edit-semester-btn" data-id="${s.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-sm delete-semester-btn" data-id="${s.id}" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

    return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">📅</span> Semester & Tahun Pelajaran</h2>
          <p class="page-subtitle">Kelola semester dan tahun pelajaran sekolah</p>
        </div>
        <button class="btn btn-primary" id="addSemesterBtn">+ Tambah Semester</button>
      </div>

      <div class="card">
        ${semesters.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tahun Pelajaran</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <p>Belum ada semester. Klik "Tambah Semester" untuk memulai.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function semesterFormHTML(data = {}) {
    return `
    <form id="semesterForm">
      <div class="form-group">
        <label for="semName">Nama Semester</label>
        <input type="text" class="form-control" id="semName" placeholder="Contoh: Ganjil 2025/2026" value="${data.name || ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="semYear">Tahun Pelajaran</label>
          <input type="text" class="form-control" id="semYear" placeholder="2025/2026" value="${data.year || ''}" required />
        </div>
        <div class="form-group">
          <label for="semType">Semester</label>
          <select class="form-control" id="semType" required>
            <option value="Ganjil" ${data.semester === 'Ganjil' ? 'selected' : ''}>Ganjil</option>
            <option value="Genap" ${data.semester === 'Genap' ? 'selected' : ''}>Genap</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelSemBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initSemester(refreshPage) {
    // Add
    document.getElementById('addSemesterBtn')?.addEventListener('click', () => {
        const { modal, closeModal: close } = openModal('Tambah Semester', semesterFormHTML());
        modal.querySelector('#cancelSemBtn').addEventListener('click', close);
        modal.querySelector('#semesterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = modal.querySelector('#semName').value.trim();
            const year = modal.querySelector('#semYear').value.trim();
            const semester = modal.querySelector('#semType').value;
            if (!name || !year) return;
            DataStore.addSemester({ name, year, semester });
            close();
            showToast('Semester berhasil ditambahkan!', 'success');
            refreshPage();
        });
    });

    // Set active
    document.querySelectorAll('.set-active-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            DataStore.setActiveSemester(btn.dataset.id);
            showToast('Semester aktif berhasil diubah!', 'success');
            refreshPage();
        });
    });

    // Edit
    document.querySelectorAll('.edit-semester-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const semester = DataStore.getSemesters().find(s => s.id === id);
            if (!semester) return;
            const { modal, closeModal: close } = openModal('Edit Semester', semesterFormHTML(semester));
            modal.querySelector('#cancelSemBtn').addEventListener('click', close);
            modal.querySelector('#semesterForm').addEventListener('submit', (e) => {
                e.preventDefault();
                DataStore.updateSemester(id, {
                    name: modal.querySelector('#semName').value.trim(),
                    year: modal.querySelector('#semYear').value.trim(),
                    semester: modal.querySelector('#semType').value
                });
                close();
                showToast('Semester berhasil diperbarui!', 'success');
                refreshPage();
            });
        });
    });

    // Delete
    document.querySelectorAll('.delete-semester-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Hapus semester ini? Data jadwal semester ini juga akan terhapus.')) {
                DataStore.deleteSemester(btn.dataset.id);
                showToast('Semester berhasil dihapus!', 'success');
                refreshPage();
            }
        });
    });
}
