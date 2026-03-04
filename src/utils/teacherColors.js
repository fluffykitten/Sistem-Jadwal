// Teacher Color Utility — assigns unique colors to each teacher
// Colors are designed to work as subtle backgrounds in both light/dark themes

const TEACHER_PALETTE = [
    { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', text: '#6366f1', excelBg: 'D5D6F9', excelText: '3730A3' },
    { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', text: '#10b981', excelBg: 'C6F5E3', excelText: '065F46' },
    { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', text: '#f59e0b', excelBg: 'FEF0C7', excelText: '92400E' },
    { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', text: '#ef4444', excelBg: 'FCD5D5', excelText: '991B1B' },
    { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.35)', text: '#0ea5e9', excelBg: 'C8EDFD', excelText: '075985' },
    { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', text: '#a855f7', excelBg: 'E4D4FB', excelText: '581C87' },
    { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)', text: '#ec4899', excelBg: 'FAD1E6', excelText: '9D174D' },
    { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.35)', text: '#14b8a6', excelBg: 'C6F4F0', excelText: '115E59' },
    { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', text: '#f97316', excelBg: 'FDE5CE', excelText: '9A3412' },
    { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.35)', text: '#22c55e', excelBg: 'CDF5DA', excelText: '166534' },
    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)', text: '#3b82f6', excelBg: 'CEDEF9', excelText: '1E40AF' },
    { bg: 'rgba(217, 70, 239, 0.15)', border: 'rgba(217, 70, 239, 0.35)', text: '#d946ef', excelBg: 'F3D0FA', excelText: '86198F' },
    { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)', text: '#fbbf24', excelBg: 'FEF3C7', excelText: '78350F' },
    { bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.35)', text: '#f43f5e', excelBg: 'FCD2D8', excelText: '9F1239' },
    { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)', text: '#06b6d4', excelBg: 'C4EFFA', excelText: '155E75' },
    { bg: 'rgba(132, 204, 22, 0.15)', border: 'rgba(132, 204, 22, 0.35)', text: '#84cc16', excelBg: 'DEF1C5', excelText: '3F6212' },
    { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)', text: '#8b5cf6', excelBg: 'DDD6FE', excelText: '5B21B6' },
    { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)', text: '#fb923c', excelBg: 'FDE0C8', excelText: '9A3412' },
    { bg: 'rgba(45, 212, 191, 0.15)', border: 'rgba(45, 212, 191, 0.35)', text: '#2dd4bf', excelBg: 'C9F6F0', excelText: '134E4A' },
    { bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)', text: '#c084fc', excelBg: 'EAD9FD', excelText: '6B21A8' },
];

/**
 * Build a deterministic color map for all teachers.
 * @param {Array} teachers - array of teacher objects with `id`
 * @returns {Map<string, object>} teacherId → color object
 */
export function getTeacherColorMap(teachers) {
    const map = new Map();
    teachers.forEach((t, i) => {
        map.set(t.id, TEACHER_PALETTE[i % TEACHER_PALETTE.length]);
    });
    return map;
}
