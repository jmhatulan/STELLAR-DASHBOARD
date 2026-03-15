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
    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
});

const notify = (msg, isErr = false) => {
    const panel = document.getElementById('notice');
    panel.textContent = msg;
    panel.className = isErr ? 'status-panel error' : 'status-panel success';
    panel.style.display = 'block';
    setTimeout(() => { panel.style.display = 'none'; }, 5000);
};

async function onView() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;

    if (!grade || !section) return notify('Please select grade and section.', true);

    try {
        const response = await fetch(`${BASE_URL}/class/view?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: getHeaders()
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

async function onArchive() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;

    if (!grade || !section) return notify('Select Grade and Section to archive.', true);

    try {
        notify(`Preparing archive...`);
        const response = await fetch(`${BASE_URL}/class/archive?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'GET',
            headers: getHeaders()
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Archive failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Archive_Grade${grade}_${section}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        notify('Archive downloaded.');
    } catch (err) {
        notify(err.message, true);
    }
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
            headers: getHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            notify(data.message);
            onView();
        } else {
            notify(data.message, true);
        }
    } catch (err) {
        notify('Update failed.', true);
    }
}

async function onDelete() {
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;
    if (!grade || !section) return;
    if (!confirm('Permanently delete this class?')) return;

    try {
        const response = await fetch(`${BASE_URL}/class/delete?grade=${grade}&section=${encodeURIComponent(section)}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            notify('Class deleted successfully.');
            document.getElementById('studentDisplay').style.display = 'none';
        } else {
            notify(data.message, true);
        }
    } catch (err) {
        notify('Delete failed.', true);
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
    students.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.gender}</td></tr>`;
    });
    display.style.display = 'block';
}