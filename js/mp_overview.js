document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com';

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Store chart instances globally to destroy them before creating new ones
  let engagementChart = null;
  const chartInstances = {};

  // DOM Elements
  const gradesColumn = document.getElementById('gradesColumn');

  // Fetch dashboard overview data and progress data
  async function fetchDashboardData(gradeLevel = null) {
    try {
      let overviewUrl = `${API_BASE_URL}/api/admin/dashboard/overview`;
      let challengeAttemptsUrl = `${API_BASE_URL}/api/admin/dashboard/challenge-attempts`;
      if (gradeLevel && gradeLevel !== 'All Grade') {
        const grade = parseInt(gradeLevel.replace('Grade ', ''));
        overviewUrl += `?gradeLevel=${grade}`;
        challengeAttemptsUrl += `?gradeLevel=${grade}`;
      }

      // Fetch overview, challenge attempts, and progress data in parallel
      const [overviewResponse, challengeResponse, progressResponse] = await Promise.all([
        fetch(overviewUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(challengeAttemptsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/api/admin/dashboard/progress`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!overviewResponse.ok || !progressResponse.ok || !challengeResponse.ok) {
        throw new Error('HTTP error fetching data');
      }

      const overviewData = await overviewResponse.json();
      const challengeData = await challengeResponse.json();
      const progressData = await progressResponse.json();

      console.log('Dashboard data retrieved:', overviewData);
      console.log('Challenge attempts data retrieved:', challengeData);
      console.log('Progress data retrieved:', progressData);

      initializeCharts(overviewData);
      updateProgressBars(overviewData);
      updateChallengeAttempts(challengeData);
      displayGradeView(progressData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Show sample data on error
      showSampleData();
    }
  }

  // Display grade level summary view
  function displayGradeView(classesData) {
    if (!gradesColumn) return;

    // Group data by grade level and calculate summaries
    const gradeMap = {};
    classesData.forEach(classData => {
      if (!gradeMap[classData.gradeLevel]) {
        gradeMap[classData.gradeLevel] = [];
      }
      gradeMap[classData.gradeLevel].push(classData);
    });

    gradesColumn.innerHTML = '';

    // Create card for each grade
    Object.keys(gradeMap).sort((a, b) => a - b).forEach((gradeLevel, index) => {
      const sectionsList = gradeMap[gradeLevel];
      const cardIndex = index + 1;

      // Calculate grade-level averages
      const avgStoryLevel = (sectionsList.reduce((sum, s) => sum + s.avgStoryLevel, 0) / sectionsList.length);
      const avgAccuracy = (sectionsList.reduce((sum, s) => sum + s.avgAccuracy, 0) / sectionsList.length);
      const avgActivityData = [];
      if (sectionsList[0] && sectionsList[0].activityLabels) {
        sectionsList[0].activityLabels.forEach((_, dayIdx) => {
          const daySum = sectionsList.reduce((sum, s) => sum + (s.activityData[dayIdx] || 0), 0);
          avgActivityData.push(Math.round(daySum / sectionsList.length));
        });
      }

      const card = document.createElement('div');
      card.className = 'progress-card';
      card.innerHTML = `
        <div class="progress-card-header">Grade ${gradeLevel}</div>
        <div class="card-content">
          <div class="progress-section">
            <div class="progress-info">Average Story Level ${avgStoryLevel.toFixed(1)}/75</div>
              <div class="progress-bar">
              <div class="progress-fill" style="width: ${(avgStoryLevel / 75) * 100}%;"></div>
              </div>
            <div class="progress-percentage">${Math.round((avgStoryLevel / 75) * 100)}%</div>
          </div>
          <div class="charts-section">
            <div class="left-section">
              <div class="chart-donut">
                <canvas id="chart-${cardIndex}" width="70" height="70"></canvas>
              </div>
              <div class="accuracy-label">Average Quiz<br>Accuracy</div>
            </div>
            <div class="middle-section">
              <div class="chart-bar">
                <canvas id="activity-${cardIndex}" width="200" height="60"></canvas>
              </div>
              <div class="chart-label">Activity Last Week</div>
            </div>
          </div>
        </div>
      `;

      gradesColumn.appendChild(card);

      // Add click handler to navigate to sections view
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() {
        sessionStorage.setItem('selectedGrade', gradeLevel);
        const allPages = window.parent.document.querySelectorAll('.page');
        allPages.forEach(page => page.style.opacity = '0');
        setTimeout(() => {
          allPages.forEach(page => page.style.display = 'none');
          const progressPage = window.parent.document.getElementById('page-progress');
          if (progressPage) {
            progressPage.style.display = 'block';
            progressPage.style.opacity = '0';
            progressPage.src = 'mp_progress_section.html';
            progressPage.onload = function() {
              setTimeout(() => { progressPage.style.opacity = '1'; }, 10);
            };
          }
          
          // Update menu styling
          const menuItems = window.parent.document.querySelectorAll('.menu-item[data-page]');
          menuItems.forEach(item => item.classList.remove('active'));
        }, 250);
      });

      // Create donut chart for accuracy
      const donutCtx = document.getElementById(`chart-${cardIndex}`);
      if (donutCtx) {
        if (chartInstances[`chart-${cardIndex}`]) {
          chartInstances[`chart-${cardIndex}`].destroy();
        }

        chartInstances[`chart-${cardIndex}`] = new Chart(donutCtx, {
          type: "doughnut",
          data: {
            datasets: [{
              data: [avgAccuracy, 100 - avgAccuracy],
              backgroundColor: ["#d0f9d0", "#f0f0f0"],
              borderColor: ["#10b981", "#e5e5e5"],
              borderWidth: 2
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            }
          },
          plugins: [{
            id: "textCenter",
            beforeDatasetsDraw(chart) {
              const { width, height, ctx } = chart;
              ctx.restore();
              const fontSize = (height / 200).toFixed(2);
              ctx.font = `bold ${fontSize}em sans-serif`;
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#10b981";
              const text = `${Math.round(avgAccuracy)}%`;
              const textX = Math.round((width - ctx.measureText(text).width) / 2);
              const textY = height / 2;
              ctx.fillText(text, textX, textY);
              ctx.save();
            }
          }]
        });
      }

      // Create activity bar chart
      const activityCtx = document.getElementById(`activity-${cardIndex}`);
      if (activityCtx) {
        if (chartInstances[`activity-${cardIndex}`]) {
          chartInstances[`activity-${cardIndex}`].destroy();
        }

        chartInstances[`activity-${cardIndex}`] = new Chart(activityCtx, {
          type: "bar",
          data: {
            labels: sectionsList[0]?.activityLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: "Activity",
              data: avgActivityData,
              backgroundColor: avgActivityData.map((_, idx) => 
                idx === (sectionsList[0]?.currentDayIndex || 6) ? "#3b82f6" : "#10b981"
              ),
              borderRadius: 3,
              barThickness: 8,
              maxBarThickness: 8
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            indexAxis: "x",
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { display: false },
                ticks: { display: false }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 7 } }
              }
            }
          }
        });
      }
    });
  }

  function initializeCharts(data) {
    // ---- ENGAGEMENT CHART ----
    const engagementCtx = document.getElementById("engagementChart");
    if (engagementCtx) {
      // Destroy existing chart if it exists
      if (engagementChart) {
        engagementChart.destroy();
      }
      
      engagementChart = new Chart(engagementCtx, {
        type: "line",
        data: {
          labels: data.studentsEngagement.labels || [],
          datasets: [{
            label: "Number of Logged In Students",
            data: data.studentsEngagement.data || [],
            borderWidth: 2,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "#f0f0f0"
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  function updateChallengeAttempts(data) {
    // Extract from the challengeAttemptsTotals object returned by the endpoint
    let text = 0, two = 0, stmt = 0;

    if (data.challengeAttemptsTotals && typeof data.challengeAttemptsTotals === 'object') {
      text = data.challengeAttemptsTotals.textExtract ?? 0;
      two = data.challengeAttemptsTotals.twoTruths ?? 0;
      stmt = data.challengeAttemptsTotals.statementScrutinize ?? 0;
    }

    text = Number(text);
    two = Number(two);
    stmt = Number(stmt);

    console.log('Challenge attempts to display:', { text, two, stmt });

    // Update DOM values
    const textValEl = document.getElementById('overview-text-value');
    const twoValEl = document.getElementById('overview-two-value');
    const stmtValEl = document.getElementById('overview-stmt-value');
    const textFill = document.getElementById('overview-text-fill');
    const twoFill = document.getElementById('overview-two-fill');
    const stmtFill = document.getElementById('overview-stmt-fill');

    if (textValEl) textValEl.textContent = text;
    if (twoValEl) twoValEl.textContent = two;
    if (stmtValEl) stmtValEl.textContent = stmt;

    // Scale widths relative to the largest value so bars show proportions
    const max = Math.max(text, two, stmt, 1);
    if (textFill) textFill.style.width = Math.round((text / max) * 100) + '%';
    if (twoFill) twoFill.style.width = Math.round((two / max) * 100) + '%';
    if (stmtFill) stmtFill.style.width = Math.round((stmt / max) * 100) + '%';
  }

  function updateProgressBars(data) {
    // Update Story Progress
    const progressFill = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-label');

    if (progressFill && data.storyProgressAverage !== undefined) {
      const percentage = Math.min(data.storyProgressAverage, 100);
      progressFill.style.width = percentage + '%';
      
      if (progressLabel) {
        progressLabel.textContent = percentage + '%';
      }
    }

    // Update Average Performance
    const performanceValue = document.querySelector('.performance-value');
    if (performanceValue && data.averagePerformance !== undefined) {
      performanceValue.textContent = Math.round(data.averagePerformance) + ' PTS.';
    }
  }

  function showSampleData() {
    // Fallback sample data if API call fails
    const sampleOverviewData = {
      totalStudents: 5,
      studentsEngagement: {
        labels: ["2026-01-12", "2026-01-13", "2026-01-14", "2026-01-15", "2026-01-16", "2026-01-17", "2026-01-18", "2026-01-19", "2026-01-20"],
        data: [45, 38, 50, 42, 55, 48, 60, 35, 70]
      },
      storyProgressAverage: 31,
      averagePerformance: 2260
    };

    const sampleChallengeData = {
      challengeAttemptsTotals: {
        textExtract: 9,
        twoTruths: 897,
        statementScrutinize: 263
      },
      byGradeLevel: []
    };

    const sampleProgressData = [
      {
        gradeLevel: 4,
        section: 'A1',
        avgStoryLevel: 15,
        avgAccuracy: 60,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [5, 6, 4, 5, 7, 3, 2],
        currentDayIndex: 6
      },
      {
        gradeLevel: 4,
        section: 'A2',
        avgStoryLevel: 18,
        avgAccuracy: 65,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [6, 5, 7, 4, 6, 2, 3],
        currentDayIndex: 6
      },
      {
        gradeLevel: 5,
        section: 'B1',
        avgStoryLevel: 22,
        avgAccuracy: 70,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [7, 6, 5, 8, 5, 4, 4],
        currentDayIndex: 6
      },
      {
        gradeLevel: 5,
        section: 'B2',
        avgStoryLevel: 20,
        avgAccuracy: 68,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [5, 7, 6, 5, 8, 3, 2],
        currentDayIndex: 6
      },
      {
        gradeLevel: 6,
        section: 'C1',
        avgStoryLevel: 25,
        avgAccuracy: 72,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [8, 6, 7, 6, 5, 4, 3],
        currentDayIndex: 6
      },
      {
        gradeLevel: 6,
        section: 'C2',
        avgStoryLevel: 28,
        avgAccuracy: 75,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [6, 5, 8, 7, 4, 3, 2],
        currentDayIndex: 6
      }
    ];

    console.log('Using sample data due to API error');
    initializeCharts(sampleOverviewData);
    updateProgressBars(sampleOverviewData);
    updateChallengeAttempts(sampleChallengeData);
    displayGradeView(sampleProgressData);
  }

  // Handle grade filter dropdown change
  const gradeDropdown = document.querySelector('.view-filter');
  if (gradeDropdown) {
    gradeDropdown.addEventListener('change', function () {
      const selectedGrade = this.value;
      fetchDashboardData(selectedGrade);
    });
  }

  // Fetch data on page load (use currently selected grade if present)
  const initialGrade = document.querySelector('.view-filter')?.value || null;
  fetchDashboardData(initialGrade);
});
