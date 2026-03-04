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
        dateCell.value = `${school.address ? school.address.split(',')[0].trim() : '............'}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
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

        // NIP lines (optional placeholder)
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

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const semName = (activeSemester.name || 'Semester').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const filename = `Jadwal_${schoolName}_${semName}.xlsx`;

    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
