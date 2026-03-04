// Attendance Analytics — reusable statistics computation
import DataStore from '../dataStore.js';

const STATUS_CODES = { hadir: 'H', terlambat: 'T', sakit: 'S', izin: 'I', alfa: 'A' };
const SCHOOL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_JS_MAP = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSchoolDay(date) {
    const d = new Date(date + 'T00:00:00');
    return SCHOOL_DAYS.includes(DAY_JS_MAP[d.getDay()]);
}

export function getDatesInRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (current <= end) {
        const dateStr = toLocalDateStr(current);
        if (isSchoolDay(dateStr)) dates.push(dateStr);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Get teacher's aggregated status for a single day
function getTeacherDayStatus(attendance, teacherId) {
    if (!attendance || !attendance.entries) return null;
    const entries = attendance.entries.filter(e => e.teacherId === teacherId);
    if (entries.length === 0) return null;

    const priority = { alfa: 5, sakit: 4, izin: 3, terlambat: 2, hadir: 1 };
    let worst = 'hadir';
    for (const e of entries) {
        if ((priority[e.status] || 0) > (priority[worst] || 0)) worst = e.status;
    }
    return worst;
}

// Get detail info for a teacher on a given day
function getTeacherDayDetail(attendance, teacherId) {
    if (!attendance || !attendance.entries) return null;
    const entries = attendance.entries.filter(e => e.teacherId === teacherId);
    if (entries.length === 0) return null;
    return {
        status: getTeacherDayStatus(attendance, teacherId),
        suratDokter: entries.some(e => e.suratDokter),
        menitipkanTugas: entries.some(e => e.menitipkanTugas),
        lateCount: entries.filter(e => e.status === 'terlambat').length,
        entries
    };
}

/**
 * Compute per-teacher stats for a date range.
 * @returns Array of { teacher, counts: {H,T,S,I,A}, totalDays, percentage, lateDates, absentDates, taskDelegated }
 */
export function computeTeacherStats(startDate, endDate) {
    const teachers = DataStore.getTeachers();
    const subjects = DataStore.getSubjects();
    const dates = getDatesInRange(startDate, endDate);

    // Filter teachers who teach pelajaran
    const pelajaranTeachers = teachers.filter(t => {
        const subs = (t.subjectIds || []).map(sid => subjects.find(s => s.id === sid)).filter(Boolean);
        return subs.length === 0 || subs.some(s => !s.type || s.type === 'pelajaran');
    });

    return pelajaranTeachers.map(teacher => {
        const counts = { H: 0, T: 0, S: 0, I: 0, A: 0 };
        const lateDates = [];
        const absentDates = [];
        let taskDelegated = 0;
        let recordedDays = 0;

        dates.forEach(date => {
            const att = DataStore.getAttendance(date);
            const detail = getTeacherDayDetail(att, teacher.id);
            if (!detail) return;

            recordedDays++;
            const code = STATUS_CODES[detail.status] || 'H';
            counts[code]++;

            if (detail.status === 'terlambat') lateDates.push(date);
            if (['sakit', 'izin', 'alfa'].includes(detail.status)) absentDates.push({ date, status: detail.status });
            if (detail.menitipkanTugas) taskDelegated++;
        });

        const totalDays = dates.length;
        const percentage = recordedDays > 0
            ? Math.round(((counts.H + counts.T) / recordedDays) * 100)
            : 0;

        // Get teacher subjects
        const teacherSubjects = (teacher.subjectIds || [])
            .map(sid => subjects.find(s => s.id === sid))
            .filter(Boolean);

        return {
            teacher,
            teacherSubjects,
            counts,
            totalDays,
            recordedDays,
            percentage,
            lateDates,
            absentDates,
            taskDelegated
        };
    });
}

/**
 * Compute overall stats from teacher stats array.
 */
export function computeOverallStats(teacherStats) {
    const totals = { H: 0, T: 0, S: 0, I: 0, A: 0 };
    let totalRecorded = 0;
    let totalTeachers = teacherStats.length;

    teacherStats.forEach(ts => {
        Object.keys(totals).forEach(k => totals[k] += ts.counts[k]);
        totalRecorded += ts.recordedDays;
    });

    const avgPercentage = totalTeachers > 0
        ? Math.round(teacherStats.reduce((sum, ts) => sum + ts.percentage, 0) / totalTeachers)
        : 0;

    return {
        totals,
        totalRecorded,
        totalTeachers,
        avgPercentage,
        totalDays: teacherStats.length > 0 ? teacherStats[0].totalDays : 0
    };
}

/**
 * Get teachers sorted by lateness frequency (desc).
 */
export function computeLatecomerRanking(teacherStats) {
    return teacherStats
        .filter(ts => ts.counts.T > 0)
        .sort((a, b) => b.counts.T - a.counts.T);
}

/**
 * Get teachers sorted by absences (S+I+A) frequency (desc).
 */
export function computeAbsenteeRanking(teacherStats) {
    return teacherStats
        .filter(ts => (ts.counts.S + ts.counts.I + ts.counts.A) > 0)
        .sort((a, b) => (b.counts.S + b.counts.I + b.counts.A) - (a.counts.S + a.counts.I + a.counts.A));
}

/**
 * Format a date string to Indonesian format: "4 Maret 2026"
 */
export function formatDateIndo(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
