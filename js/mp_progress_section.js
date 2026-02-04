document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com';

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Get grade level from sessionStorage
  const selectedGrade = sessionStorage.getItem('selectedGrade');
  if (!selectedGrade) {
    console.error('No grade level selected.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: No grade level selected. Please go back to Progress.</p>';
    return;
  }

  // Store chart instances to destroy them before creating new ones
  const chartInstances = {};
  
  // DOM Elements
  const gridContainer = document.getElementById('gridContainer');
  const pageTitle = document.getElementById('pageTitle');
  const backBtn = document.getElementById('backBtn');

  // Update page title
  pageTitle.textContent = `Grade ${selectedGrade} - Sections`;

  // Back button handler
  backBtn.addEventListener('click', function() {
    // Clear the grade selection to show grades view
    sessionStorage.removeItem('selectedGrade');
    try {
      if (window.parent !== window) {
        const iframeElement = window.parent.document.getElementById('page-progress');
        if (iframeElement) {
          iframeElement.src = 'mp_progress.html';
        } else {
          window.location.href = 'mp_progress.html';
        }
      } else {
        window.location.href = 'mp_progress.html';
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = 'mp_progress.html';
    }
  });

  // Fetch progress data from backend
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

      const data = await response.json();
      console.log('Progress data retrieved:', data);
      
      // Filter sections for the selected grade
      const sectionsData = data.filter(c => c.gradeLevel === parseInt(selectedGrade));
      if (sectionsData.length > 0) {
        displaySectionView(sectionsData);
      } else {
        gridContainer.innerHTML = '<p style="color: #999; padding: 20px;">No sections found for this grade level.</p>';
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      displaySampleData();
    }
  }

  // Display section view for selected grade
  function displaySectionView(sectionsData) {
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    sectionsData.forEach((classData, index) => {
      const cardIndex = index + 1;
      
      const card = document.createElement('div');
      card.className = 'progress-card';
      card.innerHTML = `
        <div class="progress-card-header">Section ${classData.section}</div>
        <div class="card-content">
          <div class="progress-section">
            <div class="progress-info">Average Story Level ${classData.avgStoryLevel}/75</div>
              <div class="progress-bar">
              <div class="progress-fill" style="width: ${(classData.avgStoryLevel / 75) * 100}%;"></div>
              </div>
            <div class="progress-percentage">${Math.round((classData.avgStoryLevel / 75) * 100)}%</div>
          </div>
          <div class="charts-section">
            <div class="left-section">
              <div class="chart-donut">
                <canvas id="chart-${cardIndex}" width="120" height="120"></canvas>
              </div>
              <div class="accuracy-label">Average Quiz<br>Accuracy</div>
            </div>
            <div class="middle-section">
              <div class="chart-bar">
                <canvas id="activity-${cardIndex}" width="400" height="120"></canvas>
              </div>
              <div class="chart-label">Activity Last Week</div>
            </div>
          </div>
        </div>
      `;

      gridContainer.appendChild(card);

      // Add click handler to navigate to student detail page
      card.addEventListener('click', function() {
        // Store section and grade level for detail page
        sessionStorage.setItem('selectedGrade', selectedGrade);
        sessionStorage.setItem('selectedSection', classData.section);
        
        try {
          if (window.parent !== window) {
            const iframeElement = window.parent.document.getElementById('page-progress');
            if (iframeElement) {
              iframeElement.src = 'mp_progress_detail.html';
            } else {
              window.location.href = 'mp_progress_detail.html';
            }
          } else {
            window.location.href = 'mp_progress_detail.html';
          }
        } catch (error) {
          console.error('Navigation error:', error);
          window.location.href = 'mp_progress_detail.html';
        }
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
              data: [classData.avgAccuracy, 100 - classData.avgAccuracy],
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
              const text = `${classData.avgAccuracy}%`;
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
            labels: classData.activityLabels,
            datasets: [{
              label: "Activity",
              data: classData.activityData,
              backgroundColor: classData.activityLabels.map((label, idx) => 
                idx === classData.currentDayIndex ? "#3b82f6" : "#10b981"
              ),
              borderRadius: 3,
              barThickness: 10,
              maxBarThickness: 10
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
                ticks: { font: { size: 8 } }
              }
            }
          }
        });
      }
    });
  }

  function displaySampleData() {
    console.log('Using sample data due to API error');
    const sampleData = [
      {
        gradeLevel: 4,
        section: 'A1',
        avgChapters: 1,
        avgAccuracy: 60,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [5, 6, 4, 5, 7, 3, 2],
        currentDayIndex: 6
      },
      {
        gradeLevel: 4,
        section: 'A2',
        avgChapters: 2,
        avgAccuracy: 65,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [6, 5, 7, 4, 6, 2, 3],
        currentDayIndex: 6
      },
      {
        gradeLevel: 5,
        section: 'B1',
        avgChapters: 3,
        avgAccuracy: 70,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [7, 6, 5, 8, 5, 4, 4],
        currentDayIndex: 6
      },
      {
        gradeLevel: 5,
        section: 'B2',
        avgChapters: 2,
        avgAccuracy: 68,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [5, 7, 6, 5, 8, 3, 2],
        currentDayIndex: 6
      },
      {
        gradeLevel: 6,
        section: 'C1',
        avgChapters: 2,
        avgAccuracy: 72,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [8, 6, 7, 6, 5, 4, 3],
        currentDayIndex: 6
      },
      {
        gradeLevel: 6,
        section: 'C2',
        avgChapters: 1,
        avgAccuracy: 75,
        activityLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        activityData: [6, 5, 8, 7, 4, 3, 2],
        currentDayIndex: 6
      }
    ];

    const filteredData = sampleData.filter(c => c.gradeLevel === parseInt(selectedGrade));
    if (filteredData.length > 0) {
      displaySectionView(filteredData);
    } else {
      gridContainer.innerHTML = '<p style="color: #999; padding: 20px;">No sections found for this grade level.</p>';
    }
  }

  // Fetch data on page load
  fetchProgressData();
});
