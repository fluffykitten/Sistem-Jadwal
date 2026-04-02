// Excel Export utility using ExcelJS
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DataStore from '../dataStore.js';
import { getTeacherColorMap } from './teacherColors.js';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function exportScheduleToExcel() {
    const school = DataStore.getSchool();
    const activeSemester = DataStore.getActiveSemester();
    const classes = DataStore.getClasses();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();

    if (!activeSemester) {
        alert('Belum ada semester aktif!');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';
    workbook.created = new Date();

    // Colors
    const primaryColor = '4472C4';
    const headerBg = '2F5496';
    const lightBg = 'D6E4F0';
    const breakBg = 'FFF2CC';
    const borderColor = '8DB4E2';

    // Create one sheet per class
    for (const cls of classes) {
        const ws = workbook.addWorksheet(`Jadwal ${cls.name}`, {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
            }
        });

        // Set column widths
        ws.columns = [
            { width: 5 },   // A: No
            { width: 14 },  // B: Jam
            { width: 20 },  // C: Senin
            { width: 20 },  // D: Selasa
            { width: 20 },  // E: Rabu
            { width: 20 },  // F: Kamis
            { width: 20 },  // G: Jumat
            { width: 20 },  // H: Sabtu
        ];

        let row = 1;

        // ============ KOP SEKOLAH ============
        // School Name (large, centered, bold)
        ws.mergeCells(row, 1, row, 8);
        const nameCell = ws.getCell(row, 1);
        nameCell.value = (school.name || 'NAMA SEKOLAH').toUpperCase();
        nameCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '000000' } };
        nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(row).height = 26;
        row++;

        // Address
        ws.mergeCells(row, 1, row, 8);
        const addrCell = ws.getCell(row, 1);
        addrCell.value = school.address || 'Alamat Sekolah';
        addrCell.font = { name: 'Arial', size: 10, color: { argb: '333333' } };
        addrCell.alignment = { horizontal: 'center', vertical: 'middle' };
        row++;

        // NPSN + Phone + Email
        const infoLine = [
            school.npsn ? `NPSN: ${school.npsn}` : '',
            school.phone ? `Telp: ${school.phone}` : '',
            school.email || ''
        ].filter(Boolean).join('  |  ');
        if (infoLine) {
            ws.mergeCells(row, 1, row, 8);
            const infoCell = ws.getCell(row, 1);
            infoCell.value = infoLine;
            infoCell.font = { name: 'Arial', size: 9, color: { argb: '666666' } };
            infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
            row++;
        }

        // Divider line
        ws.mergeCells(row, 1, row, 8);
        const divCell = ws.getCell(row, 1);
        divCell.border = { bottom: { style: 'double', color: { argb: '000000' } } };
        ws.getRow(row).height = 6;
        row++;

        // Title
        row++;
        ws.mergeCells(row, 1, row, 8);
        const titleCell = ws.getCell(row, 1);
        titleCell.value = 'JADWAL PELAJARAN';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: headerBg } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(row).height = 22;
        row++;

        // Semester & Class info
        ws.mergeCells(row, 1, row, 8);
        const semCell = ws.getCell(row, 1);
        semCell.value = `${activeSemester.name} — Tahun Pelajaran ${activeSemester.year}  |  Kelas: ${cls.name}`;
        semCell.font = { name: 'Arial', size: 10, color: { argb: '333333' } };
        semCell.alignment = { horizontal: 'center', vertical: 'middle' };
        row++;
        row++;

        // ============ TABLE HEADER ============
        const headerRow = row;
        const headers = ['No', 'Jam', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        headers.forEach((h, i) => {
            const cell = ws.getCell(row, i + 1);
            cell.value = h;
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: borderColor } },
                bottom: { style: 'thin', color: { argb: borderColor } },
                left: { style: 'thin', color: { argb: borderColor } },
                right: { style: 'thin', color: { argb: borderColor } },
            };
        });
        ws.getRow(row).height = 22;
        row++;

        // ============ TABLE BODY ============
        // For each day, get slots from profile
        const daySlots = {};
        let maxSlots = 0;
        DAYS.forEach(day => {
            const slots = DataStore.getKbmSlotsForDay(day);
            daySlots[day] = slots;
            if (slots.length > maxSlots) maxSlots = slots.length;
        });

        // Build teacher color map
        const teacherColorMap = getTeacherColorMap(teachers);

        for (let idx = 0; idx < maxSlots; idx++) {
            // Find representative slot for label
            let slotLabel = '';
            let timeStr = '';
            let isBreak = false;
            for (const day of DAYS) {
                const slot = daySlots[day][idx];
                if (slot) {
                    slotLabel = slot.isBreak ? 'Istirahat' : slot.label;
                    timeStr = `${slot.startTime}-${slot.endTime}`;
                    isBreak = slot.isBreak;
                    break;
                }
            }

            const isEvenRow = idx % 2 === 0;
            const defaultRowBg = isBreak ? breakBg : (isEvenRow ? 'FFFFFF' : lightBg);

            // No
            const noCell = ws.getCell(row, 1);
            noCell.value = idx + 1;
            noCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Jam
            const jamCell = ws.getCell(row, 2);
            jamCell.value = isBreak ? `☕ ${slotLabel}` : `${slotLabel}\n${timeStr}`;
            jamCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            jamCell.font = { name: 'Arial', size: 9, bold: isBreak };

            // Day columns
            DAYS.forEach((day, di) => {
                const cell = ws.getCell(row, di + 3);
                const slot = daySlots[day][idx];

                if (!slot) {
                    cell.value = '-';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (slot.isBreak) {
                    cell.value = '';
                } else {
                    const entry = DataStore.getScheduleAt(day, slot.id, cls.id);
                    if (entry) {
                        const teacher = teachers.find(t => t.id === entry.teacherId);
                        const subject = subjects.find(s => s.id === entry.subjectId);
                        cell.value = `${subject ? subject.code : ''}\n${teacher ? teacher.name : ''}`;
                        // Apply teacher color
                        const tc = teacher ? teacherColorMap.get(teacher.id) : null;
                        if (tc) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tc.excelBg } };
                            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: tc.excelText } };
                        } else {
                            cell.font = { name: 'Arial', size: 9 };
                        }
                    } else {
                        cell.value = '';
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                }
            });

            // Apply border styling to all cells in row (fill only if not already set by teacher color)
            for (let c = 1; c <= 8; c++) {
                const cell = ws.getCell(row, c);
                if (!cell.fill || !cell.fill.fgColor) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultRowBg } };
                }
                cell.border = {
                    top: { style: 'thin', color: { argb: borderColor } },
                    bottom: { style: 'thin', color: { argb: borderColor } },
                    left: { style: 'thin', color: { argb: borderColor } },
                    right: { style: 'thin', color: { argb: borderColor } },
                };
                if (!cell.font) cell.font = { name: 'Arial', size: 9 };
            }

            ws.getRow(row).height = isBreak ? 18 : 30;
            row++;
        }

        // ============ TTD SECTION ============
        row += 2;

        // Date line
        ws.mergeCells(row, 5, row, 8);
        const dateCell = ws.getCell(row, 5);
        const now = new Date();
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        dateCell.value = `.................., ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        dateCell.font = { name: 'Arial', size: 10 };
        dateCell.alignment = { horizontal: 'center' };
        row++;

        // Titles
        row++;
        // Kepala Sekolah (left)
        ws.mergeCells(row, 1, row, 4);
        const kepsekTitle = ws.getCell(row, 1);
        kepsekTitle.value = 'Kepala Sekolah';
        kepsekTitle.font = { name: 'Arial', size: 10, bold: true };
        kepsekTitle.alignment = { horizontal: 'center' };

        // Wakasek Kurikulum (right)
        ws.mergeCells(row, 5, row, 8);
        const wakasekTitle = ws.getCell(row, 5);
        wakasekTitle.value = 'Wakil Kepala Sekolah\nBagian Kurikulum';
        wakasekTitle.font = { name: 'Arial', size: 10, bold: true };
        wakasekTitle.alignment = { horizontal: 'center', wrapText: true };
        ws.getRow(row).height = 30;
        row++;

        // Spacing for signature
        row += 3;

        // Names with underline
        ws.mergeCells(row, 1, row, 4);
        const kepsekName = ws.getCell(row, 1);
        kepsekName.value = school.principal || '..............................';
        kepsekName.font = { name: 'Arial', size: 10, bold: true, underline: true };
        kepsekName.alignment = { horizontal: 'center' };

        ws.mergeCells(row, 5, row, 8);
        const wakasekName = ws.getCell(row, 5);
        wakasekName.value = school.vicePrincipal || '..............................';
        wakasekName.font = { name: 'Arial', size: 10, bold: true, underline: true };
        wakasekName.alignment = { horizontal: 'center' };
        row++;

        // NIP lines
        ws.mergeCells(row, 1, row, 4);
        const nipKepsek = ws.getCell(row, 1);
        nipKepsek.value = 'NIP. ..............................';
        nipKepsek.font = { name: 'Arial', size: 9, color: { argb: '666666' } };
        nipKepsek.alignment = { horizontal: 'center' };

        ws.mergeCells(row, 5, row, 8);
        const nipWakasek = ws.getCell(row, 5);
        nipWakasek.value = 'NIP. ..............................';
        nipWakasek.font = { name: 'Arial', size: 9, color: { argb: '666666' } };
        nipWakasek.alignment = { horizontal: 'center' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const semName = (activeSemester.name || 'Semester').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const filename = `Jadwal_${schoolName}_${semName}.xlsx`;

    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

// ============================================================
// Export Full Schedule (all classes in one table)
// ============================================================

function generateTeacherInitials(teachers, subjects) {
    const initialsMap = new Map();
    const usedInitials = new Set();

    teachers.forEach(t => {
        const parts = t.name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).filter(Boolean);

        // Natural initials: first letter of first name + first letter of second name
        let naturalInitials;
        if (parts.length >= 2) {
            naturalInitials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1) {
            naturalInitials = parts[0].substring(0, 2).toUpperCase();
        } else {
            naturalInitials = 'XX';
        }

        let initials = naturalInitials;

        // If natural initials already taken, find alternative
        if (usedInitials.has(initials)) {
            let resolved = false;

            // Strategy 1: first letter of first name + first letter of each other word
            // e.g. "Mutiara Fahma Nagari" with MN taken → try MF
            for (let w = 1; w < parts.length && !resolved; w++) {
                const candidate = (parts[0][0] + parts[w][0]).toUpperCase();
                if (candidate !== initials && !usedInitials.has(candidate)) {
                    initials = candidate;
                    resolved = true;
                }
            }

            // Strategy 2: first letter of first name + deeper letters from words (last name first)
            // e.g. "Salman Madani" with SM taken → try SA (S + mAdani[1])
            if (!resolved) {
                for (let w = parts.length - 1; w >= 0 && !resolved; w--) {
                    for (let c = 1; c < parts[w].length && !resolved; c++) {
                        const candidate = (parts[0][0] + parts[w][c]).toUpperCase();
                        if (!usedInitials.has(candidate)) {
                            initials = candidate;
                            resolved = true;
                        }
                    }
                }
            }

            // Strategy 3: brute force from all name letters
            if (!resolved) {
                const allLetters = parts.join('').toUpperCase();
                for (let i = 0; i < allLetters.length && !resolved; i++) {
                    for (let j = 0; j < allLetters.length && !resolved; j++) {
                        if (i === j) continue;
                        const candidate = allLetters[i] + allLetters[j];
                        if (!usedInitials.has(candidate)) {
                            initials = candidate;
                            resolved = true;
                        }
                    }
                }
            }
        }

        usedInitials.add(initials);

        // Get subject names
        const subjNames = (t.subjectIds || []).map(sid => {
            const s = subjects.find(x => x.id === sid);
            return s ? s.name : '';
        }).filter(Boolean).join(', ');

        initialsMap.set(t.id, { initials, name: t.name, subjects: subjNames });
    });

    return initialsMap;
}

export async function exportFullScheduleToExcel() {
    const school = DataStore.getSchool();
    const activeSemester = DataStore.getActiveSemester();
    const classes = DataStore.getClasses();
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();

    if (!activeSemester) {
        alert('Belum ada semester aktif!');
        return;
    }
    if (classes.length === 0) {
        alert('Belum ada data kelas!');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';
    workbook.created = new Date();

    // Colors
    const headerBg = '2F5496';
    const dayHeaderBg = '375F9F';
    const lightBg = 'D6E4F0';
    const breakBg = 'FFF2CC';
    const borderColor = '8DB4E2';
    const legendHeaderBg = '4472C4';

    // Generate teacher initials
    const teacherInitials = generateTeacherInitials(teachers, subjects);

    // Gather day slots
    const daySlots = {};
    DAYS.forEach(day => {
        daySlots[day] = DataStore.getKbmSlotsForDay(day);
    });

    // Calculate total data columns: Hari + No + Jam + (classes)
    const totalClassCols = classes.length;
    const fixedCols = 3; // Hari, No, Jam
    const totalTableCols = fixedCols + totalClassCols;

    // Legend will go to the right, starting from column totalTableCols + 2
    const legendStartCol = totalTableCols + 2;
    const legendEndCol = legendStartCol + 2; // Kode, Nama, Mapel

    const ws = workbook.addWorksheet('Jadwal Lengkap', {
        pageSetup: {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
        }
    });

    // Set column widths
    const colWidths = [
        { width: 10 },  // A: Hari
        { width: 5 },   // B: No
        { width: 13 },  // C: Jam
    ];
    for (let i = 0; i < totalClassCols; i++) {
        colWidths.push({ width: 12 }); // Class columns
    }
    // Gap column
    colWidths.push({ width: 2 });
    // Legend columns
    colWidths.push({ width: 7 });  // Kode
    colWidths.push({ width: 25 }); // Nama Guru
    colWidths.push({ width: 22 }); // Mata Pelajaran
    ws.columns = colWidths;

    let row = 1;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // ============ KOP SEKOLAH ============
    ws.mergeCells(row, 1, row, totalTableCols);
    const nameCell = ws.getCell(row, 1);
    nameCell.value = (school.name || 'NAMA SEKOLAH').toUpperCase();
    nameCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '000000' } };
    nameCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 24;
    row++;

    // Address
    ws.mergeCells(row, 1, row, totalTableCols);
    const addrCell = ws.getCell(row, 1);
    addrCell.value = school.address || 'Alamat Sekolah';
    addrCell.font = { name: 'Arial', size: 9, color: { argb: '333333' } };
    addrCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;

    // NPSN + Phone + Email
    const infoLine = [
        school.npsn ? `NPSN: ${school.npsn}` : '',
        school.phone ? `Telp: ${school.phone}` : '',
        school.email || ''
    ].filter(Boolean).join('  |  ');
    if (infoLine) {
        ws.mergeCells(row, 1, row, totalTableCols);
        const infoCell = ws.getCell(row, 1);
        infoCell.value = infoLine;
        infoCell.font = { name: 'Arial', size: 8, color: { argb: '666666' } };
        infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
        row++;
    }

    // Divider
    ws.mergeCells(row, 1, row, totalTableCols);
    ws.getCell(row, 1).border = { bottom: { style: 'double', color: { argb: '000000' } } };
    ws.getRow(row).height = 6;
    row++;

    // Title
    row++;
    ws.mergeCells(row, 1, row, totalTableCols);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = 'JADWAL PELAJARAN SELURUH KELAS';
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 22;
    row++;

    // Semester info
    ws.mergeCells(row, 1, row, totalTableCols);
    const semCell = ws.getCell(row, 1);
    semCell.value = `${activeSemester.name} — Tahun Pelajaran ${activeSemester.year}`;
    semCell.font = { name: 'Arial', size: 9, color: { argb: '333333' } };
    semCell.alignment = { horizontal: 'center', vertical: 'middle' };
    row++;
    row++;

    const tableStartRow = row;

    // ============ TABLE HEADER ============
    const headerRow = row;
    const headers = ['Hari', 'No', 'Jam'];
    classes.forEach(c => headers.push(c.name));

    headers.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: borderColor } },
            bottom: { style: 'thin', color: { argb: borderColor } },
            left: { style: 'thin', color: { argb: borderColor } },
            right: { style: 'thin', color: { argb: borderColor } },
        };
    });
    ws.getRow(row).height = 22;
    row++;

    // ============ LEGEND HEADER (right side, at same row as table header) ============
    const legendTitleRow = headerRow - 1;
    ws.mergeCells(legendTitleRow, legendStartCol, legendTitleRow, legendEndCol);
    const legendTitle = ws.getCell(legendTitleRow, legendStartCol);
    legendTitle.value = '📋 LEGENDA GURU';
    legendTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: headerBg } };
    legendTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const legendHeaders = ['Kode', 'Nama Guru', 'Mata Pelajaran'];
    legendHeaders.forEach((h, i) => {
        const cell = ws.getCell(headerRow, legendStartCol + i);
        cell.value = h;
        cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: legendHeaderBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: borderColor } },
            bottom: { style: 'thin', color: { argb: borderColor } },
            left: { style: 'thin', color: { argb: borderColor } },
            right: { style: 'thin', color: { argb: borderColor } },
        };
    });

    // ============ LEGEND DATA (right side) ============
    let legendRow = headerRow + 1;
    const sortedTeachers = [...teacherInitials.entries()].sort((a, b) => a[1].initials.localeCompare(b[1].initials));
    sortedTeachers.forEach(([tid, info], idx) => {
        const isEven = idx % 2 === 0;
        const rowBg = isEven ? 'FFFFFF' : 'EBF1F8';
        const codeCell = ws.getCell(legendRow, legendStartCol);
        codeCell.value = info.initials;
        codeCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: headerBg } };
        codeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        codeCell.alignment = { horizontal: 'center', vertical: 'middle' };
        codeCell.border = { top: { style: 'thin', color: { argb: borderColor } }, bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'thin', color: { argb: borderColor } }, right: { style: 'thin', color: { argb: borderColor } } };

        const nameCell = ws.getCell(legendRow, legendStartCol + 1);
        nameCell.value = info.name;
        nameCell.font = { name: 'Arial', size: 8 };
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        nameCell.alignment = { vertical: 'middle' };
        nameCell.border = { top: { style: 'thin', color: { argb: borderColor } }, bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'thin', color: { argb: borderColor } }, right: { style: 'thin', color: { argb: borderColor } } };

        const subjCell = ws.getCell(legendRow, legendStartCol + 2);
        subjCell.value = info.subjects || '-';
        subjCell.font = { name: 'Arial', size: 8, color: { argb: '555555' } };
        subjCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        subjCell.alignment = { vertical: 'middle', wrapText: true };
        subjCell.border = { top: { style: 'thin', color: { argb: borderColor } }, bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'thin', color: { argb: borderColor } }, right: { style: 'thin', color: { argb: borderColor } } };

        legendRow++;
    });

    // ============ TABLE BODY ============
    DAYS.forEach(day => {
        const slots = daySlots[day];
        if (slots.length === 0) return;

        const dayStartRow = row;

        slots.forEach((slot, idx) => {
            const isBreak = slot.isBreak;
            const isEvenRow = idx % 2 === 0;
            const defaultRowBg = isBreak ? breakBg : (isEvenRow ? 'FFFFFF' : lightBg);

            // Hari (only first row of each day group, will merge later)
            // No
            const noCell = ws.getCell(row, 2);
            noCell.value = isBreak ? '' : slot.label;
            noCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Jam
            const jamCell = ws.getCell(row, 3);
            jamCell.value = isBreak ? `☕ Istirahat` : `${slot.startTime}-${slot.endTime}`;
            jamCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            jamCell.font = { name: 'Arial', size: 8, bold: isBreak };

            // Class columns
            classes.forEach((cls, ci) => {
                const cell = ws.getCell(row, fixedCols + ci + 1);
                if (isBreak) {
                    cell.value = '';
                } else {
                    const entry = DataStore.getScheduleAt(day, slot.id, cls.id);
                    if (entry) {
                        const subject = subjects.find(s => s.id === entry.subjectId);
                        const subCode = subject ? subject.code : '?';
                        if (entry.teacherId) {
                            const tInfo = teacherInitials.get(entry.teacherId);
                            cell.value = `${subCode}\n(${tInfo ? tInfo.initials : '?'})`;
                        } else {
                            // Non-pelajaran without teacher
                            const isNonPelajaran = subject && subject.type && subject.type !== 'pelajaran';
                            cell.value = isNonPelajaran ? subCode : `${subCode}`;
                        }
                    } else {
                        cell.value = '';
                    }
                }
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.font = { name: 'Arial', size: 8 };
            });

            // Apply styles to all cells in row
            for (let c = 1; c <= totalTableCols; c++) {
                const cell = ws.getCell(row, c);
                if (!cell.fill || !cell.fill.fgColor) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultRowBg } };
                }
                cell.border = {
                    top: { style: 'thin', color: { argb: borderColor } },
                    bottom: { style: 'thin', color: { argb: borderColor } },
                    left: { style: 'thin', color: { argb: borderColor } },
                    right: { style: 'thin', color: { argb: borderColor } },
                };
                if (!cell.font) cell.font = { name: 'Arial', size: 8 };
            }

            ws.getRow(row).height = isBreak ? 16 : 28;
            row++;
        });

        const dayEndRow = row - 1;

        // Merge Hari column for this day group
        if (dayEndRow >= dayStartRow) {
            ws.mergeCells(dayStartRow, 1, dayEndRow, 1);
            const dayCell = ws.getCell(dayStartRow, 1);
            dayCell.value = day.toUpperCase();
            dayCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
            dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: dayHeaderBg } };
            dayCell.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
            dayCell.border = {
                top: { style: 'thin', color: { argb: borderColor } },
                bottom: { style: 'thin', color: { argb: borderColor } },
                left: { style: 'thin', color: { argb: borderColor } },
                right: { style: 'thin', color: { argb: borderColor } },
            };
        }
    });

    // ============ TTD SECTION ============
    row += 2;

    // Date line (right side)
    const ttdColStart = Math.max(Math.floor(totalTableCols / 2) + 1, 3);
    const ttdColMid = Math.floor((1 + ttdColStart - 1) / 2) + 1;
    ws.mergeCells(row, ttdColStart, row, totalTableCols);
    const dateCell = ws.getCell(row, ttdColStart);
    const now = new Date();
    dateCell.value = `.................., ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    dateCell.font = { name: 'Arial', size: 10 };
    dateCell.alignment = { horizontal: 'center' };
    row++;

    // Titles
    row++;
    // Kepala Sekolah (left)
    ws.mergeCells(row, 1, row, ttdColStart - 1);
    const kepsekTitle = ws.getCell(row, 1);
    kepsekTitle.value = 'Kepala Sekolah';
    kepsekTitle.font = { name: 'Arial', size: 10, bold: true };
    kepsekTitle.alignment = { horizontal: 'center' };

    // Wakasek Kurikulum (right)
    ws.mergeCells(row, ttdColStart, row, totalTableCols);
    const wakasekTitle = ws.getCell(row, ttdColStart);
    wakasekTitle.value = 'Wakil Kepala Sekolah\nBagian Kurikulum';
    wakasekTitle.font = { name: 'Arial', size: 10, bold: true };
    wakasekTitle.alignment = { horizontal: 'center', wrapText: true };
    ws.getRow(row).height = 30;
    row++;

    // Spacing for signature
    row += 3;

    // Names with underline
    ws.mergeCells(row, 1, row, ttdColStart - 1);
    const kepsekName = ws.getCell(row, 1);
    kepsekName.value = school.principal || '..............................';
    kepsekName.font = { name: 'Arial', size: 10, bold: true, underline: true };
    kepsekName.alignment = { horizontal: 'center' };

    ws.mergeCells(row, ttdColStart, row, totalTableCols);
    const wakasekName = ws.getCell(row, ttdColStart);
    wakasekName.value = school.vicePrincipal || '..............................';
    wakasekName.font = { name: 'Arial', size: 10, bold: true, underline: true };
    wakasekName.alignment = { horizontal: 'center' };
    row++;

    // NIP lines
    ws.mergeCells(row, 1, row, ttdColStart - 1);
    const nipKepsek = ws.getCell(row, 1);
    nipKepsek.value = 'NIP. ..............................';
    nipKepsek.font = { name: 'Arial', size: 9, color: { argb: '666666' } };
    nipKepsek.alignment = { horizontal: 'center' };

    ws.mergeCells(row, ttdColStart, row, totalTableCols);
    const nipWakasek = ws.getCell(row, ttdColStart);
    nipWakasek.value = 'NIP. ..............................';
    nipWakasek.font = { name: 'Arial', size: 9, color: { argb: '666666' } };
    nipWakasek.alignment = { horizontal: 'center' };

    // ============ ALSO ADD PER-CLASS SHEETS ============
    const teacherColorMap = getTeacherColorMap(teachers);

    for (const cls of classes) {
        const wsClass = workbook.addWorksheet(`Jadwal ${cls.name}`, {
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
            }
        });

        wsClass.columns = [
            { width: 5 }, { width: 14 },
            { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
        ];

        let cRow = 1;

        // KOP
        wsClass.mergeCells(cRow, 1, cRow, 8);
        wsClass.getCell(cRow, 1).value = (school.name || 'NAMA SEKOLAH').toUpperCase();
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 16, bold: true };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsClass.getRow(cRow).height = 26;
        cRow++;

        wsClass.mergeCells(cRow, 1, cRow, 8);
        wsClass.getCell(cRow, 1).value = school.address || 'Alamat Sekolah';
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 10, color: { argb: '333333' } };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        cRow++;

        const classInfoLine = [
            school.npsn ? `NPSN: ${school.npsn}` : '',
            school.phone ? `Telp: ${school.phone}` : '',
            school.email || ''
        ].filter(Boolean).join('  |  ');
        if (classInfoLine) {
            wsClass.mergeCells(cRow, 1, cRow, 8);
            wsClass.getCell(cRow, 1).value = classInfoLine;
            wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 9, color: { argb: '666666' } };
            wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
            cRow++;
        }

        wsClass.mergeCells(cRow, 1, cRow, 8);
        wsClass.getCell(cRow, 1).border = { bottom: { style: 'double', color: { argb: '000000' } } };
        wsClass.getRow(cRow).height = 6;
        cRow++;

        cRow++;
        wsClass.mergeCells(cRow, 1, cRow, 8);
        wsClass.getCell(cRow, 1).value = 'JADWAL PELAJARAN';
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 14, bold: true, color: { argb: headerBg } };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        wsClass.getRow(cRow).height = 22;
        cRow++;

        wsClass.mergeCells(cRow, 1, cRow, 8);
        wsClass.getCell(cRow, 1).value = `${activeSemester.name} — Tahun Pelajaran ${activeSemester.year}  |  Kelas: ${cls.name}`;
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 10, color: { argb: '333333' } };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
        cRow++;
        cRow++;

        // Header
        const classHeaders = ['No', 'Jam', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        classHeaders.forEach((h, i) => {
            const cell = wsClass.getCell(cRow, i + 1);
            cell.value = h;
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin', color: { argb: borderColor } }, bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'thin', color: { argb: borderColor } }, right: { style: 'thin', color: { argb: borderColor } } };
        });
        wsClass.getRow(cRow).height = 22;
        cRow++;

        // Body
        const classDaySlots = {};
        let classMaxSlots = 0;
        DAYS.forEach(d => {
            const s = DataStore.getKbmSlotsForDay(d);
            classDaySlots[d] = s;
            if (s.length > classMaxSlots) classMaxSlots = s.length;
        });

        for (let idx = 0; idx < classMaxSlots; idx++) {
            let slotLabel = '', timeStr = '', isBreak = false;
            for (const d of DAYS) {
                const slot = classDaySlots[d][idx];
                if (slot) {
                    slotLabel = slot.isBreak ? 'Istirahat' : slot.label;
                    timeStr = `${slot.startTime}-${slot.endTime}`;
                    isBreak = slot.isBreak;
                    break;
                }
            }

            const isEvenRow = idx % 2 === 0;
            const defaultBg = isBreak ? breakBg : (isEvenRow ? 'FFFFFF' : lightBg);

            wsClass.getCell(cRow, 1).value = idx + 1;
            wsClass.getCell(cRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

            wsClass.getCell(cRow, 2).value = isBreak ? `☕ ${slotLabel}` : `${slotLabel}\n${timeStr}`;
            wsClass.getCell(cRow, 2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            wsClass.getCell(cRow, 2).font = { name: 'Arial', size: 9, bold: isBreak };

            DAYS.forEach((d, di) => {
                const cell = wsClass.getCell(cRow, di + 3);
                const slot = classDaySlots[d][idx];
                if (!slot) {
                    cell.value = '-';
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (slot.isBreak) {
                    cell.value = '';
                } else {
                    const entry = DataStore.getScheduleAt(d, slot.id, cls.id);
                    if (entry) {
                        const teacher = teachers.find(t => t.id === entry.teacherId);
                        const subject = subjects.find(s => s.id === entry.subjectId);
                        cell.value = `${subject ? subject.code : ''}\n${teacher ? teacher.name : ''}`;
                        const tc = teacher ? teacherColorMap.get(teacher.id) : null;
                        if (tc) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tc.excelBg } };
                            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: tc.excelText } };
                        } else {
                            cell.font = { name: 'Arial', size: 9 };
                        }
                    } else {
                        cell.value = '';
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                }
            });

            for (let c = 1; c <= 8; c++) {
                const cell = wsClass.getCell(cRow, c);
                if (!cell.fill || !cell.fill.fgColor) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } };
                }
                cell.border = { top: { style: 'thin', color: { argb: borderColor } }, bottom: { style: 'thin', color: { argb: borderColor } }, left: { style: 'thin', color: { argb: borderColor } }, right: { style: 'thin', color: { argb: borderColor } } };
                if (!cell.font) cell.font = { name: 'Arial', size: 9 };
            }
            wsClass.getRow(cRow).height = isBreak ? 18 : 30;
            cRow++;
        }

        // TTD
        cRow += 2;
        wsClass.mergeCells(cRow, 5, cRow, 8);
        const cDateCell = wsClass.getCell(cRow, 5);
        cDateCell.value = `.................., ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        cDateCell.font = { name: 'Arial', size: 10 };
        cDateCell.alignment = { horizontal: 'center' };
        cRow++;

        cRow++;
        // Kepala Sekolah (left)
        wsClass.mergeCells(cRow, 1, cRow, 4);
        wsClass.getCell(cRow, 1).value = 'Kepala Sekolah';
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 10, bold: true };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center' };

        // Wakasek Kurikulum (right)
        wsClass.mergeCells(cRow, 5, cRow, 8);
        wsClass.getCell(cRow, 5).value = 'Wakil Kepala Sekolah\nBagian Kurikulum';
        wsClass.getCell(cRow, 5).font = { name: 'Arial', size: 10, bold: true };
        wsClass.getCell(cRow, 5).alignment = { horizontal: 'center', wrapText: true };
        wsClass.getRow(cRow).height = 30;
        cRow++;

        cRow += 3;
        // Kepala Sekolah name
        wsClass.mergeCells(cRow, 1, cRow, 4);
        wsClass.getCell(cRow, 1).value = school.principal || '..............................';
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 10, bold: true, underline: true };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center' };

        // Wakasek name
        wsClass.mergeCells(cRow, 5, cRow, 8);
        wsClass.getCell(cRow, 5).value = school.vicePrincipal || '..............................';
        wsClass.getCell(cRow, 5).font = { name: 'Arial', size: 10, bold: true, underline: true };
        wsClass.getCell(cRow, 5).alignment = { horizontal: 'center' };
        cRow++;

        // NIP lines
        wsClass.mergeCells(cRow, 1, cRow, 4);
        wsClass.getCell(cRow, 1).value = 'NIP. ..............................';
        wsClass.getCell(cRow, 1).font = { name: 'Arial', size: 9, color: { argb: '666666' } };
        wsClass.getCell(cRow, 1).alignment = { horizontal: 'center' };

        wsClass.mergeCells(cRow, 5, cRow, 8);
        wsClass.getCell(cRow, 5).value = 'NIP. ..............................';
        wsClass.getCell(cRow, 5).font = { name: 'Arial', size: 9, color: { argb: '666666' } };
        wsClass.getCell(cRow, 5).alignment = { horizontal: 'center' };
    }

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const semName = (activeSemester.name || 'Semester').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const filename = `Jadwal_Lengkap_${schoolName}_${semName}.xlsx`;

    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export async function generateStudentAttendanceReport(month, year) {
    const school = DataStore.getSchool();
    const classes = DataStore.getClasses();
    const students = DataStore.getStudents();
    const allAttendance = DataStore.getStudentAttendance();

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = months[month] || 'Unknown';

    // Filter attendance to selected month/year
    const attendance = allAttendance.filter(a => {
        const [y, m] = a.date.split('-').map(Number);
        return y === year && (m - 1) === month;
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Jadwal Sekolah';

    if (classes.length === 0 || students.length === 0) {
        alert("Belum ada data kelas atau siswa.");
        return;
    }

    // ---- Sheet 1: Ringkasan Sekolah ----
    const wsSummary = workbook.addWorksheet('Ringkasan', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    wsSummary.columns = [
        { width: 25 }, { width: 15 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 15 }
    ];

    let sRow = 1;
    wsSummary.mergeCells(sRow, 1, sRow, 7);
    const titleCell = wsSummary.getCell(sRow, 1);
    titleCell.value = 'REKAPITULASI KEHADIRAN SISWA';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };
    sRow++;
    wsSummary.mergeCells(sRow, 1, sRow, 7);
    const schoolCell = wsSummary.getCell(sRow, 1);
    schoolCell.value = `${school.name || 'Sekolah'} — ${monthName} ${year}`;
    schoolCell.font = { size: 12 };
    schoolCell.alignment = { horizontal: 'center' };
    sRow += 2;

    let totalH = 0, totalT = 0, totalS = 0, totalI = 0, totalA = 0;
    attendance.forEach(a => {
        if (a.status === 'hadir') totalH++;
        else if (a.status === 'terlambat') totalT++;
        else if (a.status === 'sakit') totalS++;
        else if (a.status === 'izin') totalI++;
        else if (a.status === 'alfa') totalA++;
    });
    const totalRecords = totalH + totalT + totalS + totalI + totalA;
    const avgPct = totalRecords > 0 ? Math.round(((totalH + totalT) / totalRecords) * 1000) / 10 : 0;

    wsSummary.getCell(sRow, 1).value = 'Total Siswa:';
    wsSummary.getCell(sRow, 2).value = students.length;
    wsSummary.getCell(sRow, 1).font = { bold: true };
    sRow++;
    wsSummary.getCell(sRow, 1).value = 'Rata-rata Kehadiran:';
    wsSummary.getCell(sRow, 2).value = avgPct + '%';
    wsSummary.getCell(sRow, 1).font = { bold: true };
    sRow += 2;

    const classHeaders = ['Kelas', 'Jml Siswa', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', '% Kehadiran'];
    classHeaders.forEach((h, idx) => {
        const cell = wsSummary.getCell(sRow, idx + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    sRow++;

    for (const cls of classes) {
        const classStudents = students.filter(s => s.classId === cls.id);
        if (classStudents.length === 0) continue;
        const classStudentIds = new Set(classStudents.map(s => s.id));
        const classAtt = attendance.filter(a => classStudentIds.has(a.studentId));
        let ch = 0, ct = 0, cs = 0, ci = 0, ca = 0;
        classAtt.forEach(a => {
            if (a.status === 'hadir') ch++;
            else if (a.status === 'terlambat') ct++;
            else if (a.status === 'sakit') cs++;
            else if (a.status === 'izin') ci++;
            else if (a.status === 'alfa') ca++;
        });
        const cTotal = ch + ct + cs + ci + ca;
        const cPct = cTotal > 0 ? Math.round(((ch + ct) / cTotal) * 1000) / 10 : 0;
        wsSummary.getCell(sRow, 1).value = cls.name;
        wsSummary.getCell(sRow, 2).value = classStudents.length;
        wsSummary.getCell(sRow, 3).value = ch;
        wsSummary.getCell(sRow, 4).value = ct;
        wsSummary.getCell(sRow, 5).value = cs;
        wsSummary.getCell(sRow, 6).value = ci;
        wsSummary.getCell(sRow, 7).value = ca;
        wsSummary.getCell(sRow, 8).value = cPct + '%';
        for (let c = 1; c <= 8; c++) {
            wsSummary.getCell(sRow, c).alignment = { horizontal: 'center' };
            wsSummary.getCell(sRow, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        wsSummary.getCell(sRow, 1).alignment = { horizontal: 'left' };
        sRow++;
    }

    // ---- Sheet 2-N: Rekap Per Kelas (Matriks) ----
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (const cls of classes) {
        const classStudents = students.filter(s => s.classId === cls.id).sort((a, b) => a.name.localeCompare(b.name));
        if (classStudents.length === 0) continue;

        const ws = workbook.addWorksheet(`Kelas ${cls.name}`, {
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });
        const totalCols = 4 + daysInMonth + 5;
        const cols = [{ width: 5 }, { width: 30 }, { width: 15 }, { width: 5 }];
        for (let i = 1; i <= daysInMonth; i++) cols.push({ width: 3.5 });
        cols.push({ width: 5 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 });
        ws.columns = cols;

        let row = 1;
        ws.mergeCells(row, 1, row, totalCols);
        ws.getCell(row, 1).value = school.name || 'Sekolah';
        ws.getCell(row, 1).font = { bold: true, size: 12 };
        ws.getCell(row, 1).alignment = { horizontal: 'center' };
        row++;
        ws.mergeCells(row, 1, row, totalCols);
        ws.getCell(row, 1).value = `REKAPITULASI PRESENSI SISWA — KELAS ${cls.name} — ${monthName} ${year}`;
        ws.getCell(row, 1).font = { bold: true, size: 11 };
        ws.getCell(row, 1).alignment = { horizontal: 'center' };
        row += 2;

        ws.getCell(row, 1).value = 'No';
        ws.getCell(row, 2).value = 'Nama Lengkap';
        ws.getCell(row, 3).value = 'NISN';
        ws.getCell(row, 4).value = 'L/P';
        for (let i = 1; i <= daysInMonth; i++) ws.getCell(row, 4 + i).value = i;
        const rekapStart = 4 + daysInMonth + 1;
        ws.getCell(row, rekapStart).value = 'H';
        ws.getCell(row, rekapStart + 1).value = 'T';
        ws.getCell(row, rekapStart + 2).value = 'S';
        ws.getCell(row, rekapStart + 3).value = 'I';
        ws.getCell(row, rekapStart + 4).value = 'A';
        for (let c = 1; c <= totalCols; c++) {
            const cell = ws.getCell(row, c);
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5496' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }
        row++;

        classStudents.forEach((student, index) => {
            ws.getCell(row, 1).value = index + 1;
            ws.getCell(row, 2).value = student.name;
            ws.getCell(row, 3).value = student.nisn || '-';
            ws.getCell(row, 4).value = student.gender || '-';
            let h = 0, t = 0, s = 0, iStat = 0, a = 0;
            const studentAtt = attendance.filter(att => att.studentId === student.id);
            const statusDisplayMap = { 'hadir': 'H', 'terlambat': 'T', 'sakit': 'S', 'izin': 'I', 'alfa': 'A' };
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = d.toString().padStart(2, '0');
                const monthStr = (month + 1).toString().padStart(2, '0');
                const dateStr = `${year}-${monthStr}-${dayStr}`;
                const record = studentAtt.find(att => att.date === dateStr);
                let statusVal = '';
                if (record) {
                    statusVal = statusDisplayMap[record.status] || record.status;
                    if (record.status === 'hadir') h++;
                    else if (record.status === 'terlambat') t++;
                    else if (record.status === 'sakit') s++;
                    else if (record.status === 'izin') iStat++;
                    else if (record.status === 'alfa') a++;
                }
                ws.getCell(row, 4 + d).value = statusVal;
                ws.getCell(row, 4 + d).alignment = { horizontal: 'center' };
            }
            ws.getCell(row, rekapStart).value = h;
            ws.getCell(row, rekapStart + 1).value = t;
            ws.getCell(row, rekapStart + 2).value = s;
            ws.getCell(row, rekapStart + 3).value = iStat;
            ws.getCell(row, rekapStart + 4).value = a;
            for (let c = 1; c <= totalCols; c++) {
                ws.getCell(row, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            }
            row++;
        });
    }

    // ---- Sheet Peringatan ----
    const wsWarn = workbook.addWorksheet('Peringatan', {
        pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    wsWarn.columns = [{ width: 5 }, { width: 30 }, { width: 15 }, { width: 10 }, { width: 12 }, { width: 15 }];
    let wRow = 1;
    wsWarn.mergeCells(wRow, 1, wRow, 6);
    wsWarn.getCell(wRow, 1).value = `DAFTAR SISWA BERMASALAH — ${monthName} ${year}`;
    wsWarn.getCell(wRow, 1).font = { bold: true, size: 13 };
    wsWarn.getCell(wRow, 1).alignment = { horizontal: 'center' };
    wRow += 2;
    const warnHeaders = ['No', 'Nama Siswa', 'Kelas', 'Total Alfa', 'Izin/Sakit', '% Kehadiran'];
    warnHeaders.forEach((h, idx) => {
        const cell = wsWarn.getCell(wRow, idx + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C0392B' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    wRow++;

    const classMap = {};
    classes.forEach(c => { classMap[c.id] = c.name; });
    const perStudent = {};
    students.forEach(s => {
        perStudent[s.id] = { name: s.name, className: classMap[s.classId] || '-', h: 0, t: 0, s: 0, i: 0, a: 0 };
    });
    attendance.forEach(a => {
        if (perStudent[a.studentId]) {
            if (a.status === 'hadir') perStudent[a.studentId].h++;
            else if (a.status === 'terlambat') perStudent[a.studentId].t++;
            else if (a.status === 'sakit') perStudent[a.studentId].s++;
            else if (a.status === 'izin') perStudent[a.studentId].i++;
            else if (a.status === 'alfa') perStudent[a.studentId].a++;
        }
    });
    const warnings = Object.values(perStudent)
        .map(ps => { const total = ps.h + ps.t + ps.s + ps.i + ps.a; ps.pct = total > 0 ? Math.round(((ps.h + ps.t) / total) * 1000) / 10 : 0; ps.total = total; return ps; })
        .filter(ps => ps.a >= 3 || (ps.total > 0 && ps.pct < 80))
        .sort((a, b) => b.a - a.a);

    if (warnings.length > 0) {
        warnings.forEach((s, idx) => {
            wsWarn.getCell(wRow, 1).value = idx + 1;
            wsWarn.getCell(wRow, 2).value = s.name;
            wsWarn.getCell(wRow, 3).value = s.className;
            wsWarn.getCell(wRow, 4).value = s.a;
            wsWarn.getCell(wRow, 5).value = s.s + s.i;
            wsWarn.getCell(wRow, 6).value = s.pct + '%';
            for (let c = 1; c <= 6; c++) {
                wsWarn.getCell(wRow, c).alignment = { horizontal: 'center' };
                wsWarn.getCell(wRow, c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            }
            wsWarn.getCell(wRow, 2).alignment = { horizontal: 'left' };
            wRow++;
        });
    } else {
        wsWarn.mergeCells(wRow, 1, wRow, 6);
        wsWarn.getCell(wRow, 1).value = 'Tidak ada siswa bermasalah pada bulan ini.';
        wsWarn.getCell(wRow, 1).alignment = { horizontal: 'center' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    saveAs(new Blob([buffer]), `Laporan_Presensi_Siswa_${schoolName}_${monthName}_${year}.xlsx`);
}
