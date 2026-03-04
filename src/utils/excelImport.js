import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DataStore from '../dataStore.js';

// --- 1. Generate & Download Blank Templates ---

export async function downloadTeacherTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    // Sheet 1: Panduan
    const wsGuide = workbook.addWorksheet('Panduan');
    wsGuide.columns = [{ width: 40 }, { width: 60 }];
    wsGuide.getCell('A1').value = 'PANDUAN MENGISI DATA GURU';
    wsGuide.getCell('A1').font = { bold: true, size: 14 };
    wsGuide.getCell('A3').value = 'Topik';
    wsGuide.getCell('B3').value = 'Keterangan';
    wsGuide.getRow(3).font = { bold: true };

    const guides = [
        ['1. Jangan Ubah Header', 'Baris pertama (Nama Lengkap, NIP) di Sheet Data JANGAN diubah atau dihapus.'],
        ['2. Nama Lengkap (Wajib)', 'Ketik nama lengkap beserta gelar. Contoh: Budi Santoso, S.Pd.'],
        ['3. NIP (Opsional)', 'Nomor Induk Pegawai. Boleh dikosongkan jika tidak ada.'],
        ['4. Mata Pelajaran', 'Mata pelajaran yang diampu BUKAN diisi di sini, melainkan diatur manual via aplikasi atau otomatis terkait saat import jadwal.']
    ];

    let row = 4;
    guides.forEach(g => {
        wsGuide.getCell(`A${row}`).value = g[0];
        wsGuide.getCell(`B${row}`).value = g[1];
        wsGuide.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
        wsGuide.getCell(`B${row}`).alignment = { vertical: 'top', wrapText: true };
        row++;
    });

    // Sheet 2: Data
    const wsData = workbook.addWorksheet('Data');
    wsData.columns = [{ width: 30 }, { width: 25 }];
    wsData.getRow(1).values = ['Nama Lengkap', 'NIP'];
    wsData.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsData.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };

    // Contoh DUMMY
    wsData.addRow(['Budi Santoso, S.Pd', '198001012005011001']);
    wsData.addRow(['Siti Aminah, M.Pd', '-']);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Template_Import_Guru.xlsx');
}

export async function downloadSubjectTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    const wsGuide = workbook.addWorksheet('Panduan');
    wsGuide.columns = [{ width: 40 }, { width: 60 }];
    wsGuide.getCell('A1').value = 'PANDUAN MENGISI MATA PELAJARAN';
    wsGuide.getCell('A1').font = { bold: true, size: 14 };
    wsGuide.getCell('A3').value = 'Topik';
    wsGuide.getCell('B3').value = 'Keterangan';
    wsGuide.getRow(3).font = { bold: true };

    const guides = [
        ['1. Jangan Ubah Header', 'Baris pertama di Sheet Data JANGAN diubah/dihapus.'],
        ['2. Kode Mapel (Wajib)', 'Singkatan/kode unik. Contoh: MTK, B.IND, SEJ. Maks 10 huruf. Pastikan unik (tidak boleh ada kode ganda).'],
        ['3. Nama Mapel (Wajib)', 'Nama lengkap pelajaran/kegiatan. Contoh: Matematika Wajib.'],
        ['4. Tipe (Opsional)', 'Isi dengan salah satu: pelajaran, ekskul, keagamaan, atau upacara. (Default: pelajaran).']
    ];

    let row = 4;
    guides.forEach(g => {
        wsGuide.getCell(`A${row}`).value = g[0];
        wsGuide.getCell(`B${row}`).value = g[1];
        wsGuide.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
        wsGuide.getCell(`B${row}`).alignment = { vertical: 'top', wrapText: true };
        row++;
    });

    const wsData = workbook.addWorksheet('Data');
    wsData.columns = [{ width: 15 }, { width: 35 }, { width: 15 }];
    wsData.getRow(1).values = ['Kode Mapel', 'Nama Mata Pelajaran', 'Tipe'];
    wsData.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsData.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };

    wsData.addRow(['B.IND', 'Bahasa Indonesia', 'pelajaran']);
    wsData.addRow(['MTK', 'Matematika Wajib', 'pelajaran']);
    wsData.addRow(['PRAMUKA', 'Pramuka Wajib', 'ekskul']);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Template_Import_Mapel.xlsx');
}

