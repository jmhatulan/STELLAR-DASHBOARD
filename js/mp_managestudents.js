const BASE_URL = 'https://stellar-backend-ki78.onrender.com/api/admin';

const getHeaders = () => ({
    'Content-Type': 'application/json',
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

    if (!grade || !section) return notify('Please enter grade and section.', true);

    try {
        const response = await fetch(`${BASE_URL}/class/view`, {
            method: 'GET',
            headers: getHeaders(),
            body: JSON.stringify({ grade: Number(grade), section })
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

    try {
        const response = await fetch(`${BASE_URL}/class/view-all`, {
            method: 'GET',
            headers: getHeaders(),
            body: JSON.stringify({ grade: Number(grade), section })
        });

        const data = await response.json();
        if (response.ok && data.students) {
            downloadCSV(data.students, `Archive_G${grade}_${section}.csv`);
        } else {
            notify('No data found.', true);
        }
    } catch (err) {
        notify('Archive failed.', true);
    }
}

async function onUpdate() {
    const payload = {
        prevGrade: Number(document.getElementById('grade').value),
        prevSection: document.getElementById('section').value,
        newGrade: Number(document.getElementById('newGrade').value),
        newSection: document.getElementById('newSection').value
    };

    try {
        const response = await fetch(`${BASE_URL}/class/update`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(payload)
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

    if (!confirm('Permanently delete this class?')) return;

    try {
        const response = await fetch(`${BASE_URL}/class/delete`, {
            method: 'DELETE',
            headers: getHeaders(),
            body: JSON.stringify({ grade: Number(grade), section })
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

function downloadCSV(students, filename) {
    const headers = ["UserID", "Name", "Gender", "XP"];
    const rows = students.map(s => [s.userID, s.name, s.gender, s.progress?.experiencePoints || 0]);
    const content = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}