// Main entry point — router & initialization
import './style.css';
import DataStore from './dataStore.js';

import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderSchool, initSchool } from './pages/school.js';
import { renderSemester, initSemester } from './pages/semester.js';
import { renderSubjects, initSubjects } from './pages/subjects.js';
import { renderClasses, initClasses } from './pages/classes.js';
import { renderTeachers, initTeachers } from './pages/teachers.js';
import { renderStudents, initStudents } from './pages/students.js';
import { renderKbm, initKbm } from './pages/kbm.js';
import { renderSchedule, initSchedule } from './pages/schedule.js';
import { renderStudentAttendance, initStudentAttendance } from './pages/studentAttendance.js';
import { renderStudentReports, initStudentReports } from './pages/studentReports.js';
import { renderBackup, initBackup } from './pages/backup.js';
import { renderReports, initReports } from './pages/reports.js';

let currentPage = 'dashboard';

const pages = {
    dashboard: { render: renderDashboard, init: initDashboard },
    school: { render: renderSchool, init: initSchool },
    semester: { render: renderSemester, init: initSemester },
    subjects: { render: renderSubjects, init: initSubjects },
    classes: { render: renderClasses, init: initClasses },
    students: { render: renderStudents, init: initStudents },
    teachers: { render: renderTeachers, init: initTeachers },
    kbm: { render: renderKbm, init: initKbm },
    schedule: { render: renderSchedule, init: initSchedule },
    studentAttendance: { render: renderStudentAttendance, init: initStudentAttendance },
    studentReports: { render: renderStudentReports, init: initStudentReports },
    backup: { render: renderBackup, init: initBackup },
    reports: { render: renderReports, init: initReports },
};

function navigateTo(page) {
    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Auto-open the parent group of the active page & highlight it
    updateGroupActiveState();

    renderCurrentPage();
    updateSemesterSwitcher();
    updateSchoolName();
}

function updateGroupActiveState() {
    document.querySelectorAll('.nav-group').forEach(group => {
        const hasActive = group.querySelector('.nav-item.active') !== null;
        group.classList.toggle('has-active', hasActive);

        // Auto-expand group if it contains the active page
        if (hasActive && !group.classList.contains('open')) {
            toggleNavGroup(group, true);
        }
    });
}

function toggleNavGroup(group, forceOpen) {
    const shouldOpen = forceOpen !== undefined ? forceOpen : !group.classList.contains('open');

    if (shouldOpen) {
        group.classList.add('open');
        group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded', 'true');
    } else {
        group.classList.remove('open');
        group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded', 'false');
    }

    // Save group states to localStorage
    saveGroupStates();
}

function saveGroupStates() {
    const states = {};
    document.querySelectorAll('.nav-group').forEach(group => {
        const groupName = group.dataset.group;
        if (groupName) {
            states[groupName] = group.classList.contains('open');
        }
    });
    localStorage.setItem('jadwal-nav-groups', JSON.stringify(states));
}

function restoreGroupStates() {
    try {
        const saved = JSON.parse(localStorage.getItem('jadwal-nav-groups') || '{}');
        document.querySelectorAll('.nav-group').forEach(group => {
            const groupName = group.dataset.group;
            if (groupName && saved[groupName]) {
                group.classList.add('open');
                group.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded', 'true');
            }
        });
    } catch (e) {
        // Ignore parse errors
    }
}

function renderCurrentPage() {
    const pageContent = document.getElementById('pageContent');
    const pageObj = pages[currentPage];
    if (!pageObj) return;

    pageContent.innerHTML = pageObj.render();

    // Init page logic — pass refreshPage callback
    if (pageObj.init) {
        pageObj.init(() => renderCurrentPage());
    }
}

function updateSemesterSwitcher() {
    const select = document.getElementById('activeSemesterSelect');
    if (!select) return;

    const semesters = DataStore.getSemesters();
    const activeId = DataStore.getActiveSemesterId();

    select.innerHTML = semesters.length === 0
        ? '<option value="">— Belum ada semester —</option>'
        : semesters.map(s => `
        <option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${s.name} (${s.year})</option>
      `).join('');
}

function updateSchoolName() {
    const school = DataStore.getSchool();
    const display = document.getElementById('schoolNameDisplay');
    if (display) {
        display.textContent = school.name || 'Nama Sekolah';
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // --- Theme toggle ---
    const savedTheme = localStorage.getItem('jadwal-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('jadwal-theme', next);
    });

    // Navigation clicks (for all nav-items including children)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Nav group toggle clicks
    document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const group = toggle.closest('.nav-group');
            if (group) {
                toggleNavGroup(group);
            }
        });
    });

    // Restore saved group open/close states
    restoreGroupStates();

    // Semester switcher
    document.getElementById('activeSemesterSelect')?.addEventListener('change', (e) => {
        const id = e.target.value;
        if (id) {
            DataStore.setActiveSemester(id);
            renderCurrentPage(); // Refresh current page with new semester
        }
    });

    // Mobile sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Initial render
    updateSchoolName();
    updateSemesterSwitcher();
    renderCurrentPage();

    // Ensure the active page's group is open on load
    updateGroupActiveState();
});
