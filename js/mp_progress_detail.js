document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com';

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Get grade and section from sessionStorage
  const gradeLevel = sessionStorage.getItem('selectedGrade');
  const section = sessionStorage.getItem('selectedSection');

  if (!gradeLevel || !section) {
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: No class selected. Please go back to Progress.</p>';
    return;
  }

  let selectedStudentId = null;
  const chartInstances = {};

  // Update page title
  document.querySelector('h1').textContent = `Student Progress - Grade ${gradeLevel} ${section}`;

  // Fetch students in the class
  async function fetchClassStudents() {
    console.log('Fetching students for Grade:', gradeLevel, 'Section:', section);
    try {
      const url = `${API_BASE_URL}/api/admin/class/students?gradeLevel=${gradeLevel}&section=${section}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const students = await response.json();
      console.log('Class students retrieved:', students);
      
      if (!Array.isArray(students)) {
        console.error('Students response is not an array:', students);
        return;
      }

      if (students.length === 0) {
        console.warn('No students found for this class');
      }

      populateStudentList(students);

      // Select first student by default
      if (students.length > 0) {
        console.log('Selecting first student:', students[0].name);
        selectStudent(students[0].userID);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
    }
  }

  // Populate the student list
  function populateStudentList(students) {
    console.log('Populating student list with', students.length, 'students');
    const studentList = document.querySelector('.student-list');
    if (!studentList) {
      console.error('Student list container not found');
      return;
    }

    // Find or create items container
    let itemsContainerEl = studentList.querySelector('.student-list-items');
    if (!itemsContainerEl) {
      itemsContainerEl = document.createElement('div');
      itemsContainerEl.className = 'student-list-items';
      itemsContainerEl.style.display = 'flex';
      itemsContainerEl.style.flexDirection = 'column';
      itemsContainerEl.style.flex = '1';
      itemsContainerEl.style.overflowY = 'auto';
      studentList.appendChild(itemsContainerEl);
    }

    // Clear existing items
    itemsContainerEl.innerHTML = '';

    students.forEach(student => {
      const item = document.createElement('div');
      item.className = 'student-list-item';
      item.style.cursor = 'pointer';
      
      // Calculate days since last login
      let lastLoginText = 'Never logged in';
      if (student.lastLogin) {
        const lastLoginDate = new Date(student.lastLogin);
        const today = new Date();
        const diffTime = today.getTime() - lastLoginDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          lastLoginText = 'Last Login Today';
        } else if (diffDays === 1) {
          lastLoginText = 'Last Login Yesterday';
        } else {
          lastLoginText = `Last Login ${diffDays} days ago`;
        }
      }

      item.innerHTML = `
        <div class="student-list-avatar"></div>
        <div class="student-list-info">
          <h4>${student.name}</h4>
          <p>${lastLoginText}</p>
        </div>
      `;

      // Add click handler
      item.addEventListener('click', function() {
        console.log('Clicked on student:', student.name, 'ID:', student.userID);
        selectStudent(student.userID);
      });
      
      itemsContainerEl.appendChild(item);
      console.log('Added student to list:', student.name);
    });
    
    console.log('Student list population complete. Total items:', itemsContainerEl.children.length);
  }

  // Fetch and display student details
  async function selectStudent(userID) {
    console.log('Selecting student with ID:', userID);
    selectedStudentId = userID;

    try {
      const url = `${API_BASE_URL}/api/admin/student/details?userID=${userID}`;
      console.log('Fetching student details from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Student details response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Student details retrieved:', data);
      displayStudentDetails(data);
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  }

  // Display student details
  function displayStudentDetails(data) {
    const { student, playtime, challengeAttempts, challengePerformance, achievements, engagement, weeklyAverages } = data;

    // Update student card
    const studentInfoH3 = document.querySelector('.student-info h3');
    const studentInfoP = document.querySelector('.student-info p');
    if (studentInfoH3) studentInfoH3.textContent = student.name;
    if (studentInfoP) studentInfoP.textContent = `Grade ${student.gradeLevel} - ${student.section}`;

    // Update playtime section
    const playtimeItems = document.querySelectorAll('.playtime-item');
    if (playtimeItems[0]) {
      playtimeItems[0].innerHTML = `
        <span class="playtime-label">Reading Streak:</span>
        <br>${playtime.readingStreak} Days Active
      `;
    }
    if (playtimeItems[1]) {
      const lastActiveDate = playtime.lastActive 
        ? new Date(playtime.lastActive).toLocaleString()
        : 'Never';
      playtimeItems[1].innerHTML = `
        <span class="playtime-label">Last Active:</span>
        <br>${lastActiveDate}
      `;
    }

    // Update challenge attempts
    const challengeBars = document.querySelectorAll('.challenge-bar');
    if (challengeBars.length >= 3) {
      // Text Extract
      challengeBars[0].querySelector('.bar-label').textContent = 'Text Extract';
      challengeBars[0].querySelector('.bar-value').textContent = challengeAttempts.textExtract;
      challengeBars[0].querySelector('.bar-fill').style.width = 
        Math.min(challengeAttempts.textExtract * 10, 100) + '%';

      // Two Truths
      challengeBars[1].querySelector('.bar-label').textContent = 'Two Truths';
      challengeBars[1].querySelector('.bar-value').textContent = challengeAttempts.twoTruths;
      challengeBars[1].querySelector('.bar-fill').style.width = 
        Math.min(challengeAttempts.twoTruths * 10, 100) + '%';

      // Statement Scrutinize
      challengeBars[2].querySelector('.bar-label').textContent = 'Statement Scrutinize';
      challengeBars[2].querySelector('.bar-value').textContent = challengeAttempts.statementScrutinize;
      challengeBars[2].querySelector('.bar-fill').style.width = 
        Math.min(challengeAttempts.statementScrutinize * 10, 100) + '%';
    }

    // Update challenge performance
    const performanceScore = document.querySelector('.performance-score');
    if (performanceScore) {
      performanceScore.textContent = challengePerformance + ' PTS.';
    }

    // Update achievements
    const achievementsGrid = document.querySelector('.achievements-grid');
    if (achievementsGrid) {
      // Always clear the grid first
      achievementsGrid.innerHTML = '';
      
      // Then add achievements if any exist
      if (achievements && achievements.length > 0) {
        achievements.slice(0, 8).forEach(achievement => {
          const badge = document.createElement('div');
          badge.className = 'achievement-badge';
          badge.title = achievement.name;
          badge.innerHTML = achievement.id % 4 === 0 ? '🎮' : achievement.id % 4 === 1 ? '🛡️' : achievement.id % 4 === 2 ? '⭐' : '🏆';
          achievementsGrid.appendChild(badge);
        });
      }
    }

    // Update engagement chart
    const engagementCtx = document.getElementById('engagement-chart');
    if (engagementCtx && engagement.dailyLogins.length > 0) {
      if (chartInstances['engagement-chart']) {
        chartInstances['engagement-chart'].destroy();
      }

      // Get last 30 days
      const labels = engagement.dailyLogins.map(d => {
        const date = new Date(d.date);
        return (date.getMonth() + 1) + '/' + date.getDate();
      });
      const data = engagement.dailyLogins.map(d => d.count);

      chartInstances['engagement-chart'] = new Chart(engagementCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Daily Login',
            data,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { font: { size: 10 } }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    }

    // Update weekly average score charts
    updateWeeklyCharts(weeklyAverages);
  }

  // Update weekly average score charts
  function updateWeeklyCharts(weeklyAverages) {
    console.log('Updating weekly charts with data:', weeklyAverages);
    
    const games = [
      { key: 'textExtract', id: 'text-extract-chart', label: 'Text Extract' },
      { key: 'twoTruths', id: 'two-truths-chart', label: 'Two Truths' },
      { key: 'statementScrutinize', id: 'statement-scrutinize-chart', label: 'Statement Scrutinize' }
    ];

    games.forEach(game => {
      const ctx = document.getElementById(game.id);
      if (!ctx) {
        console.warn(`Canvas element ${game.id} not found`);
        return;
      }

      if (chartInstances[game.id]) {
        chartInstances[game.id].destroy();
      }

      const data = weeklyAverages[game.key] || [];
      console.log(`Game ${game.key} data:`, data);

      if (!data || data.length === 0) {
        console.log(`No data for ${game.key}, showing placeholder`);
        // Show placeholder text
        const parentDiv = ctx.parentElement;
        parentDiv.innerHTML = `<p style="text-align: center; color: #999; padding: 40px 0;">No data available</p>`;
        return;
      }

      const labels = data.map((d, idx) => {
        const weeksAgo = d.week;
        if (weeksAgo === 0) return 'This Week';
        if (weeksAgo === 1) return 'Last Week';
        return `${weeksAgo} Weeks Ago`;
      });
      const scores = data.map(d => d.score);

      console.log(`Creating chart for ${game.key} with labels:`, labels, 'scores:', scores);

      chartInstances[game.id] = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Average Score',
            data: scores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 500,
              ticks: { font: { size: 10 } }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          }
        }
      });
    });
  }

  // Initialize
  fetchClassStudents();
});

// PDF Export Function
function exportToPDF() {
  const studentName = document.querySelector('.student-info h3')?.textContent || 'Student Progress';
  const studentGrade = document.querySelector('.student-info p')?.textContent || 'N/A';
  const playtimeItems = document.querySelectorAll('.playtime-item');
  const performanceScore = document.querySelector('.performance-score')?.textContent || '0 PTS.';
  const challengeBars = document.querySelectorAll('.challenge-bar');
  
  let challengeAttemptsHTML = '';
  challengeBars.forEach(bar => {
    const label = bar.querySelector('.bar-label')?.textContent || '';
    const value = bar.querySelector('.bar-value')?.textContent || '0';
    challengeAttemptsHTML += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${value}</td></tr>`;
  });

  let playtimeHTML = '';
  playtimeItems.forEach(item => {
    playtimeHTML += `<p style="margin: 5px 0; font-size: 12px; line-height: 1.6;">${item.innerHTML}</p>`;
  });

  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
        }
        .report-header {
          margin-bottom: 10px;
        }
        .student-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #000;
        }
        .student-grade {
          font-size: 12px;
          color: #666;
          margin-bottom: 10px;
        }
        .separator {
          border-top: 2px solid #000;
          margin-bottom: 20px;
        }
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          background: #f5f5f5;
          padding: 8px 10px;
          margin-bottom: 10px;
          border-left: 4px solid #10b981;
        }
        .section-content {
          padding: 0 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-box {
          padding: 10px;
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.6;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #eee;
          font-size: 12px;
        }
        .metric:last-child {
          border-bottom: none;
        }
        .metric-label {
          font-weight: 500;
          color: #666;
        }
        .metric-value {
          font-weight: bold;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="student-name">${studentName}</div>
        <div class="student-grade">${studentGrade}</div>
      </div>
      <div class="separator"></div>

      <div class="two-column">
        <div class="section">
          <div class="section-title">📊 Playtime Activity</div>
          <div class="info-box">
            ${playtimeHTML}
          </div>
        </div>

        <div class="section">
          <div class="section-title">🎯 Challenge Performance</div>
          <div class="info-box">
            <div class="metric">
              <span class="metric-label">Average Score:</span>
              <span class="metric-value">${performanceScore}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📈 Total Challenge Attempts</div>
        <div class="section-content">
          <table>
            <tbody>
              ${challengeAttemptsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📋 Report Generated</div>
        <div class="info-box" style="font-size: 11px;">
          Generated on: ${new Date().toLocaleString()}<br>
          Report Type: Student Progress Detail
        </div>
      </div>
    </body>
    </html>
  `;

  const opt = {
    margin: 10,
    filename: `${studentName}_Progress_Report.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opt).from(reportHTML).save();
}

// Handle back button click with fade transition
function handleBackClick() {
  const iframe = window.parent.document.getElementById('page-progress');
  if (iframe) {
    iframe.style.opacity = '0';
    iframe.style.transition = 'opacity 0.5s ease-in-out';
    setTimeout(() => {
      iframe.src = 'mp_progress_section.html';
      iframe.onload = function() {
        setTimeout(() => { iframe.style.opacity = '1'; }, 10);
      };
    }, 250);
  }
}
