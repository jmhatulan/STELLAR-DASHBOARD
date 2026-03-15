const BASE_URL = 'https://stellar-backend-ki78.onrender.com/api/admin';

const sectionsMap = {
    "4": ["Humanity", "Sincerity"],
    "5": ["Efficient", "Obedient"],
    "6": ["Excellence", "Perseverance"]
};

let uploadedData = [];

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
    } else {
        sectionSelect.innerHTML = '<option value="">Select Grade First</option>';
    }
}

const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
    'Content-Type': 'application/json'
});

const notify = (msg, isErr = false) => {
    const panel = document.getElementById('notice');
    panel.textContent = msg;
    panel.className = isErr ? 'status-panel error' : 'status-panel success';
    panel.style.display = 'block';
    setTimeout(() => { panel.style.display = 'none'; }, 5000);
};

// --- BATCH REGISTER ---
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        uploadedData = json.map(row => {
            const norm = {};
            Object.keys(row).forEach(k => norm[k.toLowerCase().trim()] = row[k]);
            return norm;
        });
        renderPreview();
    };
    reader.readAsArrayBuffer(file);
}

function renderPreview() {
    const tbody = document.getElementById('previewRows');
    tbody.innerHTML = '';
    uploadedData.forEach(item => {
        tbody.innerHTML += `<tr><td>${item.name || ''}</td><td>${item.gender || ''}</td><td>${item.username || ''}</td><td>${item.password || ''}</td></tr>`;
    });
    document.getElementById('previewContainer').style.display = 'block';
}

function clearPreview() {
    uploadedData = [];
    document.getElementById('previewContainer').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

async function onConfirmRegistration() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;

    if (!grade || !section) {
        return notify("Select target Grade and Section in 'Search & Controls' first.", true);
    }

    if (uploadedData.length === 0) return notify("No data to upload.", true);

    const users = uploadedData.map(u => ({
        name: u.name,
        gender: u.gender,
        username: String(u.username),
        password: String(u.password),
        gradeLevel: Number(grade),
        section: section
    }));

    try {
        notify("Uploading students...");
        const response = await fetch(`${BASE_URL}/class/create`, {
            method: 'POST', // Updated to POST
            headers: getHeaders(),
            body: JSON.stringify({ users }) // Data sent in body
        });

        const data = await response.json();
        if (response.ok) {
            notify(`Successfully registered ${data.usersCreated} students.`);
            clearPreview();
            onView(); // Refresh the list
        } else {
            notify(data.message || "Registration failed.", true);
        }
    } catch (e) {
        notify("Server error during registration.", true);
    }
}

// --- MIGRATION ---
async function onUpdate() {
    const prevGrade = document.getElementById('grade').value;
    const prevSection = document.getElementById('section').value;
    const newGrade = document.getElementById('newGrade').value;
    const newSection = document.getElementById('newSection').value;

    if (!prevGrade || !prevSection || !newGrade || !newSection) return notify("Select current class and target class.", true);

    try {
        const response = await fetch(`${BASE_URL}/class/update?prevGrade=${prevGrade}&prevSection=${encodeURIComponent(prevSection)}&newGrade=${newGrade}&newSection=${encodeURIComponent(newSection)}`, {
            method: 'PATCH',
            headers: getHeaders()
        });
        if (response.ok) {
            notify("Students migrated successfully.");
            document.getElementById('grade').value = newGrade;
            updateSections('grade', 'section');
            document.getElementById('section').value = newSection;
            onView();
        } else {
            const d = await response.json(); notify(d.message, true);
        }
    } catch (e) { notify("Migration failed.", true); }
}

// --- ROSTER & CREDENTIALS ---
async function onView() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s) return notify("Select Grade and Section.", true);
    try {
        const res = await fetch(`${BASE_URL}/class/view?grade=${g}&section=${encodeURIComponent(s)}`, { headers: getHeaders() });
        const d = await res.json();
        if (res.ok) renderStudents(d.students);
    } catch (e) { notify("Failed to load roster.", true); }
}

function renderStudents(students) {
    const tbody = document.getElementById('studentRows');
    tbody.innerHTML = '';
    students.forEach((s, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s.name}</td>
            <td>${s.gender}</td>
            <td>
                <span id="u-txt-${i}">${s.username || ''}</span>
                <input type="text" class="row-input" value="${s.username || ''}" id="u-in-${i}" data-old="${s.username || ''}">
            </td>
            <td>
                <span id="p-txt-${i}">********</span>
                <input type="password" class="row-input" placeholder="New Password" id="p-in-${i}">
            </td>
            <td>
                <button class="btn-edit-icon" id="e-btn-${i}" onclick="toggleEdit(${i}, true)">✎</button>
                <div id="ctrl-${i}" style="display:none; gap:5px;">
                    <button class="btn-save" onclick="onSaveCredentials(${i})">Save</button>
                    <button class="btn-cancel" onclick="toggleEdit(${i}, false)">Cancel</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    document.getElementById('studentDisplay').style.display = 'block';
}

function toggleEdit(i, editing) {
    document.getElementById(`u-txt-${i}`).style.display = editing ? 'none' : 'inline';
    document.getElementById(`u-in-${i}`).style.display = editing ? 'block' : 'none';
    document.getElementById(`p-txt-${i}`).style.display = editing ? 'none' : 'inline';
    document.getElementById(`p-in-${i}`).style.display = editing ? 'block' : 'none';
    document.getElementById(`e-btn-${i}`).style.display = editing ? 'none' : 'inline-block';
    document.getElementById(`ctrl-${i}`).style.display = editing ? 'flex' : 'none';

    if (!editing) {
        // Reset values on cancel
        const input = document.getElementById(`u-in-${i}`);
        input.value = input.getAttribute('data-old');
        document.getElementById(`p-in-${i}`).value = '';
    }
}

async function onSaveCredentials(i) {
    const uIn = document.getElementById(`u-in-${i}`);
    const pIn = document.getElementById(`p-in-${i}`);
    const old = uIn.getAttribute('data-old');

    try {
        const res = await fetch(`${BASE_URL}/student/credentials`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                username: old,
                newUsername: uIn.value !== old ? uIn.value : undefined,
                newPassword: pIn.value || undefined
            })
        });
        if (res.ok) {
            notify("Saved.");
            uIn.setAttribute('data-old', uIn.value);
            document.getElementById(`u-txt-${i}`).textContent = uIn.value;
            toggleEdit(i, false);
        } else {
            const d = await res.json(); notify(d.message, true);
        }
    } catch (e) { notify("Save failed.", true); }
}

// --- DELETE / ARCHIVE ---
async function onDelete() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s || !confirm("Delete class?")) return;
    try {
        const res = await fetch(`${BASE_URL}/class/delete?grade=${g}&section=${encodeURIComponent(s)}`, { method: 'DELETE', headers: getHeaders() });
        if (res.ok) { notify("Deleted."); document.getElementById('studentDisplay').style.display = 'none'; }
    } catch (e) { notify("Delete failed.", true); }
}

async function onArchive() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s) return notify("Select class.", true);
    try {
        const res = await fetch(`${BASE_URL}/class/archive?grade=${g}&section=${encodeURIComponent(s)}`, { headers: getHeaders() });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Archive_G${g}_${s}.zip`; a.click();
    } catch (e) { notify("Archive failed.", true); }
}