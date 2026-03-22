const BASE_URL = 'https://stellar-backend-ki78.onrender.com/api/admin';

const sectionsMap = {
    "4": ["Humanity", "Sincerity"],
    "5": ["Efficient", "Obedient"],
    "6": ["Excellence", "Perseverance"]
};

let currentStudents = [];

const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
    'Content-Type': 'application/json'
});

const notify = (msg, isErr = false) => {
    const panel = document.getElementById('notice');
    panel.textContent = msg;
    panel.style.background = isErr ? '#dc2626' : '#059669';
    panel.style.display = 'block';
    setTimeout(() => { panel.style.display = 'none'; }, 4000);
};

// UI Logic: Tab Management & Global Filter Visibility
function openTab(evt, tabId) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-link").forEach(l => l.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");

    // NEW: Logic to hide filters if not on Manage Records (view-tab)
    const globalFilters = document.getElementById('global-filters');
    if (globalFilters) {
        if (tabId === 'view-tab') {
            globalFilters.style.visibility = 'visible';
        } else {
            globalFilters.style.visibility = 'hidden';
        }
    }

    if (tabId === 'reg-tab') checkBatchStatus();
}

function updateSections(gradeId, sectionId) {
    const grade = document.getElementById(gradeId).value;
    const sectionSelect = document.getElementById(sectionId);
    sectionSelect.innerHTML = '<option value="">Select Section</option>';
    if (grade && sectionsMap[grade]) {
        sectionsMap[grade].forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec;
            opt.textContent = sec;
            sectionSelect.appendChild(opt);
        });
    }
}

// --- 1. CLASS VIEW & EDITING ---

async function onView() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;
    if (!grade || !section) return;

    try {
        const res = await fetch(`${BASE_URL}/class/view?grade=${grade}&section=${encodeURIComponent(section)}`, { headers: getHeaders() });
        const data = await res.json();
        currentStudents = data.students || [];
        renderStudentTable(currentStudents);
    } catch (e) { notify("Error loading class", true); }
}

function renderStudentTable(students) {
    const tbody = document.getElementById('studentRows');
    document.getElementById('studentCount').textContent = `${students.length} Students`;

    tbody.innerHTML = students.map((s, i) => `
        <tr id="row-${i}">
            <td>${s.name}</td>
            <td>${s.gender}</td>
            <td id="user-display-${i}">${s.username}</td>
            <td id="pass-display-${i}">********</td>
            <td id="action-cell-${i}" style="text-align: right;">
                <button class="btn btn-outline" id="btn-edit-${i}" onclick="activateEditMode(${i}, '${s.username}')">Edit</button>
                <button class="btn btn-warning" onclick="onResetPassword('${s.name}')">Reset</button>
            </td>
        </tr>
    `).join('');
}

let editBackup = {};

function activateEditMode(index, originalUsername) {
    const userCell = document.getElementById(`user-display-${index}`);
    const passCell = document.getElementById(`pass-display-${index}`);
    const actionCell = document.getElementById(`action-cell-${index}`);

    // Store original HTML and data for cancelling
    editBackup[index] = {
        userHTML: userCell.innerHTML,
        passHTML: passCell.innerHTML,
        actionHTML: actionCell.innerHTML,
        username: originalUsername
    };

    userCell.innerHTML = `<input type="text" id="edit-user-${index}" value="${originalUsername}" style="width:100%; padding:4px;">`;
    passCell.innerHTML = `<input type="password" id="edit-pass-${index}" placeholder="New Password" style="width:100%; padding:4px;">`;

    actionCell.innerHTML = `
        <button class="btn btn-primary" onclick="onUpdateCredentials(${index}, '${originalUsername}')">Save</button>
        <button class="btn btn-outline" onclick="cancelEditMode(${index})">Cancel</button>
    `;
}

function cancelEditMode(index) {
    const userCell = document.getElementById(`user-display-${index}`);
    const passCell = document.getElementById(`pass-display-${index}`);
    const actionCell = document.getElementById(`action-cell-${index}`);

    const backup = editBackup[index];
    if (backup) {
        userCell.innerHTML = backup.userHTML;
        passCell.innerHTML = backup.passHTML;
        actionCell.innerHTML = backup.actionHTML;
        delete editBackup[index];
    }
}