export async function downloadStudentTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    // 1. Sheet Panduan
    const wsGuide = workbook.addWorksheet('Panduan');
    wsGuide.columns = [{ width: 40 }, { width: 60 }];
    wsGuide.getCell('A1').value = 'PANDUAN MENGISI DATA SISWA';
    wsGuide.getCell('A1').font = { bold: true, size: 14 };
    wsGuide.getCell('A3').value = 'Topik';
    wsGuide.getCell('B3').value = 'Keterangan';
    wsGuide.getRow(3).font = { bold: true };

    const guides = [
        ['1. Jangan Ubah Header', 'Baris pertama di Sheet Data JANGAN diubah atau dihapus.'],
        ['2. Nama Lengkap (Wajib)', 'Ketik nama lengkap siswa secara benar.'],
        ['3. NISN (Wajib)', 'Nomor Induk Siswa Nasional. Pastikan berisikan angka unik.'],
        ['4. L/P (Wajib)', 'Isi dengan huruf L untuk Laki-laki atau P untuk Perempuan.'],
        ['5. Kelas (Wajib)', 'Harus SAMA PERSIS dengan nama kelas yang sudah ada di Sistem. (Huruf besar/kecil berpengaruh, contoh: X IPA 1)']
    ];

    let row = 4;
    guides.forEach(g => {
        wsGuide.getCell(`A${row}`).value = g[0];
        wsGuide.getCell(`B${row}`).value = g[1];
        wsGuide.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
        wsGuide.getCell(`B${row}`).alignment = { vertical: 'top', wrapText: true };
        row++;
    });

    // 2. Sheet Referensi
    const wsRef = workbook.addWorksheet('Referensi Kelas');
    wsRef.columns = [{ width: 30 }];
    wsRef.getRow(1).values = ['Daftar Kelas Valid'];
    wsRef.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsRef.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };

    DataStore.getClasses().forEach(c => {
        wsRef.addRow([c.name]);
    });

    // 3. Sheet Data
    const wsData = workbook.addWorksheet('Data');
    wsData.columns = [{ width: 30 }, { width: 25 }, { width: 10 }, { width: 20 }];
    wsData.getRow(1).values = ['Nama Lengkap', 'NISN', 'L/P', 'Kelas'];
    wsData.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsData.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };

    wsData.addRow(['Ahmad Habibi', '0021345678', 'L', 'X IPA 1']);
    wsData.addRow(['Siti Sarah', '0012344755', 'P', 'X IPA 1']);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Template_Import_Siswa.xlsx');
}

