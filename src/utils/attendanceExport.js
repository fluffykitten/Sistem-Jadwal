// Attendance Report Excel Export
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DataStore from '../dataStore.js';

const STATUS_CODES = { hadir: 'H', terlambat: 'T', sakit: 'S', izin: 'I', alfa: 'A' };
const STATUS_COLORS = {
    hadir: '22C55E', terlambat: 'CA8A04', sakit: 'F97316', izin: '3B82F6', alfa: 'EF4444'
};

const SCHOOL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_JS_MAP = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

function isSchoolDay(date) {
    const d = new Date(date + 'T00:00:00');
    const dayName = DAY_JS_MAP[d.getDay()];
    return SCHOOL_DAYS.includes(dayName);
}

function getDatesInRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        if (isSchoolDay(dateStr)) dates.push(dateStr);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDate();
}

function formatDateIndo(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthYear(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Get teacher's attendance status for a day (aggregate: worst status wins)
function getTeacherDayStatus(attendance, teacherId) {
    if (!attendance || !attendance.entries) return null;
    const entries = attendance.entries.filter(e => e.teacherId === teacherId);
    if (entries.length === 0) return null;

    // Priority: alfa > sakit > izin > terlambat > hadir
    const priority = { alfa: 5, sakit: 4, izin: 3, terlambat: 2, hadir: 1 };
    let worst = 'hadir';
    for (const e of entries) {
        if ((priority[e.status] || 0) > (priority[worst] || 0)) {
            worst = e.status;
        }
    }
    return worst;
}

function getTeacherDayDetail(attendance, teacherId) {
    if (!attendance || !attendance.entries) return null;
    const entries = attendance.entries.filter(e => e.teacherId === teacherId);
    if (entries.length === 0) return null;
    const first = entries[0];
    return {
        status: getTeacherDayStatus(attendance, teacherId),
        suratDokter: entries.some(e => e.suratDokter),
        menitipkanTugas: entries.some(e => e.menitipkanTugas)
    };
}

// ========== Shared: Add kop to worksheet ==========
function addKop(ws, school, totalCols, startRow) {
    let row = startRow || 1;

    // School Name
    ws.mergeCells(row, 1, row, totalCols);
    const nameCell = ws.getCell(row, 1);
    nameCell.value = (school.name || 'NAMA SEKOLAH').toUpperCase();
    nameCell.font = { name: 'Arial', size: 14, bold: true };
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 24;
    row++;

    // Address
    ws.mergeCells(row, 1, row, totalCols);
    const addrCell = ws.getCell(row, 1);
    addrCell.value = school.address || 'Alamat Sekolah';
    addrCell.font = { name: 'Arial', size: 9, color: { argb: '444444' } };
    addrCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;

    // NPSN + Phone
    const infoLine = [school.npsn ? `NPSN: ${school.npsn}` : '', school.phone ? `Telp: ${school.phone}` : ''].filter(Boolean).join('  |  ');
    if (infoLine) {
        ws.mergeCells(row, 1, row, totalCols);
        const infoCell = ws.getCell(row, 1);
        infoCell.value = infoLine;
        infoCell.font = { name: 'Arial', size: 8, color: { argb: '666666' } };
        infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        row++;
    }

    // Separator line
    for (let c = 1; c <= totalCols; c++) {
        ws.getCell(row, c).border = { bottom: { style: 'double', color: { argb: '000000' } } };
    }
    row++;

    return row;
}

// ========== Shared: Add signature block ==========
function addSignature(ws, school, totalCols, row) {
    row += 2;

    // Date line
    const today = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dateStr = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

    const sigStartCol = Math.max(totalCols - 3, 1);
    ws.mergeCells(row, sigStartCol, row, totalCols);
    ws.getCell(row, sigStartCol).value = dateStr;
    ws.getCell(row, sigStartCol).font = { name: 'Arial', size: 10 };
    ws.getCell(row, sigStartCol).alignment = { horizontal: 'center' };
    row++;

    // Title
    ws.mergeCells(row, sigStartCol, row, totalCols);
    ws.getCell(row, sigStartCol).value = 'Kepala Sekolah,';
    ws.getCell(row, sigStartCol).font = { name: 'Arial', size: 10 };
    ws.getCell(row, sigStartCol).alignment = { horizontal: 'center' };
    row++;

    // Space for signature
    row += 3;

    // Name
    ws.mergeCells(row, sigStartCol, row, totalCols);
    const nameCell = ws.getCell(row, sigStartCol);
    nameCell.value = school.principal || '________________________';
    nameCell.font = { name: 'Arial', size: 10, bold: true, underline: true };
    nameCell.alignment = { horizontal: 'center' };
    row++;

    return row;
}

// ========== Shared: Status code cell styling ==========
function styleStatusCell(cell, statusCode) {
    const colorMap = { H: '22C55E', T: 'CA8A04', S: 'F97316', I: '3B82F6', A: 'EF4444' };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: colorMap[statusCode] || '000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

// ========== 1. Date-Range Report ==========
export async function exportDateRangeReport(startDate, endDate) {
    const school = DataStore.getSchool();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();
    const activeSemester = DataStore.getActiveSemester();

    // Filter pelajaran-only teachers
    const pelajaranTeachers = teachers.filter(t => {
        const subs = (t.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
        return subs.length === 0 || subs.some(s => !s.type || s.type === 'pelajaran');
    });

    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) { alert('Tidak ada hari sekolah dalam rentang tanggal ini.'); return; }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    const totalCols = 2 + dates.length + 5; // No, Nama, dates..., H, T, S, I, A
    const ws = workbook.addWorksheet('Laporan Presensi', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    // Set column widths
    const cols = [{ width: 4 }, { width: 25 }];
    dates.forEach(() => cols.push({ width: 4 }));
    cols.push({ width: 5 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 });
    ws.columns = cols;

    // Kop
    let row = addKop(ws, school, totalCols);

    // Title
    ws.mergeCells(row, 1, row, totalCols);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = 'DAFTAR HADIR GURU';
    titleCell.font = { name: 'Arial', size: 13, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 22;
    row++;

    // Subtitle (date range)
    ws.mergeCells(row, 1, row, totalCols);
    const subtitleCell = ws.getCell(row, 1);
    subtitleCell.value = `Periode: ${formatDateIndo(startDate)} — ${formatDateIndo(endDate)}`;
    subtitleCell.font = { name: 'Arial', size: 9, color: { argb: '555555' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;

    if (activeSemester) {
        ws.mergeCells(row, 1, row, totalCols);
        ws.getCell(row, 1).value = `Semester: ${activeSemester.name} — ${activeSemester.year}`;
        ws.getCell(row, 1).font = { name: 'Arial', size: 9, color: { argb: '555555' } };
        ws.getCell(row, 1).alignment = { horizontal: 'center' };
        row++;
    }

    row++; // Gap

    // Header row
    const headerRow = row;
    const headerStyle = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFF' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
    const thinBorder = { style: 'thin', color: { argb: '8DB4E2' } };
    const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    ws.getCell(row, 1).value = 'No';
    ws.getCell(row, 2).value = 'Nama Guru';
    dates.forEach((d, i) => {
        const cell = ws.getCell(row, 3 + i);
        cell.value = formatDateShort(d);
    });
    const summaryStart = 3 + dates.length;
    ws.getCell(row, summaryStart).value = 'H';
    ws.getCell(row, summaryStart + 1).value = 'T';
    ws.getCell(row, summaryStart + 2).value = 'S';
    ws.getCell(row, summaryStart + 3).value = 'I';
    ws.getCell(row, summaryStart + 4).value = 'A';

    for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(row, c);
        cell.font = headerStyle;
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = allBorders;
    }
    ws.getCell(row, 2).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(row).height = 18;
    row++;

    // Data rows
    const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4FA' } };

    pelajaranTeachers.forEach((teacher, idx) => {
        const isEven = idx % 2 === 1;
        ws.getCell(row, 1).value = idx + 1;
        ws.getCell(row, 1).font = { name: 'Arial', size: 8 };
        ws.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(row, 2).value = teacher.name;
        ws.getCell(row, 2).font = { name: 'Arial', size: 8 };
        ws.getCell(row, 2).alignment = { horizontal: 'left', vertical: 'middle' };

        const counts = { H: 0, T: 0, S: 0, I: 0, A: 0 };

        dates.forEach((date, di) => {
            const attendance = DataStore.getAttendance(date);
            const detail = getTeacherDayDetail(attendance, teacher.id);
            const cell = ws.getCell(row, 3 + di);
            cell.border = allBorders;
            if (isEven) cell.fill = evenFill;

            if (!detail) {
                // No attendance recorded — leave cell empty
                cell.value = '';
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                return;
            }

            const status = detail.status;
            let code = STATUS_CODES[status] || 'H';
            if (status === 'sakit' && detail.suratDokter) code = 'Sd';
            counts[STATUS_CODES[status] || 'H']++;

            cell.value = code;
            styleStatusCell(cell, code === 'Sd' ? 'S' : code);
        });

        // Summary columns
        ['H', 'T', 'S', 'I', 'A'].forEach((code, ci) => {
            const cell = ws.getCell(row, summaryStart + ci);
            cell.value = counts[code];
            cell.font = { name: 'Arial', size: 8, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = allBorders;
            if (isEven) cell.fill = evenFill;
        });

        // Apply borders to No and Name
        ws.getCell(row, 1).border = allBorders;
        ws.getCell(row, 2).border = allBorders;
        if (isEven) {
            ws.getCell(row, 1).fill = evenFill;
            ws.getCell(row, 2).fill = evenFill;
        }

        row++;
    });

    // Daily Notes section
    row++;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'CATATAN HARIAN';
    ws.getCell(row, 1).font = { name: 'Arial', size: 10, bold: true };
    ws.getCell(row, 1).alignment = { horizontal: 'left' };
    row++;

    const noteDates = dates.filter(d => {
        const att = DataStore.getAttendance(d);
        return att && att.notes && att.notes.trim();
    });

    if (noteDates.length === 0) {
        ws.mergeCells(row, 1, row, totalCols);
        ws.getCell(row, 1).value = '(Tidak ada catatan)';
        ws.getCell(row, 1).font = { name: 'Arial', size: 9, italic: true, color: { argb: '888888' } };
        row++;
    } else {
        noteDates.forEach(d => {
            const att = DataStore.getAttendance(d);
            ws.mergeCells(row, 1, row, 2);
            ws.getCell(row, 1).value = formatDateIndo(d);
            ws.getCell(row, 1).font = { name: 'Arial', size: 8, bold: true };
            ws.mergeCells(row, 3, row, totalCols);
            ws.getCell(row, 3).value = att.notes;
            ws.getCell(row, 3).font = { name: 'Arial', size: 8 };
            ws.getCell(row, 3).alignment = { wrapText: true };
            row++;
        });
    }

    // Legend
    row++;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'Keterangan: H = Hadir, T = Terlambat, S = Sakit, Sd = Sakit (Surat Dokter), I = Izin, A = Alfa';
    ws.getCell(row, 1).font = { name: 'Arial', size: 8, italic: true, color: { argb: '666666' } };
    row++;

    // Signature
    addSignature(ws, school, totalCols, row);

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Presensi_Guru_${startDate}_${endDate}.xlsx`;
    saveAs(blob, fileName);
}

// ========== 2. Semester Report ==========
export async function exportSemesterReport() {
    const school = DataStore.getSchool();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();
    const activeSemester = DataStore.getActiveSemester();

    if (!activeSemester) { alert('Belum ada semester aktif!'); return; }

    const pelajaranTeachers = teachers.filter(t => {
        const subs = (t.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
        return subs.length === 0 || subs.some(s => !s.type || s.type === 'pelajaran');
    });

    // Parse semester year range
    const yearParts = (activeSemester.year || '2025/2026').split('/');
    const year1 = parseInt(yearParts[0]) || 2025;
    const isSem1 = (activeSemester.semester || '').includes('1') || (activeSemester.semester || '').toLowerCase().includes('ganjil');

    // Generate 6 months for the semester
    const monthList = [];
    if (isSem1) {
        for (let m = 6; m <= 11; m++) monthList.push({ year: year1, month: m }); // Jul-Dec
    } else {
        for (let m = 0; m <= 5; m++) monthList.push({ year: year1 + 1, month: m }); // Jan-Jun
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    // No, Nama, 6 months × 5 statuses, Total 5 statuses, %
    const totalCols = 2 + monthList.length + 5 + 1;
    const ws = workbook.addWorksheet('Rekap Semester', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const cols = [{ width: 4 }, { width: 25 }];
    monthList.forEach(() => cols.push({ width: 7 }));
    ['H', 'T', 'S', 'I', 'A'].forEach(() => cols.push({ width: 5 }));
    cols.push({ width: 7 }); // %
    ws.columns = cols;

    let row = addKop(ws, school, totalCols);

    // Title
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'REKAP PRESENSI GURU PER SEMESTER';
    ws.getCell(row, 1).font = { name: 'Arial', size: 13, bold: true };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    ws.getRow(row).height = 22;
    row++;

    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `${activeSemester.name} — ${activeSemester.year} (${activeSemester.semester})`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 9, color: { argb: '555555' } };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    row += 2;

    // Header
    const headerStyle = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFF' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
    const thinBorder = { style: 'thin', color: { argb: '8DB4E2' } };
    const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    ws.getCell(row, 1).value = 'No';
    ws.getCell(row, 2).value = 'Nama Guru';
    monthList.forEach((m, i) => {
        ws.getCell(row, 3 + i).value = monthNames[m.month];
    });
    const sumStart = 3 + monthList.length;
    ['H', 'T', 'S', 'I', 'A'].forEach((lbl, i) => {
        ws.getCell(row, sumStart + i).value = lbl;
    });
    ws.getCell(row, sumStart + 5).value = '%';

    for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(row, c);
        cell.font = headerStyle;
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = allBorders;
    }
    ws.getCell(row, 2).alignment = { horizontal: 'left', vertical: 'middle' };
    row++;

    // Data
    const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4FA' } };

    pelajaranTeachers.forEach((teacher, idx) => {
        const isEven = idx % 2 === 1;
        ws.getCell(row, 1).value = idx + 1;
        ws.getCell(row, 1).font = { name: 'Arial', size: 8 };
        ws.getCell(row, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(row, 2).value = teacher.name;
        ws.getCell(row, 2).font = { name: 'Arial', size: 8 };

        const grandCounts = { H: 0, T: 0, S: 0, I: 0, A: 0 };
        let totalDays = 0;

        monthList.forEach((m, mi) => {
            const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
            const startD = `${m.year}-${String(m.month + 1).padStart(2, '0')}-01`;
            const endD = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            const dates = getDatesInRange(startD, endD);

            let monthHadir = 0;
            dates.forEach(date => {
                totalDays++;
                const att = DataStore.getAttendance(date);
                const status = getTeacherDayStatus(att, teacher.id);
                if (!status) return; // Not recorded — skip
                const code = STATUS_CODES[status] || 'H';
                grandCounts[code]++;
                if (code === 'H') monthHadir++;
            });

            const cell = ws.getCell(row, 3 + mi);
            cell.value = monthHadir;
            cell.font = { name: 'Arial', size: 8 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = allBorders;
            if (isEven) cell.fill = evenFill;
        });

        ['H', 'T', 'S', 'I', 'A'].forEach((code, ci) => {
            const cell = ws.getCell(row, sumStart + ci);
            cell.value = grandCounts[code];
            cell.font = { name: 'Arial', size: 8, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = allBorders;
            if (isEven) cell.fill = evenFill;
        });

        // Percentage
        const pct = totalDays > 0 ? Math.round(((grandCounts.H + grandCounts.T) / totalDays) * 100) : 0;
        const pctCell = ws.getCell(row, sumStart + 5);
        pctCell.value = `${pct}%`;
        pctCell.font = { name: 'Arial', size: 8, bold: true };
        pctCell.alignment = { horizontal: 'center', vertical: 'middle' };
        pctCell.border = allBorders;
        if (isEven) pctCell.fill = evenFill;

        ws.getCell(row, 1).border = allBorders;
        ws.getCell(row, 2).border = allBorders;
        if (isEven) { ws.getCell(row, 1).fill = evenFill; ws.getCell(row, 2).fill = evenFill; }

        row++;
    });

    // Legend
    row++;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'Keterangan: Kolom bulan = jumlah hari hadir. % = persentase kehadiran (Hadir + Terlambat).';
    ws.getCell(row, 1).font = { name: 'Arial', size: 8, italic: true, color: { argb: '666666' } };
    row++;

    addSignature(ws, school, totalCols, row);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Rekap_Semester_${activeSemester.name}.xlsx`);
}

// ========== 3. Per-Teacher Report ==========
export async function exportPerTeacherReport(teacherId, startDate, endDate) {
    const school = DataStore.getSchool();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();
    const classes = DataStore.getClasses();
    const activeSemester = DataStore.getActiveSemester();

    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) { alert('Guru tidak ditemukan!'); return; }

    const dates = getDatesInRange(startDate, endDate);
    if (dates.length === 0) { alert('Tidak ada hari sekolah dalam rentang tanggal ini.'); return; }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    const totalCols = 7; // No, Tanggal, Jam, Kelas, Mapel, Status, Keterangan
    const ws = workbook.addWorksheet(`Presensi ${teacher.name}`, {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    ws.columns = [
        { width: 4 },   // No
        { width: 20 },  // Tanggal
        { width: 14 },  // Jam
        { width: 10 },  // Kelas
        { width: 14 },  // Mapel
        { width: 10 },  // Status
        { width: 22 },  // Keterangan
    ];

    let row = addKop(ws, school, totalCols);

    // Title
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'LAPORAN PRESENSI GURU';
    ws.getCell(row, 1).font = { name: 'Arial', size: 13, bold: true };
    ws.getCell(row, 1).alignment = { horizontal: 'center' };
    ws.getRow(row).height = 22;
    row++;

    // Teacher info
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `Nama: ${teacher.name}`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 10 };
    row++;

    const teacherSubjects = (teacher.subjectIds || []).map(sid => {
        const s = subjects.find(x => x.id === sid);
        return s ? s.name : '';
    }).filter(Boolean).join(', ');
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `Mata Pelajaran: ${teacherSubjects || '-'}`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 9, color: { argb: '555555' } };
    row++;

    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `Periode: ${formatDateIndo(startDate)} — ${formatDateIndo(endDate)}`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 9, color: { argb: '555555' } };
    row += 2;

    // Header
    const headers = ['No', 'Tanggal', 'Jam', 'Kelas', 'Mapel', 'Status', 'Keterangan'];
    const headerStyle = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFF' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
    const thinBorder = { style: 'thin', color: { argb: '8DB4E2' } };
    const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    headers.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = h;
        cell.font = headerStyle;
        cell.fill = headerFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = allBorders;
    });
    row++;

    // Data: iterate dates, for each date show each teaching slot
    let num = 1;
    const evenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4FA' } };
    const counts = { H: 0, T: 0, S: 0, I: 0, A: 0 };

    dates.forEach(date => {
        const d = new Date(date + 'T00:00:00');
        const dayName = DAY_JS_MAP[d.getDay()];
        if (!SCHOOL_DAYS.includes(dayName)) return;

        const slots = DataStore.getKbmSlotsForDay(dayName);
        const attendance = DataStore.getAttendance(date);

        slots.forEach(slot => {
            if (slot.isBreak) return;

            classes.forEach(cls => {
                const entry = DataStore.getScheduleAt(dayName, slot.id, cls.id);
                if (!entry || entry.teacherId !== teacher.id) return;

                const subject = subjects.find(s => s.id === entry.subjectId);
                if (subject && subject.type && subject.type !== 'pelajaran') return;

                // Get per-slot attendance
                let status = null;
                let keterangan = '';
                if (attendance && attendance.entries) {
                    const attEntry = attendance.entries.find(
                        e => e.teacherId === teacher.id && e.kbmSlotId === slot.id && e.classId === cls.id
                    );
                    if (attEntry) {
                        status = attEntry.status || null;
                        const parts = [];
                        if (attEntry.suratDokter) parts.push('Surat Dokter');
                        if (attEntry.menitipkanTugas) parts.push('Menitipkan Tugas');
                        keterangan = parts.join(', ');
                    }
                }

                const code = status ? (STATUS_CODES[status] || '') : '';
                if (code) counts[code]++;

                const isEven = num % 2 === 0;
                ws.getCell(row, 1).value = num;
                ws.getCell(row, 2).value = formatDateIndo(date);
                ws.getCell(row, 3).value = `${slot.startTime}-${slot.endTime}`;
                ws.getCell(row, 4).value = cls.name;
                ws.getCell(row, 5).value = subject ? subject.code : '-';
                ws.getCell(row, 6).value = code || '';
                if (code) styleStatusCell(ws.getCell(row, 6), code);
                ws.getCell(row, 7).value = keterangan;

                for (let c = 1; c <= totalCols; c++) {
                    const cell = ws.getCell(row, c);
                    cell.border = allBorders;
                    if (!cell.font) cell.font = { name: 'Arial', size: 8 };
                    else cell.font = { ...cell.font, size: 8 };
                    if (c !== 6) cell.alignment = { horizontal: c <= 1 ? 'center' : 'left', vertical: 'middle' };
                    if (isEven) cell.fill = evenFill;
                }

                num++;
                row++;
            });
        });
    });

    // Summary
    row++;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `Ringkasan: Hadir=${counts.H}  Terlambat=${counts.T}  Sakit=${counts.S}  Izin=${counts.I}  Alfa=${counts.A}`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 9, bold: true };
    row++;

    const totalSlots = Object.values(counts).reduce((a, b) => a + b, 0);
    const pct = totalSlots > 0 ? Math.round(((counts.H + counts.T) / totalSlots) * 100) : 0;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = `Persentase Kehadiran: ${pct}%`;
    ws.getCell(row, 1).font = { name: 'Arial', size: 9, bold: true };
    row++;

    // Notes section
    row++;
    ws.mergeCells(row, 1, row, totalCols);
    ws.getCell(row, 1).value = 'CATATAN HARIAN';
    ws.getCell(row, 1).font = { name: 'Arial', size: 10, bold: true };
    row++;

    const noteDates = dates.filter(d => {
        const att = DataStore.getAttendance(d);
        return att && att.notes && att.notes.trim();
    });

    if (noteDates.length === 0) {
        ws.mergeCells(row, 1, row, totalCols);
        ws.getCell(row, 1).value = '(Tidak ada catatan)';
        ws.getCell(row, 1).font = { name: 'Arial', size: 9, italic: true, color: { argb: '888888' } };
        row++;
    } else {
        noteDates.forEach(d => {
            const att = DataStore.getAttendance(d);
            ws.mergeCells(row, 1, row, 2);
            ws.getCell(row, 1).value = formatDateIndo(d);
            ws.getCell(row, 1).font = { name: 'Arial', size: 8, bold: true };
            ws.mergeCells(row, 3, row, totalCols);
            ws.getCell(row, 3).value = att.notes;
            ws.getCell(row, 3).font = { name: 'Arial', size: 8 };
            ws.getCell(row, 3).alignment = { wrapText: true };
            row++;
        });
    }

    addSignature(ws, school, totalCols, row);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Presensi_${teacher.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`);
}
