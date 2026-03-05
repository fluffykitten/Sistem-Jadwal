// DataStore - localStorage-based data layer
const STORAGE_KEY = 'jadwal_sekolah_data';

const defaultData = {
  school: {
    name: '',
    npsn: '',
    address: '',
    phone: '',
    email: '',
    principal: '',
    vicePrincipal: '',
    logo: ''
  },
  semesters: [],
  activeSemesterId: null,
  subjects: [],
  classes: [],
  teachers: [],
  kbmProfiles: [],
  schedules: [],
  attendance: [],
  students: [],
  studentAttendance: []
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let data = { ...defaultData, ...parsed };
      // Ensure school has vicePrincipal field
      if (!data.school.vicePrincipal && data.school.vicePrincipal !== '') {
        data.school = { ...defaultData.school, ...data.school };
      }
      // Migration: convert old flat kbmSlots[] to kbmProfiles[]
      if (data.kbmSlots && data.kbmSlots.length > 0 && (!data.kbmProfiles || data.kbmProfiles.length === 0)) {
        const migratedProfile = {
          id: generateId(),
          name: 'Semua Hari',
          days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
          slots: data.kbmSlots.map(s => ({ ...s }))
        };
        data.kbmProfiles = [migratedProfile];
        // Update schedule references: kbmSlotId stays the same since slot IDs are preserved
        delete data.kbmSlots;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return { ...defaultData };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

let _data = loadData();

const DataStore = {
  // --- School ---
  getSchool() {
    return { ...defaultData.school, ...(_data.school || {}) };
  },
  saveSchool(schoolData) {
    _data.school = { ...schoolData };
    saveData(_data);
  },

  // --- Semesters ---
  getSemesters() {
    return [..._data.semesters];
  },
  getActiveSemester() {
    return _data.semesters.find(s => s.id === _data.activeSemesterId) || null;
  },
  getActiveSemesterId() {
    return _data.activeSemesterId;
  },
  setActiveSemester(id) {
    _data.activeSemesterId = id;
    saveData(_data);
  },
  addSemester(semester) {
    const newSemester = { id: generateId(), ...semester };
    _data.semesters.push(newSemester);
    if (_data.semesters.length === 1) {
      _data.activeSemesterId = newSemester.id;
    }
    saveData(_data);
    return newSemester;
  },
  updateSemester(id, updates) {
    const idx = _data.semesters.findIndex(s => s.id === id);
    if (idx !== -1) {
      _data.semesters[idx] = { ..._data.semesters[idx], ...updates };
      saveData(_data);
    }
  },
  deleteSemester(id) {
    _data.semesters = _data.semesters.filter(s => s.id !== id);
    if (_data.activeSemesterId === id) {
      _data.activeSemesterId = _data.semesters.length > 0 ? _data.semesters[0].id : null;
    }
    _data.schedules = _data.schedules.filter(s => s.semesterId !== id);
    saveData(_data);
  },

  // --- Subjects ---
  getSubjects() {
    return [..._data.subjects];
  },
  addSubject(subject) {
    const newSubject = { id: generateId(), ...subject };
    _data.subjects.push(newSubject);
    saveData(_data);
    return newSubject;
  },
  updateSubject(id, updates) {
    const idx = _data.subjects.findIndex(s => s.id === id);
    if (idx !== -1) {
      _data.subjects[idx] = { ..._data.subjects[idx], ...updates };
      saveData(_data);
    }
  },
  deleteSubject(id) {
    _data.subjects = _data.subjects.filter(s => s.id !== id);
    _data.teachers.forEach(t => {
      t.subjectIds = (t.subjectIds || []).filter(sid => sid !== id);
    });
    saveData(_data);
  },

  // --- Classes ---
  getClasses() {
    return [..._data.classes];
  },
  addClass(cls) {
    const newClass = { id: generateId(), ...cls };
    _data.classes.push(newClass);
    saveData(_data);
    return newClass;
  },
  updateClass(id, updates) {
    const idx = _data.classes.findIndex(c => c.id === id);
    if (idx !== -1) {
      _data.classes[idx] = { ..._data.classes[idx], ...updates };
      saveData(_data);
    }
  },
  deleteClass(id) {
    _data.classes = _data.classes.filter(c => c.id !== id);
    _data.schedules = _data.schedules.filter(s => s.classId !== id);
    saveData(_data);
  },

  // --- Teachers ---
  getTeachers() {
    return [..._data.teachers];
  },
  addTeacher(teacher) {
    const newTeacher = { id: generateId(), ...teacher };
    _data.teachers.push(newTeacher);
    saveData(_data);
    return newTeacher;
  },
  updateTeacher(id, updates) {
    const idx = _data.teachers.findIndex(t => t.id === id);
    if (idx !== -1) {
      _data.teachers[idx] = { ..._data.teachers[idx], ...updates };
      saveData(_data);
    }
  },
  deleteTeacher(id) {
    _data.teachers = _data.teachers.filter(t => t.id !== id);
    _data.schedules = _data.schedules.filter(s => s.teacherId !== id);
    saveData(_data);
  },

  // --- KBM Profiles ---
  getKbmProfiles() {
    return [...(_data.kbmProfiles || [])];
  },
  addKbmProfile(profile) {
    const newProfile = {
      id: generateId(),
      name: profile.name,
      days: profile.days || [],
      slots: (profile.slots || []).map(s => ({ ...s, id: s.id || generateId() }))
    };
    if (!_data.kbmProfiles) _data.kbmProfiles = [];
    _data.kbmProfiles.push(newProfile);
    saveData(_data);
    return newProfile;
  },
  updateKbmProfile(id, updates) {
    if (!_data.kbmProfiles) return;
    const idx = _data.kbmProfiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      _data.kbmProfiles[idx] = { ..._data.kbmProfiles[idx], ...updates };
      saveData(_data);
    }
  },
  deleteKbmProfile(id) {
    if (!_data.kbmProfiles) return;
    const profile = _data.kbmProfiles.find(p => p.id === id);
    if (profile) {
      const slotIds = profile.slots.map(s => s.id);
      _data.schedules = _data.schedules.filter(s => !slotIds.includes(s.kbmSlotId));
    }
    _data.kbmProfiles = _data.kbmProfiles.filter(p => p.id !== id);
    saveData(_data);
  },

  // Add slot to profile
  addSlotToProfile(profileId, slot) {
    const profile = (_data.kbmProfiles || []).find(p => p.id === profileId);
    if (!profile) return null;
    const newSlot = { id: generateId(), order: profile.slots.length + 1, ...slot };
    profile.slots.push(newSlot);
    saveData(_data);
    return newSlot;
  },
  updateSlotInProfile(profileId, slotId, updates) {
    const profile = (_data.kbmProfiles || []).find(p => p.id === profileId);
    if (!profile) return;
    const idx = profile.slots.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      profile.slots[idx] = { ...profile.slots[idx], ...updates };
      saveData(_data);
    }
  },
  deleteSlotFromProfile(profileId, slotId) {
    const profile = (_data.kbmProfiles || []).find(p => p.id === profileId);
    if (!profile) return;
    profile.slots = profile.slots.filter(s => s.id !== slotId);
    profile.slots.sort((a, b) => a.order - b.order).forEach((s, i) => s.order = i + 1);
    _data.schedules = _data.schedules.filter(s => s.kbmSlotId !== slotId);
    saveData(_data);
  },

  // Get slots for a specific day
  getKbmSlotsForDay(day) {
    const profiles = _data.kbmProfiles || [];
    const profile = profiles.find(p => (p.days || []).includes(day));
    if (!profile) return [];
    return [...profile.slots].sort((a, b) => a.order - b.order);
  },

  // Get all unique slots across all profiles (for backward compat)
  getAllKbmSlots() {
    const profiles = _data.kbmProfiles || [];
    const allSlots = [];
    profiles.forEach(p => {
      (p.slots || []).forEach(s => {
        if (!allSlots.find(x => x.id === s.id)) {
          allSlots.push({ ...s, profileId: p.id, profileName: p.name });
        }
      });
    });
    return allSlots.sort((a, b) => a.order - b.order);
  },

  // Check if any profile has slots
  hasKbmSlots() {
    return (_data.kbmProfiles || []).some(p => p.slots && p.slots.length > 0);
  },

  // --- Schedules ---
  getSchedules(semesterId) {
    const sid = semesterId || _data.activeSemesterId;
    return _data.schedules.filter(s => s.semesterId === sid);
  },
  addSchedule(schedule) {
    const semesterId = schedule.semesterId || _data.activeSemesterId;
    const newSchedule = { id: generateId(), semesterId, ...schedule };
    _data.schedules.push(newSchedule);
    saveData(_data);
    return newSchedule;
  },
  removeSchedule(id) {
    _data.schedules = _data.schedules.filter(s => s.id !== id);
    saveData(_data);
  },
  getScheduleAt(day, kbmSlotId, classId, semesterId) {
    const sid = semesterId || _data.activeSemesterId;
    return _data.schedules.find(
      s => s.semesterId === sid && s.day === day && s.kbmSlotId === kbmSlotId && s.classId === classId
    ) || null;
  },
  hasConflict(teacherId, day, kbmSlotId, semesterId, excludeId) {
    const sid = semesterId || _data.activeSemesterId;
    return _data.schedules.some(
      s => s.semesterId === sid && s.teacherId === teacherId && s.day === day && s.kbmSlotId === kbmSlotId && s.id !== excludeId
    );
  },

  // --- Attendance ---
  getAttendance(date, semesterId) {
    const sid = semesterId || _data.activeSemesterId;
    if (!_data.attendance) _data.attendance = [];
    return _data.attendance.find(a => a.date === date && a.semesterId === sid) || null;
  },
  saveAttendance(record) {
    if (!_data.attendance) _data.attendance = [];
    const sid = record.semesterId || _data.activeSemesterId;
    const idx = _data.attendance.findIndex(a => a.date === record.date && a.semesterId === sid);
    const full = { ...record, semesterId: sid };
    if (idx !== -1) {
      _data.attendance[idx] = full;
    } else {
      _data.attendance.push({ id: generateId(), ...full });
    }
    saveData(_data);
  },
  getAttendanceByRange(startDate, endDate, semesterId) {
    const sid = semesterId || _data.activeSemesterId;
    if (!_data.attendance) return [];
    return _data.attendance.filter(a => a.semesterId === sid && a.date >= startDate && a.date <= endDate);
  },

  // --- Backup & Restore ---
  exportData() {
    return JSON.stringify({
      _meta: {
        app: 'jadwal_sekolah',
        version: 1,
        exportedAt: new Date().toISOString()
      },
      ..._data
    }, null, 2);
  },
  importData(jsonString) {
    const parsed = JSON.parse(jsonString);
    // Validate structure
    if (!parsed.school && !parsed.semesters && !parsed.subjects) {
      // Check if it has _meta from our export
      if (!parsed._meta || parsed._meta.app !== 'jadwal_sekolah') {
        throw new Error('Format file backup tidak valid.');
      }
    }
    // Remove meta before importing
    const { _meta, ...importedData } = parsed;
    // Merge with defaults to ensure all fields exist
    _data = { ...defaultData, ...importedData };
    saveData(_data);
    return {
      school: _data.school.name || '-',
      semesters: (_data.semesters || []).length,
      subjects: (_data.subjects || []).length,
      classes: (_data.classes || []).length,
      teachers: (_data.teachers || []).length,
      students: (_data.students || []).length,
      schedules: (_data.schedules || []).length
    };
  },

  // Utility
  clearAllData() {
    _data = { ...defaultData };
    saveData(_data);
  },

  // --- Student Attendance Module ---

  getStudents() {
    return _data.students || [];
  },
  addStudent(student) {
    if (!_data.students) _data.students = [];
    const newStudent = { id: generateId(), ...student };
    _data.students.push(newStudent);
    saveData(_data);
  },
  updateStudent(id, updates) {
    if (!_data.students) return;
    const idx = _data.students.findIndex(s => s.id === id);
    if (idx !== -1) {
      _data.students[idx] = { ..._data.students[idx], ...updates };
      saveData(_data);
    }
  },
  deleteStudent(id) {
    if (!_data.students) return;
    _data.students = _data.students.filter(s => s.id !== id);
    // Delete their attendance too
    if (_data.studentAttendance) {
      _data.studentAttendance = _data.studentAttendance.filter(a => a.studentId !== id);
    }
    saveData(_data);
  },
  clearStudents() {
    _data.students = [];
    _data.studentAttendance = [];
    saveData(_data);
  },

  getStudentAttendance() {
    return _data.studentAttendance || [];
  },
  saveStudentAttendance(records) {
    // records: array of { studentId, date, status, notes }
    if (!_data.studentAttendance) _data.studentAttendance = [];

    records.forEach(record => {
      // Check if record exists for this student on this date
      const idx = _data.studentAttendance.findIndex(a => a.studentId === record.studentId && a.date === record.date);
      if (idx !== -1) {
        // Update
        _data.studentAttendance[idx] = { ..._data.studentAttendance[idx], ...record };
      } else {
        // Create
        _data.studentAttendance.push({ id: generateId(), ...record });
      }
    });

    saveData(_data);
  },
  saveOneStudentAttendance(record) {
    // record: { studentId, date, status, notes }
    if (!_data.studentAttendance) _data.studentAttendance = [];
    const idx = _data.studentAttendance.findIndex(a => a.studentId === record.studentId && a.date === record.date);
    if (record.status === '') {
      // Remove record if status is cleared
      if (idx !== -1) {
        _data.studentAttendance.splice(idx, 1);
      }
    } else if (idx !== -1) {
      _data.studentAttendance[idx] = { ..._data.studentAttendance[idx], ...record };
    } else {
      _data.studentAttendance.push({ id: generateId(), ...record });
    }
    saveData(_data);
  },

  // Utility
  reload() {
    _data = loadData();
  }
};

export default DataStore;
