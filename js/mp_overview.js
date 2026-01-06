document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com'; // Update this to match your backend URL

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Store chart instances globally to destroy them before creating new ones
  let engagementChart = null;

  // Fetch dashboard overview data (optionally filtered by gradeLevel)
  async function fetchDashboardData(gradeLevel = null) {
    try {
      let url = `${API_BASE_URL}/api/admin/dashboard/overview`;
      if (gradeLevel && gradeLevel !== 'All Grade') {
        const grade = parseInt(gradeLevel.replace('Grade ', ''));
        url += `?gradeLevel=${grade}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard data retrieved:', data);
      initializeCharts(data);
      updateProgressBars(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Show sample data on error
      showSampleData();
    }
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

    // ---- TOTAL CHALLENGE ATTEMPTS ----
    // Update the three attempt bars (Text Extract, Two Truths, Statement Scrutinize)
    updateChallengeAttempts(data);
  }

  function updateChallengeAttempts(data) {
    // Try to get from totalChallengeAttempts first, fallback to weeklyChallengeAttempts array
    let text = 0, two = 0, stmt = 0;

    if (data.totalChallengeAttempts && typeof data.totalChallengeAttempts === 'object') {
      text = data.totalChallengeAttempts.textExtract ?? 0;
      two = data.totalChallengeAttempts.twoTruths ?? 0;
      stmt = data.totalChallengeAttempts.statementScrutinize ?? 0;
    } else if (data.weeklyChallengeAttempts && Array.isArray(data.weeklyChallengeAttempts.data)) {
      // Fallback: use weekly data if available
      const weeklyData = data.weeklyChallengeAttempts.data;
      text = weeklyData[0] ?? 0;
      two = weeklyData[1] ?? 0;
      stmt = weeklyData[2] ?? 0;
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
    const sampleData = {
      totalStudents: 5,
      studentsEngagement: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        data: [45, 38, 50, 42, 55, 48, 60]
      },
      storyProgressAverage: 45,
      averagePerformance: 500,
      weeklyChallengeAttempts: {
        labels: ["Text Extract", "Two Truths", "Statement Scrutinize"],
        data: [100, 60, 75]
      },
      totalChallengeAttempts: {
        textExtract: 1000,
        twoTruths: 600,
        statementScrutinize: 750
      }
    };

    console.log('Using sample data due to API error');
    initializeCharts(sampleData);
    updateProgressBars(sampleData);
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
