// Classes management page
import DataStore from '../dataStore.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderClasses() {
    const classes = DataStore.getClasses();

    const rows = classes.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.level || '-'}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-sm edit-class-btn" data-id="${c.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-sm delete-class-btn" data-id="${c.id}" title="Hapus">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

    return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">🏫</span> Kelas</h2>
          <p class="page-subtitle">Kelola daftar kelas di sekolah</p>
        </div>
        <button class="btn btn-primary" id="addClassBtn">+ Tambah Kelas</button>
      </div>

      <div class="card">
        ${classes.length > 0 ? `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Kelas</th>
                  <th>Tingkat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">🏫</div>
            <p>Belum ada kelas. Klik "Tambah Kelas" untuk memulai.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function classFormHTML(data = {}) {
    return `
    <form id="classForm">
      <div class="form-group">
        <label for="className">Nama Kelas</label>
        <input type="text" class="form-control" id="className" placeholder="Contoh: VII-A" value="${data.name || ''}" required />
      </div>
      <div class="form-group">
        <label for="classLevel">Tingkat</label>
        <input type="text" class="form-control" id="classLevel" placeholder="Contoh: VII, VIII, IX" value="${data.level || ''}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelClassBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initClasses(refreshPage) {
    document.getElementById('addClassBtn')?.addEventListener('click', () => {
        const { modal, closeModal: close } = openModal('Tambah Kelas', classFormHTML());
        modal.querySelector('#cancelClassBtn').addEventListener('click', close);
        modal.querySelector('#classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = modal.querySelector('#className').value.trim();
            const level = modal.querySelector('#classLevel').value.trim();
            if (!name) return;
            DataStore.addClass({ name, level });
            close();
            showToast('Kelas berhasil ditambahkan!', 'success');
            refreshPage();
        });
    });

    document.querySelectorAll('.edit-class-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const cls = DataStore.getClasses().find(c => c.id === id);
            if (!cls) return;
            const { modal, closeModal: close } = openModal('Edit Kelas', classFormHTML(cls));
            modal.querySelector('#cancelClassBtn').addEventListener('click', close);
            modal.querySelector('#classForm').addEventListener('submit', (e) => {
                e.preventDefault();
                DataStore.updateClass(id, {
                    name: modal.querySelector('#className').value.trim(),
                    level: modal.querySelector('#classLevel').value.trim()
                });
                close();
                showToast('Kelas berhasil diperbarui!', 'success');
                refreshPage();
            });
        });
    });

    document.querySelectorAll('.delete-class-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Hapus kelas ini? Jadwal kelas ini juga akan terhapus.')) {
                DataStore.deleteClass(btn.dataset.id);
                showToast('Kelas berhasil dihapus!', 'success');
                refreshPage();
            }
        });
    });
}