export async function downloadScheduleTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    // 1. Sheet Panduan
    const wsGuide = workbook.addWorksheet('Panduan (PENTING!)');
    wsGuide.columns = [{ width: 30 }, { width: 70 }];
    wsGuide.getCell('A1').value = 'PANDUAN MENGISI JADWAL';
    wsGuide.getCell('A1').font = { bold: true, size: 14, color: { argb: 'C00000' } };

    const warnStr = 'SISTEM INI SANGAT SENSITIF TERHADAP TYPO (SALAH KETIK). PASTIKAN NAMA KELAS, KODE MAPEL, DAN GURU SAMA PERSIS DENGAN YANG ADA DI SISTEM!';
    wsGuide.getCell('A2').value = warnStr;
    wsGuide.mergeCells('A2:B2');
    wsGuide.getCell('A2').font = { bold: true, color: { argb: 'C00000' } };

    wsGuide.getCell('A4').value = 'Kolom';
    wsGuide.getCell('B4').value = 'Keterangan';
    wsGuide.getRow(4).font = { bold: true };

    const guides = [
        ['Kelas (Wajib)', 'Contoh: X IPA 1, XI IPS 2. Harus lihat Sheet "Referensi Data" untuk nama valid.'],
        ['Hari (Wajib)', 'Pilih: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu.'],
        ['Jam Ke- (Wajib)', 'Angka slot jam KBM (1, 2, 3, dsb). Harus sesuai profil KBM sekolah.'],
        ['Kode Mapel (Wajib)', 'Harus SAMA PERSIS dengan Kode Mapel. Lihat Sheet "Referensi Data".'],
        ['Nama Guru (Wajib)', 'Harus SAMA PERSIS dengan Nama Guru. (Isi N/A jika mapel Non-Pelajaran spt Ekskul). Lihat "Referensi Data".']
    ];

    let row = 5;
    guides.forEach(g => {
        wsGuide.getCell(`A${row}`).value = g[0];
        wsGuide.getCell(`B${row}`).value = g[1];
        wsGuide.getCell(`A${row}`).alignment = { vertical: 'top', wrapText: true };
        wsGuide.getCell(`B${row}`).alignment = { vertical: 'top', wrapText: true };
        row++;
    });

    // 2. Sheet Data Referensi
    const wsRef = workbook.addWorksheet('Referensi Data');
    wsRef.columns = [
        { width: 20 }, // Kelas
        { width: 15 }, // Hari
        { width: 15 }, // Kode Mapel
        { width: 35 }, // Nama Mapel
        { width: 35 }  // Nama Guru
    ];

    wsRef.getRow(1).values = ['Daftar Kelas Valid', 'Daftar Hari Valid', 'Daftar Kode Mapel', 'Daftar Nama Mapel', 'Daftar Nama Guru Valid'];
    wsRef.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsRef.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };

    const reqClasses = DataStore.getClasses().map(c => c.name);
    const reqDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const reqSubjects = DataStore.getSubjects();
    const reqTeachers = DataStore.getTeachers().map(t => t.name);

    const maxRows = Math.max(reqClasses.length, reqDays.length, reqSubjects.length, reqTeachers.length);
    for (let i = 0; i < maxRows; i++) {
        wsRef.addRow([
            reqClasses[i] || '',
            reqDays[i] || '',
            reqSubjects[i] ? reqSubjects[i].code : '',
            reqSubjects[i] ? reqSubjects[i].name : '',
            reqTeachers[i] || ''
        ]);
    }

    // 3. Sheet Data (Untuk diisi user)
    const wsData = workbook.addWorksheet('Data Jadwal');
    wsData.columns = [{ width: 15 }, { width: 15 }, { width: 10 }, { width: 15 }, { width: 30 }];
    wsData.getRow(1).values = ['Kelas', 'Hari', 'Jam Ke-', 'Kode Mapel', 'Nama Guru'];
    wsData.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    wsData.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };

    wsData.addRow(['(Isi Sesuai Ref)', 'Senin', 1, 'KODEMAPEL', 'Nama Guru yang Valid']);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Template_Import_Jadwal.xlsx');
}

// --- 2. Import Logic ---

function safeString(val) {
    if (val === null || val === undefined) return '';
    return String(val).trim();
}

/**
 * Parses the uploaded excel buffer. 
 * Returns { success: true/false, count: x, errors: ['msg1', 'msg2'] }
 */
