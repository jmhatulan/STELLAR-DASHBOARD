const BASE_URL = 'https://stellar-backend-ki78.onrender.com/api/admin';

const sectionsMap = {
    "4": ["Humanity", "Sincerity"],
    "5": ["Efficient", "Obedient"],
    "6": ["Excellence", "Perseverance"]
};

let currentStudents = [];
let uploadedData = [];

function updateSections(gradeId, sectionId) {
    const grade = document.getElementById(gradeId).value;
    const sectionSelect = document.getElementById(sectionId);
    sectionSelect.innerHTML = '<option value="">Select</option>';
    if (grade && sectionsMap[grade]) {
        sectionsMap[grade].forEach(sec => {
            const opt = document.createElement('option');
            opt.value = sec;
            opt.textContent = sec;
            sectionSelect.appendChild(opt);
        });
    }
}

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

function openTab(evt, tabId) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) contents[i].classList.remove("active");
    const links = document.getElementsByClassName("tab-link");
    for (let i = 0; i < links.length; i++) links[i].classList.remove("active");
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

async function onView() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s) return;
    try {
        const res = await fetch(`${BASE_URL}/class/view?grade=${g}&section=${encodeURIComponent(s)}`, { headers: getHeaders() });
        const d = await res.json();
        if (res.ok) {
            currentStudents = d.students;
            renderStudents(currentStudents);
        }
    } catch (e) { notify("Network error", true); }
}

function filterStudents() {
    const q = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = currentStudents.filter(s => s.name.toLowerCase().includes(q));
    renderStudents(filtered);
}

function renderStudents(students) {
    const tbody = document.getElementById('studentRows');
    const countBadge = document.getElementById('studentCount');
    tbody.innerHTML = '';
    countBadge.textContent = `${students.length} Students`;

    students.forEach((s, i) => {
        const gClass = s.gender?.toLowerCase() === 'male' ? 'male' : 'female';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong style="color: #0f172a;">${s.name}</strong></td>
            <td><span class="gender-tag ${gClass}">${s.gender}</span></td>
            <td>
                <span id="u-txt-${i}" style="font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${s.username || ''}</span>
                <input type="text" style="display:none; width: 140px;" value="${s.username || ''}" id="u-in-${i}" data-old="${s.username || ''}">
            </td>
            <td>
                <span id="p-txt-${i}" style="color: #cbd5e1;">••••••••</span>
                <input type="password" style="display:none; width: 140px;" placeholder="New password" id="p-in-${i}">
            </td>
            <td style="text-align: right;">
                <button id="e-btn-${i}" onclick="toggleEdit(${i}, true)" style="background: none; color: #3b82f6; cursor: pointer; border:none; font-weight:600;">Edit</button>
                <div id="ctrl-${i}" style="display:none; gap:12px; justify-content: flex-end;">
                    <button onclick="onSaveCredentials(${i})" style="color: #059669; background:none; border:none; cursor:pointer; font-weight:700;">Save</button>
                    <button onclick="toggleEdit(${i}, false)" style="color: #64748b; background:none; border:none; cursor:pointer;">Cancel</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    document.getElementById('studentDisplay').style.display = 'block';
}

function toggleEdit(i, editing) {
    document.getElementById(`u-txt-${i}`).style.display = editing ? 'none' : 'inline';
    document.getElementById(`u-in-${i}`).style.display = editing ? 'inline-block' : 'none';
    document.getElementById(`p-txt-${i}`).style.display = editing ? 'none' : 'inline';
    document.getElementById(`p-in-${i}`).style.display = editing ? 'inline-block' : 'none';
    document.getElementById(`e-btn-${i}`).style.display = editing ? 'none' : 'inline-block';
    document.getElementById(`ctrl-${i}`).style.display = editing ? 'flex' : 'none';
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
            notify("Account updated");
            onView();
        } else {
            const d = await res.json(); notify(d.message, true);
        }
    } catch (e) { notify("Update failed", true); }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        uploadedData = json.map(row => {
            const n = {};
            Object.keys(row).forEach(k => n[k.toLowerCase().trim()] = row[k]);
            return n;
        });
        renderRegPreview();
    };
    reader.readAsArrayBuffer(file);
}

function renderRegPreview() {
    const tbody = document.getElementById('previewRows');
    tbody.innerHTML = '';
    uploadedData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.name || ''}</td><td>${item.gender || ''}</td><td>${item.username || ''}</td><td>${item.password || ''}</td>`;
        tbody.appendChild(row);
    });
    document.getElementById('previewContainer').style.display = 'block';
}

async function onConfirmRegistration() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s) return notify("Select a Grade and Section first", true);

    const users = uploadedData.map(u => ({
        name: u.name,
        gender: u.gender,
        username: String(u.username),
        password: String(u.password),
        gradeLevel: Number(g),
        section: s
    }));

    try {
        const res = await fetch(`${BASE_URL}/class/create`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ users })
        });
        if (res.ok) {
            notify("Registration complete");
            document.getElementById('previewContainer').style.display = 'none';
            onView();
        }
    } catch (e) { notify("Registration failed", true); }
}

async function onUpdate() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    const ng = document.getElementById('newGrade').value;
    const ns = document.getElementById('newSection').value;
    if (!ng || !ns) return notify("Select target location", true);
    try {
        const res = await fetch(`${BASE_URL}/class/update?prevGrade=${g}&prevSection=${encodeURIComponent(s)}&newGrade=${ng}&newSection=${encodeURIComponent(ns)}`, {
            method: 'PATCH',
            headers: getHeaders()
        });
        if (res.ok) {
            notify("Students migrated");
            document.getElementById('grade').value = ng;
            updateSections('grade', 'section');
            document.getElementById('section').value = ns;
            onView();
        }
    } catch (e) { notify("Migration failed", true); }
}

async function onDelete() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s || !confirm("Permanently delete students in this section?")) return;
    try {
        const res = await fetch(`${BASE_URL}/class/delete?grade=${g}&section=${encodeURIComponent(s)}`, { method: 'DELETE', headers: getHeaders() });
        if (res.ok) {
            notify("Section cleared");
            onView();
        }
    } catch (e) { notify("Delete failed", true); }
}

async function onArchive() {
    const g = document.getElementById('grade').value;
    const s = document.getElementById('section').value;
    if (!g || !s) return notify("Select a class first", true);
    try {
        const res = await fetch(`${BASE_URL}/class/archive?grade=${g}&section=${encodeURIComponent(s)}`, { headers: getHeaders() });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_G${g}_${s}.zip`;
        a.click();
    } catch (e) { notify("Archive failed", true); }
}