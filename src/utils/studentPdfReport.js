// PDF Report Generator for Student Attendance (for parents)
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import DataStore from '../dataStore.js';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_MAP = { 'hadir': 'H', 'terlambat': 'T', 'sakit': 'S', 'izin': 'I', 'alfa': 'A' };

// Helper to get finalY from autoTable result
function runAutoTable(doc, opts) {
    autoTable(doc, opts);
    return doc.lastAutoTable ? doc.lastAutoTable.finalY : (opts.startY || 0) + 20;
}

// ========== Kop Surat ==========
function addKop(doc, school, pageWidth) {
    const marginL = 14;
    const centerX = pageWidth / 2;
    let y = 14;
    const logoSize = 18;

    // Logos — school logo on left, yayasan logo on right
    if (school.logo) {
        try { doc.addImage(school.logo, 'AUTO', marginL, y - 4, logoSize, logoSize); } catch (e) { /* skip */ }
    }
    if (school.logoYayasan) {
        try { doc.addImage(school.logoYayasan, 'AUTO', pageWidth - marginL - logoSize, y - 4, logoSize, logoSize); } catch (e) { /* skip */ }
    }

    // School name (centered between logos)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((school.name || 'NAMA SEKOLAH').toUpperCase(), centerX, y, { align: 'center' });
    y += 5;

    // Accreditation
    if (school.accreditation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 100, 180);
        doc.text(`Terakreditasi ${school.accreditation}`, centerX, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 4;
    }

    // Address
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(school.address || 'Alamat Sekolah', centerX, y, { align: 'center' });
    y += 4;

    // NPSN, Phone, Email line
    const infoParts = [
        school.npsn ? `NPSN: ${school.npsn}` : '',
        school.phone ? `Telp: ${school.phone}` : '',
        school.email || ''
    ].filter(Boolean);
    if (infoParts.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(infoParts.join('  |  '), centerX, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 3;
    }

    // Ensure y is below the logo area
    y = Math.max(y, 14 - 4 + logoSize + 2);

    // Double line separator
    y += 1;
    doc.setLineWidth(0.8);
    doc.line(marginL, y, pageWidth - marginL, y);
    doc.setLineWidth(0.3);
    doc.line(marginL, y + 1.5, pageWidth - marginL, y + 1.5);

    return y + 6;
}

// ========== Compute student stats for a month ==========
function computeStudentMonth(studentId, month, year) {
    const attendance = DataStore.getStudentAttendance();
    const filtered = attendance.filter(a => {
        const [ay, am] = a.date.split('-').map(Number);
        return ay === year && (am - 1) === month && a.studentId === studentId;
    });

    const counts = { hadir: 0, terlambat: 0, sakit: 0, izin: 0, alfa: 0 };
    const dailyMap = {};
    filtered.forEach(a => {
        if (counts[a.status] !== undefined) counts[a.status]++;
        const day = parseInt(a.date.split('-')[2]);
        dailyMap[day] = a.status;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pct = total > 0 ? Math.round(((counts.hadir + counts.terlambat) / total) * 1000) / 10 : 0;

    return { counts, dailyMap, total, pct };
}

// ========== Compute class avg for a month ==========
function computeClassAvg(classId, month, year) {
    const students = DataStore.getStudents().filter(s => s.classId === classId);
    const attendance = DataStore.getStudentAttendance();
    const studentIds = new Set(students.map(s => s.id));

    const filtered = attendance.filter(a => {
        const [ay, am] = a.date.split('-').map(Number);
        return ay === year && (am - 1) === month && studentIds.has(a.studentId);
    });

    let h = 0, t = 0, total = 0;
    filtered.forEach(a => {
        if (['hadir', 'terlambat', 'sakit', 'izin', 'alfa'].includes(a.status)) {
            total++;
            if (a.status === 'hadir') h++;
            if (a.status === 'terlambat') t++;
        }
    });

    return total > 0 ? Math.round(((h + t) / total) * 1000) / 10 : 0;
}

// ========== Effective days in month ==========
function getEffectiveDays(classId, month, year) {
    const students = DataStore.getStudents().filter(s => s.classId === classId);
    const attendance = DataStore.getStudentAttendance();
    const studentIds = new Set(students.map(s => s.id));

    const filtered = attendance.filter(a => {
        const [ay, am] = a.date.split('-').map(Number);
        return ay === year && (am - 1) === month && studentIds.has(a.studentId);
    });

    return new Set(filtered.map(a => a.date)).size;
}

// ========== Generate one student page ==========
function generateStudentPage(doc, student, cls, school, month, year, isFirst) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginL = 14;
    const marginR = pageWidth - 14;

    if (!isFirst) doc.addPage();

    // Kop
    let y = addKop(doc, school, pageWidth);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN KEHADIRAN SISWA', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Bulan ${MONTHS[month]} ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Student info table
    const genderFull = student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '-';
    const infoData = [
        ['Nama Lengkap', ': ' + student.name, 'Kelas', ': ' + (cls?.name || '-')],
        ['NISN', ': ' + (student.nisn || '-'), 'Jenis Kelamin', ': ' + genderFull],
    ];

    y = runAutoTable(doc, {
        startY: y,
        body: infoData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5, font: 'helvetica' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 32 },
            1: { cellWidth: 55 },
            2: { fontStyle: 'bold', cellWidth: 32 },
            3: { cellWidth: 55 },
        },
        margin: { left: marginL, right: marginL },
    }) + 6;

    // Compute stats
    const stats = computeStudentMonth(student.id, month, year);
    const classAvg = computeClassAvg(student.classId, month, year);
    const effectiveDays = getEffectiveDays(student.classId, month, year);

    // Summary table
    y = runAutoTable(doc, {
        startY: y,
        head: [['Hari Efektif', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', '% Kehadiran']],
        body: [[
            effectiveDays,
            stats.counts.hadir,
            stats.counts.terlambat,
            stats.counts.sakit,
            stats.counts.izin,
            stats.counts.alfa,
            stats.pct + '%'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [47, 84, 150], textColor: 255, fontSize: 8, halign: 'center', font: 'helvetica', fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, halign: 'center', font: 'helvetica' },
        margin: { left: marginL, right: marginL },
    }) + 4;

    // Comparison bar
    const studentPct = stats.pct;
    const pctColor = studentPct >= 90 ? [34, 197, 94] : studentPct >= 75 ? [202, 138, 4] : [239, 68, 68];

    doc.setFillColor(240, 244, 250);
    doc.roundedRect(marginL, y, pageWidth - 28, 12, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(pctColor[0], pctColor[1], pctColor[2]);
    doc.text(`Kehadiran Siswa: ${studentPct}%`, marginL + 4, y + 7.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rata-rata Kelas: ${classAvg}%`, pageWidth / 2 + 10, y + 7.5);
    doc.setTextColor(0, 0, 0);

    y += 18;

    // Daily matrix
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RINCIAN KEHADIRAN HARIAN', marginL, y);
    y += 4;

    // Build matrix rows — 2 rows: dates and statuses (split if > 16 days)
    const matrixRows = [];
    const splitAt = 16;

    // First half: 1-16
    const dates1 = [];
    const statuses1 = [];
    for (let d = 1; d <= Math.min(splitAt, daysInMonth); d++) {
        dates1.push(String(d));
        statuses1.push(STATUS_MAP[stats.dailyMap[d]] || '');
    }
    matrixRows.push({ dates: dates1, statuses: statuses1 });

    // Second half: 17-end
    if (daysInMonth > splitAt) {
        const dates2 = [];
        const statuses2 = [];
        for (let d = splitAt + 1; d <= daysInMonth; d++) {
            dates2.push(String(d));
            statuses2.push(STATUS_MAP[stats.dailyMap[d]] || '');
        }
        matrixRows.push({ dates: dates2, statuses: statuses2 });
    }

    matrixRows.forEach(row => {
        y = runAutoTable(doc, {
            startY: y,
            head: [row.dates],
            body: [row.statuses],
            theme: 'grid',
            headStyles: {
                fillColor: [47, 84, 150], textColor: 255, fontSize: 7, halign: 'center',
                cellPadding: 1.5, font: 'helvetica', fontStyle: 'bold',
            },
            bodyStyles: { fontSize: 8, halign: 'center', cellPadding: 2, font: 'helvetica', fontStyle: 'bold' },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const val = data.cell.raw;
                    if (val === 'H') data.cell.styles.textColor = [34, 197, 94];
                    else if (val === 'T') data.cell.styles.textColor = [202, 138, 4];
                    else if (val === 'S') data.cell.styles.textColor = [249, 115, 22];
                    else if (val === 'I') data.cell.styles.textColor = [59, 130, 246];
                    else if (val === 'A') data.cell.styles.textColor = [239, 68, 68];
                }
            },
            margin: { left: marginL, right: marginL },
        }) + 3;
    });

    y += 2;

    // Legend
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Keterangan: H = Hadir, T = Terlambat, S = Sakit, I = Izin, A = Alfa', marginL, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    // Warning
    if (stats.counts.alfa >= 3 || (stats.total > 0 && stats.pct < 80)) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
        doc.roundedRect(marginL, y, pageWidth - 28, 14, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28);
        let warningText = '⚠ PERHATIAN: ';
        if (stats.counts.alfa >= 3) warningText += `Siswa memiliki ${stats.counts.alfa} hari Alfa. `;
        if (stats.total > 0 && stats.pct < 80) warningText += `Kehadiran ${stats.pct}% (di bawah standar 80%).`;
        doc.text(warningText, marginL + 4, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Mohon perhatian dan kerjasama orang tua/wali untuk meningkatkan kehadiran siswa.', marginL + 4, y + 10.5);
        doc.setTextColor(0, 0, 0);
        y += 20;
    }

    // Signature block
    const sigY = Math.max(y + 8, 240);
    const today = new Date();
    const dateStr = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

    // Right-aligned date with dots for city
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`..........., ${dateStr}`, marginR, sigY, { align: 'right' });

    const col1X = marginL + 20;
    const col2X = pageWidth - marginL - 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Wali Kelas,', col1X, sigY + 8, { align: 'center' });
    doc.text('Orang Tua / Wali,', col2X, sigY + 8, { align: 'center' });

    // Name lines
    doc.text('____________________', col1X, sigY + 30, { align: 'center' });
    doc.text('____________________', col2X, sigY + 30, { align: 'center' });
}

// ========== Public: Monthly Bulk PDF ==========
export function generateBulkMonthlyPdf(classId, month, year) {
    try {
        const school = DataStore.getSchool();
        const classes = DataStore.getClasses();
        const cls = classes.find(c => c.id === classId);
        const students = DataStore.getStudents()
            .filter(s => s.classId === classId)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (students.length === 0) {
            alert('Tidak ada siswa di kelas ini.');
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        students.forEach((student, idx) => {
            generateStudentPage(doc, student, cls, school, month, year, idx === 0);
        });

        const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
        doc.save(`Laporan_Kehadiran_${cls?.name || 'Kelas'}_${MONTHS[month]}_${year}_${schoolName}.pdf`);
    } catch (err) {
        console.error('Error generating bulk monthly PDF:', err);
        alert('Gagal membuat PDF: ' + err.message);
    }
}

// ========== Public: Single Student Monthly PDF ==========
export function generateSingleStudentPdf(studentId, month, year) {
    try {
        const school = DataStore.getSchool();
        const students = DataStore.getStudents();
        const classes = DataStore.getClasses();
        const student = students.find(s => s.id === studentId);
        if (!student) { alert('Siswa tidak ditemukan.'); return; }
        const cls = classes.find(c => c.id === student.classId);

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        generateStudentPage(doc, student, cls, school, month, year, true);
        doc.save(`Laporan_${student.name.replace(/\s+/g, '_')}_${MONTHS[month]}_${year}.pdf`);
    } catch (err) {
        console.error('Error generating single student PDF:', err);
        alert('Gagal membuat PDF: ' + err.message);
    }
}

// ========== Semester helpers ==========
function getSemesterMonths(year, semesterType) {
    // semesterType: '1' (ganjil: Jul-Dec) or '2' (genap: Jan-Jun)
    if (semesterType === '1') {
        return [
            { month: 6, year }, { month: 7, year }, { month: 8, year },
            { month: 9, year }, { month: 10, year }, { month: 11, year }
        ];
    } else {
        return [
            { month: 0, year }, { month: 1, year }, { month: 2, year },
            { month: 3, year }, { month: 4, year }, { month: 5, year }
        ];
    }
}

function generateSemesterPage(doc, student, cls, school, year, semesterType, isFirst) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginL = 14;
    const marginR = pageWidth - 14;
    const semLabel = semesterType === '1' ? 'Ganjil (Juli - Desember)' : 'Genap (Januari - Juni)';
    const semMonths = getSemesterMonths(year, semesterType);

    if (!isFirst) doc.addPage();

    let y = addKop(doc, school, pageWidth);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN KEHADIRAN SISWA PER SEMESTER', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Semester ${semLabel} — Tahun ${year}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Student info
    const genderFull = student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '-';
    y = runAutoTable(doc, {
        startY: y,
        body: [
            ['Nama Lengkap', ': ' + student.name, 'Kelas', ': ' + (cls?.name || '-')],
            ['NISN', ': ' + (student.nisn || '-'), 'Jenis Kelamin', ': ' + genderFull],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5, font: 'helvetica' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 32 },
            1: { cellWidth: 55 },
            2: { fontStyle: 'bold', cellWidth: 32 },
            3: { cellWidth: 55 },
        },
        margin: { left: marginL, right: marginL },
    }) + 6;

    // Monthly breakdown table
    const monthHeaders = ['Bulan', 'Hari Efektif', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alfa', '%'];
    const monthRows = [];
    let grandH = 0, grandT = 0, grandS = 0, grandI = 0, grandA = 0, grandTotal = 0, grandDays = 0;

    semMonths.forEach(m => {
        const stats = computeStudentMonth(student.id, m.month, m.year);
        const eDays = getEffectiveDays(student.classId, m.month, m.year);
        grandH += stats.counts.hadir;
        grandT += stats.counts.terlambat;
        grandS += stats.counts.sakit;
        grandI += stats.counts.izin;
        grandA += stats.counts.alfa;
        grandTotal += stats.total;
        grandDays += eDays;
        monthRows.push([
            MONTHS[m.month].substring(0, 3),
            eDays || '-',
            stats.counts.hadir || '-',
            stats.counts.terlambat || '-',
            stats.counts.sakit || '-',
            stats.counts.izin || '-',
            stats.counts.alfa || '-',
            stats.total > 0 ? stats.pct + '%' : '-'
        ]);
    });

    const grandPct = grandTotal > 0 ? Math.round(((grandH + grandT) / grandTotal) * 1000) / 10 : 0;
    monthRows.push(['TOTAL', grandDays, grandH, grandT, grandS, grandI, grandA, grandPct + '%']);

    y = runAutoTable(doc, {
        startY: y,
        head: [monthHeaders],
        body: monthRows,
        theme: 'grid',
        headStyles: { fillColor: [47, 84, 150], textColor: 255, fontSize: 8, halign: 'center', font: 'helvetica', fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, halign: 'center', font: 'helvetica' },
        didParseCell: (data) => {
            // Bold total row
            if (data.section === 'body' && data.row.index === monthRows.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 244, 250];
            }
        },
        margin: { left: marginL, right: marginL },
    }) + 5;

    // Comparison
    const classAvgPcts = semMonths.map(m => computeClassAvg(student.classId, m.month, m.year));
    const avgClassPct = classAvgPcts.length > 0
        ? Math.round(classAvgPcts.reduce((a, b) => a + b, 0) / classAvgPcts.filter(p => p > 0).length * 10) / 10 || 0
        : 0;

    const pctColor = grandPct >= 90 ? [34, 197, 94] : grandPct >= 75 ? [202, 138, 4] : [239, 68, 68];
    doc.setFillColor(240, 244, 250);
    doc.roundedRect(marginL, y, pageWidth - 28, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(pctColor[0], pctColor[1], pctColor[2]);
    doc.text(`Kehadiran Semester: ${grandPct}%`, marginL + 4, y + 7.5);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rata-rata Kelas: ${avgClassPct}%`, pageWidth / 2 + 10, y + 7.5);
    doc.setTextColor(0, 0, 0);
    y += 18;

    // Warning
    if (grandA >= 3 || (grandTotal > 0 && grandPct < 80)) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
        doc.roundedRect(marginL, y, pageWidth - 28, 14, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28);
        let warningText = 'PERHATIAN: ';
        if (grandA >= 3) warningText += `Siswa memiliki ${grandA} hari Alfa semester ini. `;
        if (grandTotal > 0 && grandPct < 80) warningText += `Kehadiran ${grandPct}% (di bawah standar 80%).`;
        doc.text(warningText, marginL + 4, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Mohon perhatian dan kerjasama orang tua/wali untuk meningkatkan kehadiran siswa.', marginL + 4, y + 10.5);
        doc.setTextColor(0, 0, 0);
        y += 20;
    }

    // Signature
    const sigY = Math.max(y + 8, 230);
    const today = new Date();
    const dateStr = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`..........., ${dateStr}`, marginR, sigY, { align: 'right' });

    const col1X = marginL + 20;
    const col2X = pageWidth - marginL - 20;

    doc.text('Wali Kelas,', col1X, sigY + 8, { align: 'center' });
    doc.text('Orang Tua / Wali,', col2X, sigY + 8, { align: 'center' });
    doc.text('____________________', col1X, sigY + 30, { align: 'center' });
    doc.text('____________________', col2X, sigY + 30, { align: 'center' });
}

// ========== Public: Semester Bulk PDF ==========
export function generateBulkSemesterPdf(classId, year, semesterType) {
    try {
        const school = DataStore.getSchool();
        const classes = DataStore.getClasses();
        const cls = classes.find(c => c.id === classId);
        const students = DataStore.getStudents()
            .filter(s => s.classId === classId)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (students.length === 0) { alert('Tidak ada siswa di kelas ini.'); return; }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        students.forEach((student, idx) => {
            generateSemesterPage(doc, student, cls, school, year, semesterType, idx === 0);
        });

        const semLabel = semesterType === '1' ? 'Ganjil' : 'Genap';
        const schoolName = (school.name || 'Sekolah').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
        doc.save(`Laporan_Semester_${semLabel}_${cls?.name || 'Kelas'}_${year}_${schoolName}.pdf`);
    } catch (err) {
        console.error('Error generating bulk semester PDF:', err);
        alert('Gagal membuat PDF: ' + err.message);
    }
}

// ========== Public: Single Student Semester PDF ==========
export function generateSingleSemesterPdf(studentId, year, semesterType) {
    try {
        const school = DataStore.getSchool();
        const students = DataStore.getStudents();
        const classes = DataStore.getClasses();
        const student = students.find(s => s.id === studentId);
        if (!student) { alert('Siswa tidak ditemukan.'); return; }
        const cls = classes.find(c => c.id === student.classId);

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        generateSemesterPage(doc, student, cls, school, year, semesterType, true);

        const semLabel = semesterType === '1' ? 'Ganjil' : 'Genap';
        doc.save(`Laporan_Semester_${semLabel}_${student.name.replace(/\s+/g, '_')}_${year}.pdf`);
    } catch (err) {
        console.error('Error generating single semester PDF:', err);
        alert('Gagal membuat PDF: ' + err.message);
    }
}