async function onUpdateCredentials(index, originalUsername) {
    const newUsername = document.getElementById(`edit-user-${index}`).value;
    const newPassword = document.getElementById(`edit-pass-${index}`).value;

    const payload = {
        username: originalUsername,
        newUsername: newUsername !== originalUsername ? newUsername : undefined,
        newPassword: newPassword || undefined
    };

    try {
        const res = await fetch(`${BASE_URL}/student/credentials`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            notify("Credentials updated");
            onView();
        } else {
            const err = await res.json();
            notify(err.message, true);
        }
    } catch (e) { notify("Update failed", true); }
}

async function onResetPassword(name) {
    if (!confirm(`Reset password for ${name} to default (surname + current year)?`)) return;

    try {
        const res = await fetch(`${BASE_URL}/student/reset-password`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ name: name })
        });

        const data = await res.json();
        if (res.ok) {
            notify(data.message);
        } else {
            notify(data.message, true);
        }
    } catch (e) {
        notify("Reset request failed", true);
    }
}

// --- 2. INDIVIDUAL REGISTRATION ---

async function onRegisterStudent() {
    const payload = {
        name: document.getElementById('regName').value,
        gender: document.getElementById('regGender').value,
        username: document.getElementById('regUser').value,
        password: document.getElementById('regPass').value,
        gradeLevel: parseInt(document.getElementById('regGrade').value),
        section: document.getElementById('regSection').value
    };

    if (Object.values(payload).some(v => !v)) return notify("Fill all fields", true);

    try {
        const res = await fetch(`${BASE_URL}/student/register`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            notify("Student registered successfully");
            ['regName', 'regUser', 'regPass'].forEach(id => document.getElementById(id).value = '');
        } else {
            const err = await res.json();
            notify(err.message, true);
        }
    } catch (e) { notify("Registration failed", true); }
}

// --- 3. BATCH & MIGRATION ---

async function onBatchEnroll() {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files[0]) return notify("Select a CSV", true);

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const rows = e.target.result.split('\n').slice(1);
        const students = rows.filter(r => r.trim()).map(row => {
            const [Name, Gender, Username, Password] = row.split(',').map(c => c.trim().replace(/"/g, ''));
            return { Name, Gender, Username, Password };
        });

        try {
            const res = await fetch(`${BASE_URL}/class/batch-register`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ fileName: file.name, students })
            });
            const data = await res.json();
            notify(data.message, !res.ok);
        } catch (err) { notify("Batch process failed", true); }
    };
    reader.readAsText(file);
}

async function onExport() {
    const g = document.getElementById('expGrade').value;
    const s = document.getElementById('expSection').value;
    if (!g || !s) return notify("Select class", true);

    try {
        const res = await fetch(`${BASE_URL}/class/export?grade=${g}&section=${encodeURIComponent(s)}`, { headers: getHeaders() });
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `Migration_G${g}_${s}.csv`;
        a.click();
    } catch (e) { notify("Export failed", true); }
}

// --- 4. SYSTEM MAINTENANCE ---

async function onArchiveAll() {
    const startYear = document.getElementById('arcStart').value;
    const endYear = document.getElementById('arcEnd').value;

    if (!startYear || !endYear) {
        return notify("Please enter academic years", true);
    }

    notify("Archiving data to database...");

    try {
        const res = await fetch(`${BASE_URL}/class/archive-all`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ startYear, endYear })
        });

        const data = await res.json();

        if (res.ok) {
            // No download logic here, just a success message
            notify(data.message || "Archive saved to database successfully!");
        } else {
            notify(data.message || "Archive failed", true);
        }
    } catch (e) {
        console.error(e);
        notify("An error occurred during archiving", true);
    }
}

async function onDeleteAll() {
    if (!confirm("Permanently delete ALL student data?")) return;
    try {
        const res = await fetch(`${BASE_URL}/students/all`, { method: 'DELETE', headers: getHeaders() });
        if (res.ok) { notify("System purged"); onView(); }
    } catch (e) { notify("Purge failed", true); }
}

async function checkBatchStatus() {
    try {
        const res = await fetch(`${BASE_URL}/class/batch-status`, { headers: getHeaders() });
        const data = await res.json();
        document.getElementById('batchEnrollmentContainer').style.display = data.open ? 'block' : 'none';
    } catch (e) { }
}

function filterStudents() {
    const query = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = currentStudents.filter(s => s.name.toLowerCase().includes(query) || s.username.toLowerCase().includes(query));
    renderStudentTable(filtered);
}

window.onload = () => {
    checkBatchStatus();
};