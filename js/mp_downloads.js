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
    const downloadBtnCSV = document.getElementById('downloadBtn2CSV');
    
    const selectedGrade = gradeSelect.value;

    if (!selectedGrade) {
      sectionSelect.innerHTML = '<option value="">-- Select a grade first --</option>';
      sectionSelect.disabled = true;
      downloadBtn.disabled = true;
      downloadBtnCSV.disabled = true;
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
    downloadBtnCSV.disabled = sections.length === 0;

    // Enable download buttons when section is selected
    sectionSelect.onchange = function() {
      downloadBtn.disabled = !this.value;
      downloadBtnCSV.disabled = !this.value;
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

      // Group by grade level
      const gradeMap = {};
      progressData.forEach(item => {
        if (!gradeMap[item.gradeLevel]) {
          gradeMap[item.gradeLevel] = [];
        }
        gradeMap[item.gradeLevel].push(item);
      });

      // Create PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = doc.internal.pageSize.getWidth() - 2 * margin;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(63, 81, 181);
      doc.text('STELLAR Dashboard Report', margin, yPosition);
      
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text('Overall Summary - All Grades and Sections', margin, yPosition + 8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition + 14);
      
      yPosition += 25;
      doc.setDrawColor(63, 81, 181);
      doc.line(margin, yPosition - 3, margin + contentWidth, yPosition - 3);
      yPosition += 10;

      // Summary stats for overall report
      const totalStudents = progressData.reduce((sum, item) => sum + (item.studentCount || 0), 0);
      const totalSections = progressData.length;
      const avgStoryLevelOverall = Math.round(progressData.reduce((sum, item) => sum + (item.avgStoryLevel || 0), 0) / totalSections);
      const avgAccuracyOverall = Math.round(progressData.reduce((sum, item) => sum + (item.avgAccuracy || 0), 0) / totalSections);

      const overallStats = [
        { label: 'Total Grades', value: `${Object.keys(gradeMap).length}` },
        { label: 'Total Sections', value: `${totalSections}` },
        { label: 'Total Students', value: `${totalStudents}` },
        { label: 'Avg. Story Level', value: `${formatOverallStoryProgress(avgStoryLevelOverall)}/25` },
        { label: 'Avg. Accuracy', value: `${avgAccuracyOverall}%` }
      ];

      const statCardWidth = (contentWidth - 16) / 5;
      const statCardHeight = 20;

      overallStats.forEach((stat, index) => {
        const cardX = margin + index * (statCardWidth + 4);
        
        // Card background (soft blue-gray)
        doc.setFillColor(245, 247, 255);
        doc.rect(cardX, yPosition, statCardWidth, statCardHeight, 'F');
        
        // Left border (indigo)
        doc.setDrawColor(63, 81, 181);
        doc.setLineWidth(1.5);
        doc.line(cardX, yPosition, cardX, yPosition + statCardHeight);
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(stat.label, cardX + 2, yPosition + 5);
        
        // Value
        doc.setFontSize(15);
        doc.setTextColor(63, 81, 181);
        doc.setFont(undefined, 'bold');
        doc.text(stat.value, cardX + 2, yPosition + 14);
        
        // Reset font
        doc.setFont(undefined, 'normal');
      });

      yPosition += statCardHeight + 10;
      Object.keys(gradeMap).sort((a, b) => a - b).forEach(grade => {
        // Check if we need a new page
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }

        const sections = gradeMap[grade];
        const gradeAvgStoryLevel = Math.round(sections.reduce((sum, s) => sum + s.avgStoryLevel, 0) / sections.length);
        const transformedGradeStoryLevel = transformStoryProgress(gradeAvgStoryLevel, grade);
        const formattedGradeStoryLevel = formatOverallStoryProgress(transformedGradeStoryLevel);
        const gradeAvgAccuracy = Math.round(sections.reduce((sum, s) => sum + s.avgAccuracy, 0) / sections.length);

        // Grade header
        doc.setFontSize(13);
        doc.setTextColor(63, 81, 181);
        doc.text(`Grade ${grade}`, margin, yPosition);
        yPosition += 8;

        // Grade stats
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const statsText = `Avg Story Level: ${formattedGradeStoryLevel}/25  |  Avg Accuracy: ${gradeAvgAccuracy}%  |  Total Sections: ${sections.length}`;
        doc.text(statsText, margin, yPosition);
        yPosition += 8;

        // Table data
        const tableData = sections.map(s => [
          s.section,
          s.studentCount,
          `${transformStoryProgress(s.avgStoryLevel, grade)}/25`,
          `${s.avgAccuracy}%`
        ]);

        doc.autoTable({
          head: [['Section', 'Students', 'Story Level', 'Accuracy']],
          body: tableData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: [50, 50, 50],
            lineColor: [255, 255, 255]
          },
          headStyles: {
            backgroundColor: [63, 81, 181],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            cellPadding: 5
          },
          alternateRowStyles: {
            backgroundColor: [250, 250, 250]
          }
        });

        yPosition = doc.autoTable.previous.finalY + 12;
      });

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('This report contains aggregated data for all grade levels and sections.', margin, pageHeight - 15);

      doc.save(`STELLAR_Overall_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showStatus('status-report1', '✓ Report downloaded successfully!', 'success');
      
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

      // Calculate metrics for each student and section averages
      let totalMasteryPoints = 0;
      let totalChallengePoints = 0;
      let avgStoryProgress = 0;

      // Process each student to calculate their metrics
      const studentMetrics = students.map((student, index) => {
        let masteryPoints = 0;
        let challengePoints = 0;
        let extractData = { sum: 0, count: 0 };
        let truthsData = { sum: 0, count: 0 };
        let scrutinizeData = { sum: 0, count: 0 };

        // Process all attempts for this student
        if (student.attempts && Array.isArray(student.attempts)) {
          student.attempts.forEach(attempt => {
            const attemptScore = attempt.score || 0;

            // Categorize by game type
            if (isStoryModeGame(attempt.gameID)) {
              masteryPoints += attemptScore;
            } else {
              challengePoints += attemptScore;
            }

            // Track accuracy metrics by game
            if (attempt.gameID === 'TEST-01') {
              extractData.sum += attemptScore;
              extractData.count++;
            } else if (attempt.gameID === 'TEST-02') {
              truthsData.sum += attemptScore;
              truthsData.count++;
            } else if (attempt.gameID === 'TEST-03') {
              scrutinizeData.sum += attemptScore;
              scrutinizeData.count++;
            }
          });
        }

        const storyProgress = student.progress?.storyProgress || 0;
        const transformedStoryProgress = transformStoryProgress(storyProgress, gradeLevel);

        let lastLogin = 'Never';
        if (student.logins && Array.isArray(student.logins) && student.logins.length > 0) {
          const sortedLogins = student.logins.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
          lastLogin = new Date(sortedLogins[0].loginAt).toLocaleDateString();
        }

        totalMasteryPoints += masteryPoints;
        totalChallengePoints += challengePoints;
        avgStoryProgress += transformedStoryProgress;

        return {
          index: index + 1,
          name: student.name,
          storyProgress: storyProgress,
          masteryPoints: masteryPoints,
          challengePoints: challengePoints,
          extractAccuracy: calculateAccuracy(extractData.sum, extractData.count),
          truthsAccuracy: calculateAccuracy(truthsData.sum, truthsData.count),
          scrutinizeAccuracy: calculateAccuracy(scrutinizeData.sum, scrutinizeData.count),
          lastLogin: lastLogin
        };
      });

      // Calculate section averages
      const avgMasteryPoints = students.length > 0 ? Math.round(totalMasteryPoints / students.length) : 0;
      const avgChallengePoints = students.length > 0 ? Math.round(totalChallengePoints / students.length) : 0;
      const avgStoryProgressValue = students.length > 0 ? Math.round(avgStoryProgress / students.length) : 0;
      const transformedAvgStoryProgress = avgStoryProgressValue;

      // Create PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = doc.internal.pageSize.getWidth() - 2 * margin;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(63, 81, 181);
      doc.text('STELLAR Dashboard Report', margin, yPosition);
      
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 120);
      doc.text(`Grade ${gradeLevel} - Section ${section} Student Summary`, margin, yPosition + 8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition + 14);
      
      yPosition += 25;
      doc.setDrawColor(63, 81, 181);
      doc.line(margin, yPosition - 3, margin + contentWidth, yPosition - 3);
      yPosition += 10;

      // Summary stats grid
      const statCardWidth = (contentWidth - 12) / 4; // 4 cards with gaps
      const statCardHeight = 22;
      const stats = [
        { label: 'Total Students', value: `${students.length}` },
        { label: 'Avg. Story Progress', value: `${transformedAvgStoryProgress}/25` },
        { label: 'Avg. Mastery Points', value: `${avgMasteryPoints}` },
        { label: 'Avg. Challenge Points', value: `${avgChallengePoints}` }
      ];

      stats.forEach((stat, index) => {
        const cardX = margin + index * (statCardWidth + 3);
        
        // Card background
        doc.setFillColor(245, 247, 255);
        doc.rect(cardX, yPosition, statCardWidth, statCardHeight, 'F');
        
        // Left border
        doc.setDrawColor(63, 81, 181);
        doc.setLineWidth(1.5);
        doc.line(cardX, yPosition, cardX, yPosition + statCardHeight);
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text(stat.label, cardX + 2, yPosition + 5);
        
        // Value
        doc.setFontSize(14);
        doc.setTextColor(63, 81, 181);
        doc.setFont(undefined, 'bold');
        doc.text(stat.value, cardX + 2, yPosition + 14);
        
        // Reset font
        doc.setFont(undefined, 'normal');
      });

      yPosition += statCardHeight + 10;

      // Students table with new columns
      const tableData = studentMetrics.map(metric => [
        metric.index,
        metric.name,
        `${transformStoryProgress(metric.storyProgress, gradeLevel)}/25`,
        metric.masteryPoints,
        metric.challengePoints,
        metric.extractAccuracy,
        metric.truthsAccuracy,
        metric.scrutinizeAccuracy,
        metric.lastLogin
      ]);

      doc.autoTable({
        head: [['#', 'Student Name', 'Story Progress', 'Mastery Points', 'Challenge Points', 'Extract Accuracy', 'Truths Accuracy', 'Scrutinize Accuracy', 'Last Login']],
        body: tableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          textColor: [50, 50, 50],
          lineColor: [255, 255, 255]
        },
        headStyles: {
          backgroundColor: [63, 81, 181],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          cellPadding: 3
        },
        alternateRowStyles: {
          backgroundColor: [250, 250, 250]
        }
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`This report contains detailed information for all students in Grade ${gradeLevel} Section ${section}.`, margin, pageHeight - 15);

      doc.save(`STELLAR_Grade${gradeLevel}_Section${section}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showStatus('status-report2', '✓ Report downloaded successfully!', 'success');
      
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
      const gradeAvgStoryLevel = Math.round(sections.reduce((sum, s) => sum + s.avgStoryLevel, 0) / sections.length);
      const transformedGradeStoryLevel = transformStoryProgress(gradeAvgStoryLevel, grade);
      const formattedGradeStoryLevel = formatOverallStoryProgress(transformedGradeStoryLevel);
      const gradeAvgChapters = (sections.reduce((sum, s) => sum + s.avgChapters, 0) / sections.length).toFixed(1);
      const gradeAvgAccuracy = Math.round(sections.reduce((sum, s) => sum + s.avgAccuracy, 0) / sections.length);

      gradesHTML += `
          <div class="grade-section">
            <h3>Grade ${grade}</h3>
            <div class="grade-stats">
              <div class="stat-item">
                <span class="stat-label">Average Story Level:</span>
                <span class="stat-value">${formattedGradeStoryLevel}/25</span>
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
                <th>Story Level</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              ${sections.map(s => `
                <tr>
                  <td>${s.section}</td>
                  <td>${s.studentCount}</td>
                  <td>${transformStoryProgress(s.avgStoryLevel, grade)}/25</td>
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
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            width: 100%;
            background: white;
            color: #333;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
            page-break-after: avoid;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 11px;
          }
          .grade-section {
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .grade-section h3 {
            background: #f0fdf4;
            padding: 8px 12px;
            border-left: 4px solid #10b981;
            margin: 0 0 10px 0;
            font-size: 14px;
            page-break-after: avoid;
          }
          .grade-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .stat-item {
            background: #f9f9f9;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #eee;
            page-break-inside: avoid;
          }
          .stat-label {
            display: block;
            font-size: 10px;
            color: #666;
            margin-bottom: 2px;
          }
          .stat-value {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #10b981;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
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
            padding: 6px;
            text-align: left;
            font-weight: 600;
            color: #333;
            page-break-after: avoid;
          }
          table td {
            border: 1px solid #e0e0e0;
            padding: 5px;
          }
          table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          table tbody tr:nth-child(odd) {
            background: white;
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            font-size: 9px;
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
      // Calculate metrics from attempts using new data structure
      let textExtractSum = 0, textExtractCount = 0;
      let twoTruthsSum = 0, twoTruthsCount = 0;
      let scrutinizeSum = 0, scrutinizeCount = 0;

      if (student.attempts && Array.isArray(student.attempts)) {
        student.attempts.forEach(attempt => {
          if (attempt.gameID === 'TEST-01') {
            textExtractSum += attempt.score || 0;
            textExtractCount++;
          } else if (attempt.gameID === 'TEST-02') {
            twoTruthsSum += attempt.score || 0;
            twoTruthsCount++;
          } else if (attempt.gameID === 'TEST-03') {
            scrutinizeSum += attempt.score || 0;
            scrutinizeCount++;
          }
        });
      }

      const textExtract = textExtractCount > 0 ? Math.round(textExtractSum / textExtractCount) : 0;
      const twoTruths = twoTruthsCount > 0 ? Math.round(twoTruthsSum / twoTruthsCount) : 0;
      const statementScrutinize = scrutinizeCount > 0 ? Math.round(scrutinizeSum / scrutinizeCount) : 0;

      totalTextExtract += textExtract;
      totalTwoTruths += twoTruths;
      totalStatementScrutinize += statementScrutinize;
      if (textExtract > 0 || twoTruths > 0 || statementScrutinize > 0) {
        studentCountWithScores++;
      }

      // Get last login from logins array
      let lastLoginStr = 'Never';
      if (student.logins && Array.isArray(student.logins) && student.logins.length > 0) {
        const sortedLogins = student.logins.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
        lastLoginStr = new Date(sortedLogins[0].loginAt).toLocaleDateString();
      }

      const storyProgress = student.progress?.storyProgress || 0;
      const transformedStoryProgress = transformStoryProgress(storyProgress, gradeLevel);

      studentsHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${student.name}</td>
          <td>${transformedStoryProgress}/25</td>
          <td>${student.progress?.experiencePoints || 0}</td>
          <td>${textExtract}</td>
          <td>${twoTruths}</td>
          <td>${statementScrutinize}</td>
          <td>${lastLoginStr}</td>
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
      ? Math.round(students.reduce((sum, s) => sum + transformStoryProgress(s.progress?.storyProgress || 0, gradeLevel), 0) / students.length)
      : 0;
    const formattedTotalProgress = formatOverallStoryProgress(totalProgress);
    const avgExp = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.progress?.experiencePoints || 0), 0) / students.length)
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            width: 100%;
            background: white;
            color: #333;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
            page-break-after: avoid;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 24px;
            margin-bottom: 5px;
          }
          .header p {
            margin: 2px 0;
            color: #666;
            font-size: 11px;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 15px;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .summary-stat {
            background: #f0fdf4;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #10b981;
            page-break-inside: avoid;
          }
          .summary-stat-label {
            display: block;
            font-size: 10px;
            color: #666;
            margin-bottom: 3px;
            font-weight: 600;
          }
          .summary-stat-value {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #10b981;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-top: 10px;
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
            padding: 6px;
            text-align: left;
            font-weight: 600;
            color: #333;
            page-break-after: avoid;
          }
          table td {
            border: 1px solid #e0e0e0;
            padding: 5px;
          }
          table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          table tbody tr:nth-child(odd) {
            background: white;
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #eee;
            font-size: 9px;
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
            <span class="summary-stat-value">${formattedTotalProgress}/25</span>
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

  // Download Overall Report as CSV
  window.downloadOverallReportCSV = async function() {
    const statusEl = document.getElementById('status-report1');
    showStatus('status-report1', 'Generating CSV...', 'loading');

    try {
      if (!progressData || progressData.length === 0) {
        throw new Error('No data available');
      }

      // Prepare CSV headers
      const headers = ['Grade Level', 'Section', 'Total Students', 'Average Story Level', 'Average Accuracy'];
      
      // Group by grade and section
      const gradeMap = {};
      progressData.forEach(item => {
        if (!gradeMap[item.gradeLevel]) {
          gradeMap[item.gradeLevel] = {};
        }
        gradeMap[item.gradeLevel][item.section] = item;
      });

      // Prepare CSV rows
      let csvContent = headers.join(',') + '\n';
      
      Object.keys(gradeMap).sort((a, b) => a - b).forEach(grade => {
        Object.keys(gradeMap[grade]).sort().forEach(section => {
          const item = gradeMap[grade][section];
          const transformedStoryLevel = transformStoryProgress(item.avgStoryLevel || 0, grade);
          const row = [
            grade,
            section,
            item.studentCount || 0,
            `'${transformedStoryLevel}/25`,
            (item.avgAccuracy || 0) + '%'
          ];
          csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
        });
      });

      // Download CSV
      downloadCSVFile(csvContent, `STELLAR_Overall_Report_${new Date().toISOString().split('T')[0]}.csv`);
      showStatus('status-report1', '✓ Report downloaded successfully!', 'success');
      
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('Error generating CSV:', error);
      showStatus('status-report1', 'Error generating report. Please try again.', 'error');
    }
  };

  // Helper function to check if gameID is a story mode game (G4W1L1 to G6W5L5)
  function isStoryModeGame(gameID) {
    const storyModePattern = /^G[4-6]W[1-5]L[1-5]$/;
    return storyModePattern.test(gameID);
  }

  // Helper function to transform story progress based on grade level
  function transformStoryProgress(value, gradeLevel) {
    const grade = parseInt(gradeLevel);
    if (grade === 5) {
      return Math.max(0, value - 25); // Grade 5: subtract 25
    } else if (grade === 6) {
      return Math.max(0, value - 50); // Grade 6: subtract 50
    }
    // Grade 4: no transformation
    return value;
  }

  // Helper function to format overall story progress as "over X"
  function formatOverallStoryProgress(value) {
    if (value >= 15) {
      return `over ${value}`;
    }
    return `${value}`;
  }

  // Helper function to calculate accuracy percentage
  function calculateAccuracy(sum, count) {
    if (count === 0) return '0% (0)';
    const percentage = Math.round((sum / (count * 500)) * 100);
    return `${percentage}% (${count})`;
  }

  // Download Section Report as CSV
  window.downloadSectionReportCSV = async function() {
    const gradeSelect = document.getElementById('gradeSelect');
    const sectionSelect = document.getElementById('sectionSelect');
    const statusEl = document.getElementById('status-report2');

    const gradeLevel = gradeSelect.value;
    const section = sectionSelect.value;

    if (!gradeLevel || !section) {
      showStatus('status-report2', 'Please select both grade and section.', 'error');
      return;
    }

    showStatus('status-report2', 'Generating CSV...', 'loading');

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
      console.log('Students fetched for CSV:', students);

      // Prepare CSV headers with new columns
      const headers = ['#', 'Student Name', 'Story Progress', 'Mastery Points', 'Challenge Points', 'Extract Accuracy', 'Truths Accuracy', 'Scrutinize Accuracy', 'Last Login'];
      
      // Prepare CSV rows
      let csvContent = headers.join(',') + '\n';
      
      students.forEach((student, index) => {
        // Calculate metrics from attempts
        let masteryPoints = 0;
        let challengePoints = 0;
        let extractData = { sum: 0, count: 0 };
        let truthsData = { sum: 0, count: 0 };
        let scrutinizeData = { sum: 0, count: 0 };

        // Process all attempts for this student
        if (student.attempts && Array.isArray(student.attempts)) {
          student.attempts.forEach(attempt => {
            const attemptScore = attempt.score || 0;

            // Categorize by game type
            if (isStoryModeGame(attempt.gameID)) {
              masteryPoints += attemptScore;
            } else {
              challengePoints += attemptScore;
            }

            // Track accuracy metrics by game
            if (attempt.gameID === 'TEST-01') {
              extractData.sum += attemptScore;
              extractData.count++;
            } else if (attempt.gameID === 'TEST-02') {
              truthsData.sum += attemptScore;
              truthsData.count++;
            } else if (attempt.gameID === 'TEST-03') {
              scrutinizeData.sum += attemptScore;
              scrutinizeData.count++;
            }
          });
        }

        // Get story progress
        const storyProgress = student.progress?.storyProgress || 0;
        const transformedStoryProgress = transformStoryProgress(storyProgress, gradeLevel);

        // Get last login
        let lastLogin = 'Never';
        if (student.logins && Array.isArray(student.logins) && student.logins.length > 0) {
          const sortedLogins = student.logins.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
          lastLogin = new Date(sortedLogins[0].loginAt).toLocaleString();
        }

        // Build the row with all calculated metrics
        const row = [
          index + 1,
          student.name,
          `'${transformedStoryProgress}/25`,
          masteryPoints,
          challengePoints,
          calculateAccuracy(extractData.sum, extractData.count),
          calculateAccuracy(truthsData.sum, truthsData.count),
          calculateAccuracy(scrutinizeData.sum, scrutinizeData.count),
          lastLogin
        ];

        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
      });

      // Download CSV
      downloadCSVFile(csvContent, `STELLAR_Grade${gradeLevel}_Section${section}_Report_${new Date().toISOString().split('T')[0]}.csv`);
      showStatus('status-report2', '✓ Report downloaded successfully!', 'success');
      
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('Error generating CSV:', error);
      showStatus('status-report2', 'Error generating report. Please try again.', 'error');
    }
  };

  // Helper function to download CSV file
  function downloadCSVFile(csvContent, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
