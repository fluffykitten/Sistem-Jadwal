// Main entry point — router & initialization
import './style.css';
import DataStore from './dataStore.js';

import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderSchool, initSchool } from './pages/school.js';
import { renderSemester, initSemester } from './pages/semester.js';
import { renderSubjects, initSubjects } from './pages/subjects.js';
import { renderClasses, initClasses } from './pages/classes.js';
import { renderTeachers, initTeachers } from './pages/teachers.js';
import { renderKbm, initKbm } from './pages/kbm.js';
import { renderSchedule, initSchedule } from './pages/schedule.js';

let currentPage = 'dashboard';

const pages = {
    dashboard: { render: renderDashboard, init: initDashboard },
    school: { render: renderSchool, init: initSchool },
    semester: { render: renderSemester, init: initSemester },
    subjects: { render: renderSubjects, init: initSubjects },
    classes: { render: renderClasses, init: initClasses },
    teachers: { render: renderTeachers, init: initTeachers },
    kbm: { render: renderKbm, init: initKbm },
    schedule: { render: renderSchedule, init: initSchedule },
};

function navigateTo(page) {
    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    renderCurrentPage();
    updateSemesterSwitcher();
    updateSchoolName();
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

    // Navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

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
});
