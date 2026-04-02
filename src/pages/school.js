// School Identity page
import DataStore from '../dataStore.js';
import { showToast } from '../components/toast.js';

export function renderSchool() {
  const school = DataStore.getSchool();
  const settings = DataStore.getSettings();

  return `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2><span class="header-icon">🏫</span> Identitas Sekolah</h2>
          <p class="page-subtitle">Kelola informasi dasar sekolah Anda</p>
        </div>
      </div>

      <div class="card school-form">
        <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;">
          <div class="logo-upload">
            <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary);">Logo Sekolah</p>
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
          <div class="logo-upload">
            <p style="font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary);">Logo Yayasan</p>
            <div class="logo-preview" id="logoYayasanPreview">
              ${school.logoYayasan
      ? `<img src="${school.logoYayasan}" alt="Logo Yayasan" />`
      : `<span class="logo-placeholder">📷</span>`
    }
            </div>
            <div>
              <button class="btn btn-secondary btn-sm" id="uploadLogoYayasanBtn">Upload Logo</button>
              <input type="file" id="logoYayasanFileInput" accept="image/*" style="display:none" />
              <p style="font-size: 0.72rem; color: var(--text-tertiary); margin-top: 4px;">JPG, PNG maks. 500KB</p>
            </div>
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

          <div class="form-row">
            <div class="form-group">
              <label for="schoolAccreditation">Akreditasi</label>
              <select class="form-control" id="schoolAccreditation">
                <option value="" ${!school.accreditation ? 'selected' : ''}>-- Pilih --</option>
                <option value="A" ${school.accreditation === 'A' ? 'selected' : ''}>Terakreditasi A</option>
                <option value="B" ${school.accreditation === 'B' ? 'selected' : ''}>Terakreditasi B</option>
                <option value="C" ${school.accreditation === 'C' ? 'selected' : ''}>Terakreditasi C</option>
                <option value="Unggul" ${school.accreditation === 'Unggul' ? 'selected' : ''}>Terakreditasi Unggul</option>
                <option value="Baik Sekali" ${school.accreditation === 'Baik Sekali' ? 'selected' : ''}>Terakreditasi Baik Sekali</option>
                <option value="Baik" ${school.accreditation === 'Baik' ? 'selected' : ''}>Terakreditasi Baik</option>
              </select>
            </div>
            <div class="form-group">
              <label for="schoolPhone">Telepon</label>
              <input type="text" class="form-control" id="schoolPhone" placeholder="(021) xxx-xxxx" value="${school.phone || ''}" />
            </div>
          </div>

          <div class="form-group">
            <label for="schoolAddress">Alamat</label>
            <textarea class="form-control" id="schoolAddress" placeholder="Alamat lengkap sekolah">${school.address || ''}</textarea>
          </div>

          <div class="form-row">
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

      <!-- Pengaturan Tampilan -->
      <div class="card" style="margin-top: 20px;">
        <h3 style="margin-bottom: 16px; font-size: 1rem;">⚙️ Pengaturan Tampilan</h3>
        <div class="form-group">
          <label style="margin-bottom: 8px; font-weight: 600;">Tampilan Status Kehadiran</label>
          <div style="display: flex; gap: 12px;">
            <button class="btn ${settings.attendanceDisplay === 'emoji' ? 'btn-primary' : 'btn-secondary'}" id="attDisplayEmoji" style="flex: 1; padding: 12px; font-size: 0.9rem;">
              ✅🕐🤒📋❌<br><span style="font-size: 0.78rem; opacity: 0.8;">Emoji</span>
            </button>
            <button class="btn ${settings.attendanceDisplay === 'text' ? 'btn-primary' : 'btn-secondary'}" id="attDisplayText" style="flex: 1; padding: 12px; font-size: 0.9rem;">
              H &nbsp; T &nbsp; S &nbsp; I &nbsp; A<br><span style="font-size: 0.78rem; opacity: 0.8;">Teks</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initSchool() {
  const form = document.getElementById('schoolForm');
  const logoPreview = document.getElementById('logoPreview');
  const uploadBtn = document.getElementById('uploadLogoBtn');
  const fileInput = document.getElementById('logoFileInput');
  const logoYayasanPreview = document.getElementById('logoYayasanPreview');
  const uploadYayasanBtn = document.getElementById('uploadLogoYayasanBtn');
  const yayasanFileInput = document.getElementById('logoYayasanFileInput');

  let currentLogo = DataStore.getSchool().logo || '';
  let currentLogoYayasan = DataStore.getSchool().logoYayasan || '';

  uploadBtn.addEventListener('click', () => fileInput.click());
  logoPreview.addEventListener('click', () => fileInput.click());
  uploadYayasanBtn.addEventListener('click', () => yayasanFileInput.click());
  logoYayasanPreview.addEventListener('click', () => yayasanFileInput.click());

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

  yayasanFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 512000) {
      showToast('Ukuran file terlalu besar (maks 500KB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentLogoYayasan = ev.target.result;
      logoYayasanPreview.innerHTML = `<img src="${currentLogoYayasan}" alt="Logo Yayasan" />`;
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('schoolName').value.trim(),
      npsn: document.getElementById('schoolNpsn').value.trim(),
      accreditation: document.getElementById('schoolAccreditation').value,
      address: document.getElementById('schoolAddress').value.trim(),
      phone: document.getElementById('schoolPhone').value.trim(),
      email: document.getElementById('schoolEmail').value.trim(),
      principal: document.getElementById('schoolPrincipal').value.trim(),
      vicePrincipal: document.getElementById('schoolVicePrincipal').value.trim(),
      logo: currentLogo,
      logoYayasan: currentLogoYayasan
    };
    DataStore.saveSchool(data);
    // Update sidebar school name
    const display = document.getElementById('schoolNameDisplay');
    if (display) display.textContent = data.name || 'Nama Sekolah';
    showToast('Identitas sekolah berhasil disimpan!', 'success');
  });

  // Attendance display toggle
  document.getElementById('attDisplayEmoji')?.addEventListener('click', () => {
    DataStore.saveSettings({ attendanceDisplay: 'emoji' });
    document.getElementById('attDisplayEmoji').className = 'btn btn-primary';
    document.getElementById('attDisplayText').className = 'btn btn-secondary';
    showToast('Tampilan kehadiran: Emoji', 'success');
  });
  document.getElementById('attDisplayText')?.addEventListener('click', () => {
    DataStore.saveSettings({ attendanceDisplay: 'text' });
    document.getElementById('attDisplayText').className = 'btn btn-primary';
    document.getElementById('attDisplayEmoji').className = 'btn btn-secondary';
    showToast('Tampilan kehadiran: Teks', 'success');
  });
}
