// KBM Profiles management page
import DataStore from '../dataStore.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

let selectedProfileId = null;

export function renderKbm() {
  const profiles = DataStore.getKbmProfiles();

  if (!selectedProfileId && profiles.length > 0) {
    selectedProfileId = profiles[0].id;
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  // Profile cards
  const profileCards = profiles.map(p => {
    const isActive = p.id === selectedProfileId;
    const dayLabels = (p.days || []).join(', ') || 'Belum diatur';
    return `
      <div class="kbm-profile-card ${isActive ? 'active' : ''}" data-profile-id="${p.id}">
        <div class="profile-card-header">
          <strong>${p.name}</strong>
          <div class="table-actions">
            <button class="btn btn-icon btn-sm edit-profile-btn" data-id="${p.id}" title="Edit Profil">✏️</button>
            <button class="btn btn-icon btn-sm delete-profile-btn" data-id="${p.id}" title="Hapus Profil">🗑️</button>
          </div>
        </div>
        <div class="profile-card-days">${dayLabels}</div>
      </div>
    `;
  }).join('');

  // Slot table for selected profile
  let slotTable = '';
  if (selectedProfile) {
    const sortedSlots = [...(selectedProfile.slots || [])].sort((a, b) => a.order - b.order);
    const rows = sortedSlots.map(s => `
      <tr>
        <td>${s.order}</td>
        <td>
          ${s.isBreak
        ? `<span style="color: var(--accent-warning); font-weight: 600;">☕ ${s.label || 'Istirahat'}</span>`
        : `<strong>${s.label || 'Jam ke-' + s.order}</strong>`
      }
        </td>
        <td>${s.startTime || '-'}</td>
        <td>${s.endTime || '-'}</td>
        <td>
          ${s.isBreak
        ? '<span class="badge" style="background: rgba(255,179,71,0.12); color: var(--accent-warning); border: 1px solid rgba(255,179,71,0.2);">Istirahat</span>'
        : '<span class="badge badge-active">KBM</span>'
      }
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon btn-sm edit-slot-btn" data-slot-id="${s.id}" title="Edit">✏️</button>
            <button class="btn btn-icon btn-sm delete-slot-btn" data-slot-id="${s.id}" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    slotTable = sortedSlots.length > 0 ? `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Label</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Tipe</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : `
      <div class="empty-state" style="padding: 30px;">
        <div class="empty-icon">⏰</div>
        <p>Belum ada jam di profil ini. Klik "+ Tambah Jam" untuk menambahkan.</p>
      </div>
    `;
  }

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">⏰</span> Profil Jam Pelajaran / KBM</h2>
          <p class="page-subtitle">Buat profil jam pelajaran dan tentukan berlaku di hari apa saja</p>
        </div>
        <button class="btn btn-primary" id="addProfileBtn">+ Tambah Profil</button>
      </div>

      ${profiles.length === 0 ? `
        <div class="card">
          <div class="empty-state">
            <div class="empty-icon">⏰</div>
            <p>Belum ada profil jam pelajaran.<br>Buat profil baru, misalnya "Senin-Kamis" dan "Jumat" jika jam pelajarannya berbeda.</p>
          </div>
        </div>
      ` : `
        <div class="kbm-profiles-grid">
          ${profileCards}
        </div>

        ${selectedProfile ? `
          <div class="card" style="margin-top: 20px;">
            <div class="card-header">
              <span class="card-title">📋 Jam Pelajaran — ${selectedProfile.name}</span>
              <button class="btn btn-primary btn-sm" id="addSlotBtn">+ Tambah Jam</button>
            </div>
            ${slotTable}
          </div>
        ` : ''}
      `}
    </div>
  `;
}

function profileFormHTML(data = {}) {
  const dayChecks = ALL_DAYS.map(d => `
    <label class="checkbox-item">
      <input type="checkbox" name="profileDays" value="${d}" ${(data.days || []).includes(d) ? 'checked' : ''} />
      ${d}
    </label>
  `).join('');

  return `
    <form id="profileForm">
      <div class="form-group">
        <label for="profileName">Nama Profil</label>
        <input type="text" class="form-control" id="profileName" placeholder="Contoh: Senin-Kamis, Jumat" value="${data.name || ''}" required />
      </div>
      <div class="form-group">
        <label>Berlaku di Hari</label>
        <div class="checkbox-group" style="max-height: unset;">
          ${dayChecks}
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelProfileBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

function slotFormHTML(data = {}, profileId) {
  const profile = DataStore.getKbmProfiles().find(p => p.id === profileId);
  const nextOrder = data.order || ((profile?.slots?.length || 0) + 1);
  return `
    <form id="slotForm">
      <div class="form-row">
        <div class="form-group">
          <label for="slotOrder">Urutan</label>
          <input type="number" class="form-control" id="slotOrder" min="1" value="${nextOrder}" required />
        </div>
        <div class="form-group">
          <label for="slotLabel">Label</label>
          <input type="text" class="form-control" id="slotLabel" placeholder="Contoh: Jam ke-1" value="${data.label || ''}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="slotStart">Waktu Mulai</label>
          <input type="time" class="form-control" id="slotStart" value="${data.startTime || ''}" required />
        </div>
        <div class="form-group">
          <label for="slotEnd">Waktu Selesai</label>
          <input type="time" class="form-control" id="slotEnd" value="${data.endTime || ''}" required />
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-item" style="display: inline-flex; background: none; padding: 0;">
          <input type="checkbox" id="slotIsBreak" ${data.isBreak ? 'checked' : ''} />
          Tandai sebagai waktu istirahat
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="cancelSlotBtn">Batal</button>
        <button type="submit" class="btn btn-primary">${data.id ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `;
}

export function initKbm(refreshPage) {
  // Select profile card
  document.querySelectorAll('.kbm-profile-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-profile-btn') || e.target.closest('.delete-profile-btn')) return;
      selectedProfileId = card.dataset.profileId;
      refreshPage();
    });
  });

  // Add profile
  document.getElementById('addProfileBtn')?.addEventListener('click', () => {
    const { modal, closeModal: close } = openModal('Tambah Profil Jam KBM', profileFormHTML());
    modal.querySelector('#cancelProfileBtn').addEventListener('click', close);
    modal.querySelector('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#profileName').value.trim();
      const days = [...modal.querySelectorAll('input[name="profileDays"]:checked')].map(cb => cb.value);
      if (!name) return;
      const newProfile = DataStore.addKbmProfile({ name, days, slots: [] });
      selectedProfileId = newProfile.id;
      close();
      showToast('Profil berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });

  // Edit profile
  document.querySelectorAll('.edit-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const profile = DataStore.getKbmProfiles().find(p => p.id === id);
      if (!profile) return;
      const { modal, closeModal: close } = openModal('Edit Profil', profileFormHTML(profile));
      modal.querySelector('#cancelProfileBtn').addEventListener('click', close);
      modal.querySelector('#profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        DataStore.updateKbmProfile(id, {
          name: modal.querySelector('#profileName').value.trim(),
          days: [...modal.querySelectorAll('input[name="profileDays"]:checked')].map(cb => cb.value)
        });
        close();
        showToast('Profil berhasil diperbarui!', 'success');
        refreshPage();
      });
    });
  });

  // Delete profile
  document.querySelectorAll('.delete-profile-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Hapus profil ini? Semua jam dan jadwal terkait akan terhapus.')) {
        const id = btn.dataset.id;
        DataStore.deleteKbmProfile(id);
        if (selectedProfileId === id) selectedProfileId = null;
        showToast('Profil berhasil dihapus!', 'success');
        refreshPage();
      }
    });
  });

  // Add slot
  document.getElementById('addSlotBtn')?.addEventListener('click', () => {
    if (!selectedProfileId) return;
    const { modal, closeModal: close } = openModal('Tambah Jam', slotFormHTML({}, selectedProfileId));
    modal.querySelector('#cancelSlotBtn').addEventListener('click', close);
    modal.querySelector('#slotForm').addEventListener('submit', (e) => {
      e.preventDefault();
      DataStore.addSlotToProfile(selectedProfileId, {
        order: parseInt(modal.querySelector('#slotOrder').value),
        label: modal.querySelector('#slotLabel').value.trim(),
        startTime: modal.querySelector('#slotStart').value,
        endTime: modal.querySelector('#slotEnd').value,
        isBreak: modal.querySelector('#slotIsBreak').checked
      });
      close();
      showToast('Jam berhasil ditambahkan!', 'success');
      refreshPage();
    });
  });

  // Edit slot
  document.querySelectorAll('.edit-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!selectedProfileId) return;
      const slotId = btn.dataset.slotId;
      const profile = DataStore.getKbmProfiles().find(p => p.id === selectedProfileId);
      const slot = profile?.slots?.find(s => s.id === slotId);
      if (!slot) return;
      const { modal, closeModal: close } = openModal('Edit Jam', slotFormHTML(slot, selectedProfileId));
      modal.querySelector('#cancelSlotBtn').addEventListener('click', close);
      modal.querySelector('#slotForm').addEventListener('submit', (e) => {
        e.preventDefault();
        DataStore.updateSlotInProfile(selectedProfileId, slotId, {
          order: parseInt(modal.querySelector('#slotOrder').value),
          label: modal.querySelector('#slotLabel').value.trim(),
          startTime: modal.querySelector('#slotStart').value,
          endTime: modal.querySelector('#slotEnd').value,
          isBreak: modal.querySelector('#slotIsBreak').checked
        });
        close();
        showToast('Jam berhasil diperbarui!', 'success');
        refreshPage();
      });
    });
  });

  // Delete slot
  document.querySelectorAll('.delete-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!selectedProfileId) return;
      if (confirm('Hapus jam ini?')) {
        DataStore.deleteSlotFromProfile(selectedProfileId, btn.dataset.slotId);
        showToast('Jam berhasil dihapus!', 'success');
        refreshPage();
      }
    });
  });
}