export async function importTeachersFromExcel(arrayBuffer) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        let ws = workbook.getWorksheet('Data');
        if (!ws && workbook.worksheets.length >= 2) ws = workbook.worksheets[1];
        if (!ws) ws = workbook.worksheets[0];

        let imported = 0;
        const errors = [];

        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const name = safeString(row.getCell(1).value);
            const nip = safeString(row.getCell(2).value);

            if (!name) {
                if (nip) errors.push(`Baris ${rowNumber}: Nama Lengkap kosong.`);
                return; // Empty line
            }

            // Basic duplicate check (exact name match)
            const existing = DataStore.getTeachers().find(t => t.name.toLowerCase() === name.toLowerCase());
            if (existing) {
                errors.push(`Baris ${rowNumber}: Guru "${name}" sudah ada (diabaikan).`);
            } else {
                DataStore.addTeacher({ name, nip, subjectIds: [] });
                imported++;
            }
        });

        return { success: true, count: imported, errors };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function importSubjectsFromExcel(arrayBuffer) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        let ws = workbook.getWorksheet('Data');
        if (!ws && workbook.worksheets.length >= 2) ws = workbook.worksheets[1];
        if (!ws) ws = workbook.worksheets[0];

        let imported = 0;
        const errors = [];
        const validTypes = ['pelajaran', 'ekskul', 'keagamaan', 'upacara'];

        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const code = safeString(row.getCell(1).value).toUpperCase();
            const name = safeString(row.getCell(2).value);
            let type = safeString(row.getCell(3).value).toLowerCase();

            if (!code && !name) return;
            if (!code || !name) {
                errors.push(`Baris ${rowNumber}: Kode dan Nama Mapel wajib diisi.`);
                return;
            }
            if (!validTypes.includes(type)) type = 'pelajaran';

            // Duplicate check (by code)
            const existing = DataStore.getSubjects().find(s => s.code === code);
            if (existing) {
                errors.push(`Baris ${rowNumber}: Kode "${code}" sudah terpakai (diabaikan).`);
            } else {
                DataStore.addSubject({ code, name, type });
                imported++;
            }
        });

        return { success: true, count: imported, errors };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function importStudentsFromExcel(arrayBuffer) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        let ws = workbook.getWorksheet('Data');
        if (!ws && workbook.worksheets.length >= 2) ws = workbook.worksheets[1]; // Or perhaps 2 if there's Ref sheet
        if (!ws) ws = workbook.worksheets[0];

        // Explicit fix: Because we have 3 sheets (Panduan, Referensi, Data) for Student Template
        if (ws.name === 'Panduan' || ws.name === 'Referensi Kelas') {
            // Fallback to searching explicitly by name again, if previous check picked up wrong index
            let properWs = workbook.worksheets.find(x => x.name.trim().toLowerCase() === 'data');
            if (properWs) ws = properWs;
            else if (workbook.worksheets.length >= 3) ws = workbook.worksheets[2]; // Data is the 3rd sheet
        }

        let imported = 0;
        const errors = [];

        const dbClasses = DataStore.getClasses();

        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const name = safeString(row.getCell(1).value);
            const nisn = safeString(row.getCell(2).value);
            const genderStr = safeString(row.getCell(3).value).toUpperCase();
            const className = safeString(row.getCell(4).value);

            if (!name && !nisn && !className) return;

            if (!name) {
                errors.push(`Baris ${rowNumber}: Nama Lengkap wajib diisi.`);
                return;
            }
            if (!nisn) {
                errors.push(`Baris ${rowNumber}: NISN wajib diisi.`);
                return;
            }
            let gender = '';
            if (genderStr === 'L' || genderStr === 'P') {
                gender = genderStr;
            } else {
                errors.push(`Baris ${rowNumber}: L/P harus diisi 'L' atau 'P'.`);
                return;
            }
            if (!className) {
                errors.push(`Baris ${rowNumber}: Kelas wajib diisi.`);
                return;
            }

            // Find class ID
            const foundClass = dbClasses.find(c => c.name === className);
            if (!foundClass) {
                errors.push(`Baris ${rowNumber}: Kelas "${className}" tidak valid. Pastikan sudah ada di sistem.`);
                return;
            }

            // Check duplicate NISN
            const existing = DataStore.getStudents().find(s => s.nisn === nisn);
            if (existing) {
                errors.push(`Baris ${rowNumber}: NISN "${nisn}" sudah terdaftar atas nama ${existing.name}. (Diabaikan)`);
            } else {
                DataStore.addStudent({ name, nisn, gender, classId: foundClass.id });
                imported++;
            }
        });

        return { success: true, count: imported, errors };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function importScheduleFromExcel(arrayBuffer) {
    try {
        const activeSemester = DataStore.getActiveSemester();
        if (!activeSemester) return { success: false, error: 'Tidak ada semester aktif.' };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // Coba cari sheet 'Data Jadwal' dulu, kalau tidak ada coba 'Data', kalau tidak ada ambil sheet ke-3
        let ws = workbook.getWorksheet('Data Jadwal');
        if (!ws) ws = workbook.getWorksheet('Data');
        if (!ws && workbook.worksheets.length >= 3) ws = workbook.worksheets[2];
        if (!ws) ws = workbook.worksheets[0];

        const dbClasses = DataStore.getClasses();
        const dbTeachers = DataStore.getTeachers();
        const dbSubjects = DataStore.getSubjects();

        const VALID_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        let imported = 0;
        const errors = [];

        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const className = safeString(row.getCell(1).value);
            const day = safeString(row.getCell(2).value);
            const cell3Value = row.getCell(3).value;
            const jamStr = cell3Value ? cell3Value.toString() : '';
            const subjectCode = safeString(row.getCell(4).value).toUpperCase();
            const teacherName = safeString(row.getCell(5).value);

            // Skip completely empty rows
            if (!className && !day && !jamStr && !subjectCode) return;

            // --- VALIDATIONS ---
            const rowPrefix = `Baris ${rowNumber} (${className} - ${day} Jam ${jamStr})`;

            const cls = dbClasses.find(c => c.name.toLowerCase() === className.toLowerCase());
            if (!cls) { errors.push(`${rowPrefix}: Kelas "${className}" tidak ditemukan.`); return; }

            const formattedDay = VALID_DAYS.find(d => d.toLowerCase() === day.toLowerCase());
            if (!formattedDay) { errors.push(`${rowPrefix}: Hari "${day}" tidak valid.`); return; }

            // Find kbm slot matching the index
            const daySlots = DataStore.getKbmSlotsForDay(formattedDay);
            if (daySlots.length === 0) { errors.push(`${rowPrefix}: Belum ada profil jam KBM untuk hari ${formattedDay}.`); return; }

            // Match slot index (assuming 1-based index)
            const slotIndex = parseInt(jamStr, 10) - 1;
            const slot = daySlots[slotIndex];
            // Be lenient with slot names like "Ke-1"
            const foundSlot = slot || daySlots.find(s => s.label.includes(jamStr) || (s.order == jamStr));
            if (!foundSlot) { errors.push(`${rowPrefix}: Jam "${jamStr}" tidak cocok dengan slot KBM hari ${formattedDay}.`); return; }
            if (foundSlot.isBreak) { errors.push(`${rowPrefix}: Jam "${jamStr}" adalah waktu Istirahat.`); return; }

            const subj = dbSubjects.find(s => s.code === subjectCode);
            if (!subj) { errors.push(`${rowPrefix}: Kode Mapel "${subjectCode}" tidak ditemukan.`); return; }

            let teacherObj = null;
            const isPelajaran = !subj.type || subj.type === 'pelajaran';

            if (isPelajaran) {
                if (!teacherName || teacherName.toLowerCase() === 'n/a') {
                    errors.push(`${rowPrefix}: Nama guru wajib diisi untuk mapel tipe pelajaran.`);
                    return;
                }
                teacherObj = dbTeachers.find(t => t.name.toLowerCase() === teacherName.toLowerCase());
                if (!teacherObj) {
                    errors.push(`${rowPrefix}: Guru "${teacherName}" tidak ditemukan di database.`);
                    return;
                }
            }

            const slotId = foundSlot.id;
            const classId = cls.id;

            // Check if slot in this class is already occupied
            const existing = DataStore.getScheduleAt(formattedDay, slotId, classId);
            if (existing) {
                errors.push(`${rowPrefix}: Peringatan, slot kelas ini sudah terisi. Melewati (skip).`);
                return;
            }

            // Check for teacher collision
            if (isPelajaran && teacherObj) {
                if (DataStore.hasConflict(teacherObj.id, formattedDay, slotId)) {
                    errors.push(`${rowPrefix}: Konflik jadwal! Guru "${teacherObj.name}" sudah mengajar di kelas lain pada jam ini.`);
                    return;
                }

                // Auto-assign subject to teacher if they don't have it yet
                if (!(teacherObj.subjectIds || []).includes(subj.id)) {
                    const newIds = [...(teacherObj.subjectIds || []), subj.id];
                    DataStore.updateTeacher(teacherObj.id, { subjectIds: newIds });
                }
            }

            // Finally, Add schedule
            DataStore.addSchedule({
                teacherId: teacherObj ? teacherObj.id : null,
                subjectId: subj.id,
                day: formattedDay,
                kbmSlotId: slotId,
                classId: classId
            });
            imported++;
        });

        return { success: true, count: imported, errors };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
