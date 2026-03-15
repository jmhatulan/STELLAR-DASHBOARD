const BASE_URL = 'https://stellar-backend-ki78.onrender.com/api/admin';

const sectionsMap = {
    "4": ["Humanity", "Sincerity"],
    "5": ["Efficient", "Obedient"],
    "6": ["Excellence", "Perseverance"]
};

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
    setTimeout(() => { panel.style.display = 'none'; }, 4000);
};

async function onView() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;
    if (!grade || !section) return notify('Please select grade and section.', true);
    try {
        const response = await fetch(`${BASE_URL}/class/view?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });
        const data = await response.json();
        if (response.ok) {
            renderStudents(data.students);
        } else {
            notify(data.message, true);
        }
    } catch (err) {
        notify('Server connection failed.', true);
    }
}

function renderStudents(students) {
    const display = document.getElementById('studentDisplay');
    const tbody = document.getElementById('studentRows');
    tbody.innerHTML = '';
    if (!students || students.length === 0) {
        display.style.display = 'none';
        return notify('No students found.', true);
    }
    students.forEach((s, index) => {
        const row = document.createElement('tr');
        row.id = `row-${index}`;
        row.innerHTML = `
            <td>${s.name}</td>
            <td>${s.gender}</td>
            <td>
                <span class="row-text" id="user-text-${index}">${s.username || 'N/A'}</span>
                <input type="text" class="row-input" value="${s.username || ''}" id="user-input-${index}" data-old="${s.username || ''}">
            </td>
            <td>
                <span class="row-text" id="pass-text-${index}">********</span>
                <input type="password" class="row-input" placeholder="New Password" id="pass-input-${index}">
            </td>
            <td>
                <button class="btn-edit" id="btn-edit-${index}" onclick="toggleEdit(${index}, true)">⚙</button>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-save" id="btn-save-${index}" onclick="onSaveCredentials(${index})">Save</button>
                    <button class="btn-cancel" id="btn-cancel-${index}" onclick="toggleEdit(${index}, false)">Cancel</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    display.style.display = 'block';
}

function toggleEdit(index, isEditing) {
    const userText = document.getElementById(`user-text-${index}`);
    const userInput = document.getElementById(`user-input-${index}`);
    const passText = document.getElementById(`pass-text-${index}`);
    const passInput = document.getElementById(`pass-input-${index}`);
    const editBtn = document.getElementById(`btn-edit-${index}`);
    const saveBtn = document.getElementById(`btn-save-${index}`);
    const cancelBtn = document.getElementById(`btn-cancel-${index}`);

    userText.style.display = isEditing ? 'none' : 'inline';
    userInput.style.display = isEditing ? 'block' : 'none';
    passText.style.display = isEditing ? 'none' : 'inline';
    passInput.style.display = isEditing ? 'block' : 'none';

    editBtn.style.display = isEditing ? 'none' : 'inline-block';
    saveBtn.style.display = isEditing ? 'inline-block' : 'none';
    cancelBtn.style.display = isEditing ? 'inline-block' : 'none';

    if (!isEditing) {
        userInput.value = userInput.getAttribute('data-old');
        passInput.value = '';
    }
}

async function onSaveCredentials(index) {
    const userInput = document.getElementById(`user-input-${index}`);
    const passInput = document.getElementById(`pass-input-${index}`);
    const oldUsername = userInput.getAttribute('data-old');
    const newUsername = userInput.value.trim();
    const newPassword = passInput.value.trim();

    if (!oldUsername) return notify("Error: No identifier found.", true);

    try {
        const response = await fetch(`${BASE_URL}/student/credentials`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                username: oldUsername,
                newUsername: newUsername !== oldUsername ? newUsername : undefined,
                newPassword: newPassword || undefined
            })
        });

        const data = await response.json();
        if (response.ok) {
            notify("Credentials updated.");
            userInput.setAttribute('data-old', newUsername);
            document.getElementById(`user-text-${index}`).textContent = newUsername;
            toggleEdit(index, false);
        } else {
            notify(data.message, true);
        }
    } catch (err) {
        notify("Failed to update.", true);
    }
}

async function onArchive() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;
    if (!grade || !section) return notify('Select Grade and Section.', true);
    try {
        const response = await fetch(`${BASE_URL}/class/archive?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });
        if (!response.ok) throw new Error('Archive failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Archive_Grade${grade}_${section}.zip`;
        a.click();
        notify('Archive downloaded.');
    } catch (err) { notify(err.message, true); }
}

async function onUpdate() {
    const prevGrade = document.getElementById('grade').value;
    const prevSection = document.getElementById('section').value;
    const newGrade = document.getElementById('newGrade').value;
    const newSection = document.getElementById('newSection').value;
    if (!prevGrade || !prevSection || !newGrade || !newSection) return notify('All fields required.', true);
    const params = new URLSearchParams({ prevGrade, prevSection, newGrade, newSection });
    try {
        const response = await fetch(`${BASE_URL}/class/update?${params.toString()}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });
        const data = await response.json();
        if (response.ok) { notify(data.message); onView(); }
        else { notify(data.message, true); }
    } catch (err) { notify('Update failed.', true); }
}

async function onDelete() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;
    if (!grade || !section || !confirm('Permanently delete this class?')) return;
    try {
        const response = await fetch(`${BASE_URL}/class/delete?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` }
        });
        const data = await response.json();
        if (response.ok) { notify('Class deleted.'); document.getElementById('studentDisplay').style.display = 'none'; }
        else { notify(data.message, true); }
    } catch (err) { notify('Delete failed.', true); }
}