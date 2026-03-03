# 🏫 Sistem Jadwal Sekolah

Aplikasi web untuk mengelola jadwal pelajaran sekolah secara lengkap — mulai dari data guru, mata pelajaran, kelas, hingga penyusunan jadwal dengan fitur drag & drop.

![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Fitur Utama

### 📋 Manajemen Data
- **Identitas Sekolah** — Nama, NPSN, alamat, kontak, logo, kepala sekolah & wakasek
- **Semester & Tahun Pelajaran** — Kelola semester aktif dan arsip
- **Mata Pelajaran** — Dengan 4 tipe: Pelajaran, Ekskul, Keagamaan, Upacara/Kegiatan
- **Kelas** — Daftar kelas yang akan dijadwalkan
- **Guru** — Data guru beserta mata pelajaran yang diampu

### ⏰ Profil Jam KBM
- Buat profil jam KBM berbeda untuk setiap hari (misal: Jumat lebih pendek)
- Atur jam mulai, selesai, dan jam istirahat per profil
- Assign profil ke hari-hari tertentu

### 📅 Jadwal Pelajaran (Drag & Drop)
- Susun jadwal dengan **drag & drop** guru ke slot waktu
- **Deteksi konflik otomatis** — sistem mencegah guru dijadwalkan di 2 kelas pada waktu yang sama
- **Konflik selektif** — pengecekan konflik hanya untuk tipe "Pelajaran", sedangkan Ekskul/Keagamaan/Upacara bebas konflik
- Tampilan jadwal per kelas dengan tab switching
- Warna entry jadwal berbeda sesuai tipe (ungu=pelajaran, hijau=ekskul, biru=keagamaan, orange=upacara)

### 📥 Ekspor ke Excel
- Ekspor jadwal ke file `.xlsx` dengan format profesional
- Kop sekolah otomatis (nama, alamat, NPSN)
- Tanda tangan Kepala Sekolah & Wakasek Kurikulum
- Satu sheet per kelas

### 🌗 Light/Dark Mode
- Toggle tema terang/gelap di pojok kiri bawah sidebar
- Default: Light Mode
- Pilihan tema tersimpan otomatis (localStorage)

### 📱 Responsive
- Tampilan menyesuaikan untuk desktop dan mobile
- Sidebar collapsible pada layar kecil

---

## 🛠️ Tech Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| [Vite](https://vitejs.dev/) | 7.x | Build tool & dev server |
| Vanilla JS | ES2020+ | Logika aplikasi |
| CSS3 | - | Styling dengan CSS Variables |
| [ExcelJS](https://github.com/exceljs/exceljs) | 4.x | Ekspor ke Excel |
| [FileSaver.js](https://github.com/eligrey/FileSaver.js) | 2.x | Download file |
| localStorage | - | Penyimpanan data |

---

## 🚀 Deploy Lokal (Windows/Mac/Linux)

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- npm (sudah termasuk dalam Node.js)

### Langkah-langkah

```bash
# 1. Clone repository
git clone https://github.com/fluffykitten/Sistem-Jadwal.git
cd Sistem-Jadwal

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev
```

Buka browser dan akses `http://localhost:5173/`

> **Catatan:** Port bisa berbeda (misal 5174) jika port 5173 sudah terpakai. Lihat output terminal untuk URL yang tepat.

---

## 🌐 Deploy di Server Linux (Online)

### Opsi 1: Deploy sebagai Static Site (Recommended)

Aplikasi ini adalah client-side app (semua data di localStorage browser), jadi cukup di-build menjadi file statis dan di-serve dengan Nginx.

#### 1. Persiapan Server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Verifikasi
node -v   # harus >= 18
npm -v
nginx -v
```

#### 2. Clone & Build

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/fluffykitten/Sistem-Jadwal.git
cd Sistem-Jadwal

# Install dependencies
sudo npm install

# Build untuk production
sudo npm run build
```

Hasil build akan ada di folder `dist/`.

#### 3. Konfigurasi Nginx

```bash
# Buat konfigurasi Nginx
sudo nano /etc/nginx/sites-available/jadwal
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name jadwal.example.com;  # Ganti dengan domain atau IP server

    root /var/www/Sistem-Jadwal/dist;
    index index.html;

    # SPA routing — semua path diarahkan ke index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

```bash
# Aktifkan site & restart Nginx
sudo ln -s /etc/nginx/sites-available/jadwal /etc/nginx/sites-enabled/
sudo nginx -t          # Test konfigurasi
sudo systemctl restart nginx
```

#### 4. (Opsional) HTTPS dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d jadwal.example.com

# Auto-renew sudah otomatis terkonfigurasi
```

Sekarang aplikasi bisa diakses di `https://jadwal.example.com`.

---

### Opsi 2: Deploy dengan PM2 (Dev-like Server)

Jika ingin menjalankan Vite preview server (bukan Nginx):

```bash
# Install PM2 globally
sudo npm install -g pm2

# Clone & build
cd /var/www
sudo git clone https://github.com/fluffykitten/Sistem-Jadwal.git
cd Sistem-Jadwal
sudo npm install
sudo npm run build

# Jalankan preview server dengan PM2
pm2 start "npm run preview -- --host 0.0.0.0 --port 80" --name jadwal

# Agar otomatis jalan saat server restart
pm2 save
pm2 startup
```

---

## 📁 Struktur Folder

```
Sistem-Jadwal/
├── index.html              # Entry point HTML
├── package.json            # Dependencies & scripts
├── src/
│   ├── main.js             # Router & initialization
│   ├── style.css           # Design system (light/dark mode)
│   ├── dataStore.js        # localStorage data layer
│   ├── components/
│   │   ├── modal.js        # Modal dialog component
│   │   └── toast.js        # Toast notification component
│   ├── pages/
│   │   ├── dashboard.js    # Dashboard & stats
│   │   ├── school.js       # Identitas sekolah
│   │   ├── semester.js     # Semester management
│   │   ├── subjects.js     # Mata pelajaran + tipe
│   │   ├── classes.js      # Kelas
│   │   ├── teachers.js     # Guru
│   │   ├── kbm.js          # Profil jam KBM
│   │   └── schedule.js     # Jadwal pelajaran (drag & drop)
│   └── utils/
│       └── excelExport.js  # Ekspor jadwal ke Excel
└── dist/                   # Hasil build (production)
```

---

## ⚠️ Catatan Penting

- Semua data disimpan di **localStorage browser** — artinya data bersifat lokal per browser/device
- Untuk penggunaan multi-user atau penyimpanan terpusat, perlu ditambahkan backend (database server)
- Ukuran data localStorage terbatas (~5-10 MB per domain)

---

## 📄 Lisensi

MIT License — Silakan digunakan dan dimodifikasi sesuai kebutuhan.
