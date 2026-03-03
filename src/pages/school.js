// School Identity page
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';

export function renderSchool() {
  const school = DataStore.getSchool();

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">🏫</span> Identitas Sekolah</h2>
          <p class="page-subtitle">Kelola informasi dasar sekolah Anda</p>
        </div>
      </div>

      <div class="card school-form">
        <div class="logo-upload">
          <div class="logo-preview" id="logoPreview">
            ${school.logo
      ? `<img src="${school.logo}" alt="Logo Sekolah" />`
      : `<span class="logo-placeholder">📷</span>`
    }
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" id="uploadLogoBtn">Upload Logo</button>
            <input type="file" id="logoFileInput" accept="image/*" style="display:none" />
            <p style="font-size: 0.72rem; color: var(--text-tertiary); margin-top: 4px;">JPG, PNG maks. 500KB</p>
          </div>
        </div>

        <form id="schoolForm">
          <div class="form-row">
            <div class="form-group">
              <label for="schoolName">Nama Sekolah</label>
              <input type="text" class="form-control" id="schoolName" placeholder="Contoh: SMP Negeri 1 Jakarta" value="${school.name || ''}" />
            </div>
            <div class="form-group">
              <label for="schoolNpsn">NPSN</label>
              <input type="text" class="form-control" id="schoolNpsn" placeholder="Nomor Pokok Sekolah Nasional" value="${school.npsn || ''}" />
            </div>
          </div>

          <div class="form-group">
            <label for="schoolAddress">Alamat</label>
            <textarea class="form-control" id="schoolAddress" placeholder="Alamat lengkap sekolah">${school.address || ''}</textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="schoolPhone">Telepon</label>
              <input type="text" class="form-control" id="schoolPhone" placeholder="(021) xxx-xxxx" value="${school.phone || ''}" />
            </div>
            <div class="form-group">
              <label for="schoolEmail">Email</label>
              <input type="email" class="form-control" id="schoolEmail" placeholder="sekolah@email.com" value="${school.email || ''}" />
            </div>
          </div>

          <div class="form-group">
            <label for="schoolPrincipal">Kepala Sekolah</label>
            <input type="text" class="form-control" id="schoolPrincipal" placeholder="Nama Kepala Sekolah" value="${school.principal || ''}" />
          </div>

          <div class="form-group">
            <label for="schoolVicePrincipal">Wakil Kepala Sekolah Bag. Kurikulum</label>
            <input type="text" class="form-control" id="schoolVicePrincipal" placeholder="Nama Wakasek Kurikulum" value="${school.vicePrincipal || ''}" />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">💾 Simpan Identitas</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function initSchool() {
  const form = document.getElementById('schoolForm');
  const logoPreview = document.getElementById('logoPreview');
  const uploadBtn = document.getElementById('uploadLogoBtn');
  const fileInput = document.getElementById('logoFileInput');

  let currentLogo = DataStore.getSchool().logo || '';

  uploadBtn.addEventListener('click', () => fileInput.click());
  logoPreview.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 512000) {
      showToast('Ukuran file terlalu besar (maks 500KB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentLogo = ev.target.result;
      logoPreview.innerHTML = `<img src="${currentLogo}" alt="Logo Sekolah" />`;
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('schoolName').value.trim(),
      npsn: document.getElementById('schoolNpsn').value.trim(),
      address: document.getElementById('schoolAddress').value.trim(),
      phone: document.getElementById('schoolPhone').value.trim(),
      email: document.getElementById('schoolEmail').value.trim(),
      principal: document.getElementById('schoolPrincipal').value.trim(),
      vicePrincipal: document.getElementById('schoolVicePrincipal').value.trim(),
      logo: currentLogo
    };
    DataStore.saveSchool(data);
    // Update sidebar school name
    const display = document.getElementById('schoolNameDisplay');
    if (display) display.textContent = data.name || 'Nama Sekolah';
    showToast('Identitas sekolah berhasil disimpan!', 'success');
  });
}
