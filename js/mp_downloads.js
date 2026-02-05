document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com';

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Store section data for second report
  let progressData = [];
  let sectionsByGrade = {};

  // Fetch progress data on load
  async function fetchProgressData() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/progress`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      progressData = await response.json();
      console.log('Progress data loaded:', progressData);

      // Organize sections by grade
      progressData.forEach(item => {
        if (!sectionsByGrade[item.gradeLevel]) {
          sectionsByGrade[item.gradeLevel] = [];
        }
        sectionsByGrade[item.gradeLevel].push(item.section);
      });

      console.log('Sections by grade:', sectionsByGrade);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      showStatus('status-report1', 'Error loading data. Please refresh the page.', 'error');
    }
  }

  // Update sections dropdown based on selected grade
  window.updateSections = function() {
    const gradeSelect = document.getElementById('gradeSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const downloadBtn = document.getElementById('downloadBtn2');
    
    const selectedGrade = gradeSelect.value;

    if (!selectedGrade) {
      sectionSelect.innerHTML = '<option value="">-- Select a grade first --</option>';
      sectionSelect.disabled = true;
      downloadBtn.disabled = true;
      return;
    }

    // Populate sections
    const sections = sectionsByGrade[selectedGrade] || [];
    sectionSelect.innerHTML = '<option value="">-- Choose Section --</option>';
    
    sections.forEach(section => {
      const option = document.createElement('option');
      option.value = section;
      option.textContent = `Section ${section}`;
      sectionSelect.appendChild(option);
    });

    sectionSelect.disabled = false;
    downloadBtn.disabled = sections.length === 0;

    // Enable download button when section is selected
    sectionSelect.onchange = function() {
      downloadBtn.disabled = !this.value;
    };
  };

  // Download Overall Report (All Grades and Sections)
  window.downloadOverallReport = async function() {
    const statusEl = document.getElementById('status-report1');
    showStatus('status-report1', 'Generating report...', 'loading');

    try {
      if (!progressData || progressData.length === 0) {
        throw new Error('No data available');
      }

      // Generate HTML report
      const reportHTML = generateOverallReportHTML(progressData);

      // Create PDF
      const opt = {
        margin: 10,
        filename: `STELLAR_Overall_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(reportHTML).save();
      showStatus('status-report1', '✓ Report downloaded successfully!', 'success');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('Error generating report:', error);
      showStatus('status-report1', 'Error generating report. Please try again.', 'error');
    }
  };

  // Download Section Report (All Students in Section)
  window.downloadSectionReport = async function() {
    const gradeSelect = document.getElementById('gradeSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const statusEl = document.getElementById('status-report2');

    const gradeLevel = gradeSelect.value;
    const section = sectionSelect.value;

    if (!gradeLevel || !section) {
      showStatus('status-report2', 'Please select both grade and section.', 'error');
      return;
    }

    showStatus('status-report2', 'Generating report...', 'loading');

    try {
      // Fetch students for this section
      const studentsResponse = await fetch(`${API_BASE_URL}/api/admin/class/students?gradeLevel=${gradeLevel}&section=${section}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!studentsResponse.ok) {
        throw new Error(`HTTP error! status: ${studentsResponse.status}`);
      }

      const students = await studentsResponse.json();
      console.log('Students fetched:', students);

      // Generate HTML report
      const reportHTML = generateSectionReportHTML(gradeLevel, section, students);

      // Create PDF
      const opt = {
        margin: 10,
        filename: `STELLAR_Grade${gradeLevel}_Section${section}_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(reportHTML).save();
      showStatus('status-report2', '✓ Report downloaded successfully!', 'success');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('Error generating section report:', error);
      showStatus('status-report2', 'Error generating report. Please try again.', 'error');
    }
  };

  // Generate Overall Report HTML
  function generateOverallReportHTML(data) {
    // Group by grade level
    const gradeMap = {};
    data.forEach(item => {
      if (!gradeMap[item.gradeLevel]) {
        gradeMap[item.gradeLevel] = [];
      }
      gradeMap[item.gradeLevel].push(item);
    });

    let gradesHTML = '';
    Object.keys(gradeMap).sort((a, b) => a - b).forEach(grade => {
      const sections = gradeMap[grade];
      const gradeAvgChapters = (sections.reduce((sum, s) => sum + s.avgChapters, 0) / sections.length).toFixed(1);
      const gradeAvgAccuracy = Math.round(sections.reduce((sum, s) => sum + s.avgAccuracy, 0) / sections.length);

      gradesHTML += `
        <div class="grade-section">
          <h3>Grade ${grade}</h3>
          <div class="grade-stats">
            <div class="stat-item">
              <span class="stat-label">Average Chapters:</span>
              <span class="stat-value">${gradeAvgChapters}/6</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Average Accuracy:</span>
              <span class="stat-value">${gradeAvgAccuracy}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Sections:</span>
              <span class="stat-value">${sections.length}</span>
            </div>
          </div>

          <table class="sections-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Students</th>
                <th>Chapters</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              ${sections.map(s => `
                <tr>
                  <td>${s.section}</td>
                  <td>${s.studentCount}</td>
                  <td>${s.avgChapters}/6</td>
                  <td>${s.avgAccuracy}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 15px;
            page-break-after: avoid;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 12px;
          }
          .grade-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .grade-section h3 {
            background: #f0fdf4;
            padding: 10px 15px;
            border-left: 4px solid #10b981;
            margin: 0 0 15px 0;
            font-size: 16px;
            page-break-after: avoid;
          }
          .grade-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .stat-item {
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #eee;
            page-break-inside: avoid;
          }
          .stat-label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 3px;
          }
          .stat-value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #10b981;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            page-break-inside: auto;
          }
          table thead {
            display: table-header-group;
            page-break-after: avoid;
          }
          table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          table th {
            background: #f0fdf4;
            border: 1px solid #e0e0e0;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            color: #333;
            page-break-after: avoid;
          }
          table td {
            border: 1px solid #e0e0e0;
            padding: 8px;
          }
          table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          table tbody tr:nth-child(odd) {
            background: white;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 10px;
            color: #999;
            text-align: center;
            page-break-before: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>STELLAR Dashboard Report</h1>
          <p>Overall Summary - All Grades and Sections</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        ${gradesHTML}

        <div class="footer">
          <p>This report contains aggregated data for all grade levels and sections.</p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate Section Report HTML
  function generateSectionReportHTML(gradeLevel, section, students) {
    let studentsHTML = '';
    
    // Calculate section averages for game scores
    let totalTextExtract = 0;
    let totalTwoTruths = 0;
    let totalStatementScrutinize = 0;
    let studentCountWithScores = 0;

    students.forEach((student, index) => {
      const textExtract = student.gameScores?.textExtract || 0;
      const twoTruths = student.gameScores?.twoTruths || 0;
      const statementScrutinize = student.gameScores?.statementScrutinize || 0;

      totalTextExtract += textExtract;
      totalTwoTruths += twoTruths;
      totalStatementScrutinize += statementScrutinize;
      if (textExtract > 0 || twoTruths > 0 || statementScrutinize > 0) {
        studentCountWithScores++;
      }

      studentsHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${student.name}</td>
          <td>${student.storyProgress}/75</td>
          <td>${student.experiencePoints}</td>
          <td>${textExtract}</td>
          <td>${twoTruths}</td>
          <td>${statementScrutinize}</td>
          <td>${student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}</td>
        </tr>
      `;
    });

    const avgTextExtract = studentCountWithScores > 0 
      ? Math.round(totalTextExtract / studentCountWithScores) 
      : 0;
    const avgTwoTruths = studentCountWithScores > 0 
      ? Math.round(totalTwoTruths / studentCountWithScores) 
      : 0;
    const avgStatementScrutinize = studentCountWithScores > 0 
      ? Math.round(totalStatementScrutinize / studentCountWithScores) 
      : 0;

    const totalProgress = students.length > 0 
      ? Math.round(students.reduce((sum, s) => sum + s.storyProgress, 0) / students.length)
      : 0;
    const avgExp = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.experiencePoints, 0) / students.length)
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 15px;
            page-break-after: avoid;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 12px;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 25px;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .summary-stat {
            background: #f0fdf4;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #10b981;
            page-break-inside: avoid;
          }
          .summary-stat-label {
            display: block;
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 600;
          }
          .summary-stat-value {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #10b981;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 20px;
            page-break-inside: auto;
          }
          table thead {
            display: table-header-group;
            page-break-after: avoid;
          }
          table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          table th {
            background: #f0fdf4;
            border: 1px solid #e0e0e0;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            color: #333;
            page-break-after: avoid;
          }
          table td {
            border: 1px solid #e0e0e0;
            padding: 8px;
          }
          table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          table tbody tr:nth-child(odd) {
            background: white;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 10px;
            color: #999;
            text-align: center;
            page-break-before: avoid;
          }
          .game-score {
            font-weight: 600;
            color: #10b981;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>STELLAR Dashboard Report</h1>
          <p>Grade ${gradeLevel} - Section ${section} Student Summary</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-stat-label">Total Students</span>
            <span class="summary-stat-value">${students.length}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Avg. Story Progress</span>
            <span class="summary-stat-value">${totalProgress}/75</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Avg. Experience</span>
            <span class="summary-stat-value">${avgExp}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Text Extract Avg.</span>
            <span class="summary-stat-value">${avgTextExtract}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-stat-label">Two Truths Avg.</span>
            <span class="summary-stat-value">${avgTwoTruths}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Story Progress</th>
              <th>Experience Points</th>
              <th>Text Extract</th>
              <th>Two Truths</th>
              <th>Statement Scrutinize</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            ${studentsHTML}
          </tbody>
        </table>

        <div class="footer">
          <p>This report contains detailed information for all students in Grade ${gradeLevel} Section ${section}.</p>
          <p>Game Scores: Text Extract (TEST-01), Two Truths (TEST-02), Statement Scrutinize (TEST-03)</p>
        </div>
      </body>
      </html>
    `;
  }

  // Show status message
  function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';
  }

  // Initialize
  fetchProgressData();
});
