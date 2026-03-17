document.addEventListener("DOMContentLoaded", function () {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('token');
  const API_BASE_URL = 'https://stellar-backend-ki78.onrender.com';

  if (!token) {
    console.error('No authentication token found. Please log in first.');
    document.body.innerHTML = '<p style="color: red; padding: 20px;">Error: Authentication required. Please log in first.</p>';
    return;
  }

  // Game configurations
  const games = [
    { key: 'textExtract', name: 'Text Extract', cardSelector: '.mastery-card:nth-child(1)', leaderboardSelector: '.leaderboard:nth-child(1)' },
    { key: 'twoTruths', name: 'Two Truths', cardSelector: '.mastery-card:nth-child(2)', leaderboardSelector: '.leaderboard:nth-child(2)' },
    { key: 'statementScrutinize', name: 'Statement Scrutinize', cardSelector: '.mastery-card:nth-child(3)', leaderboardSelector: '.leaderboard:nth-child(3)' }
  ];

  // Get grade and section elements
  const gradeDropdown = document.querySelector('#gradeDropdown');
  const sectionDropdown = document.querySelector('#sectionDropdown');

  // Store available sections per grade
  const sectionsByGrade = {
    '4': ['Humanity', 'Sincerity'],
    '5': ['Efficient', 'Obedient'],
    '6': ['Excellence', 'Perseverance']
  };

  let chartInstance = null;
  let overallAverage = 0;

  // Fetch overall average performance for the grade
  async function fetchOverallAverage(gradeLevel) {
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

      if (response.ok) {
        const data = await response.json();
        overallAverage = data.averagePerformance || 0;
        console.log('Overall average for grade:', overallAverage);
      }
    } catch (error) {
      console.error('Error fetching overall average:', error);
    }
  }

  // Update section dropdown based on selected grade
  function updateSectionDropdown(gradeLevel) {
    sectionDropdown.innerHTML = '<option>All Section</option>';

    if (gradeLevel === 'All Grade') {
      return;
    }

    const gradeNumber = gradeLevel.replace('Grade ', '');
    const sections = sectionsByGrade[gradeNumber] || [];
    sections.forEach(section => {
      const option = document.createElement('option');
      option.textContent = `Section ${section}`;
      option.value = section;
      sectionDropdown.appendChild(option);
    });

    // Reset to "All Section" when grade changes
    sectionDropdown.value = '';
  }

  // Fetch game mastery data
  async function fetchGameMasteryData(gradeLevel = null, section = null) {
    try {
      let url = `${API_BASE_URL}/api/admin/dashboard/gamemastery`;
      const params = [];

      if (gradeLevel && gradeLevel !== 'All Grade') {
        const grade = parseInt(gradeLevel.replace('Grade ', ''));
        params.push(`gradeLevel=${grade}`);
      }

      if (section && section !== 'All Section' && section !== '') {
        params.push(`section=${section}`);
      }

      if (params.length > 0) {
        url += '?' + params.join('&');
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
      console.log('Game mastery data retrieved:', data);
      displayGameData(data);
    } catch (error) {
      console.error('Error fetching game mastery data:', error);
      displaySampleData();
    }
  }

  function displayGameData(data) {
    // Update each game's card and leaderboard
    games.forEach(game => {
      const gameData = data[game.key];
      if (!gameData) return;

      // Update card with average score
      const cardElement = document.querySelector(game.cardSelector);
      if (cardElement) {
        const pointsElement = cardElement.querySelector('.card-points');
        if (pointsElement) {
          pointsElement.textContent = Math.round(gameData.averageScore) + ' PTS.';
        }
      }

      // Update leaderboard
      const leaderboardElement = document.querySelector(game.leaderboardSelector);
      if (leaderboardElement) {
        const tbody = leaderboardElement.querySelector('.leaderboard-table tbody');
        if (tbody) {
          // Clear existing rows
          tbody.innerHTML = '';

          // Add rows for all students
          const leaderboard = gameData.leaderboard || [];
          if (leaderboard.length === 0) {
            // No data message
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No attempts yet</td></tr>';
          } else {
            leaderboard.forEach(entry => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${entry.rank}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.perfectScoreCount}</td>
                <td>${entry.date}</td>
              `;
              
              // Add click handler to row
              row.addEventListener('click', function() {
                console.log('Clicked on student:', entry.name, 'with userID:', entry.userID);
                openStudentProfile(entry.userID);
              });
              
              tbody.appendChild(row);
            });
          }
        }
      }
    });
  }

  function displaySampleData() {
    console.log('Using sample data due to API error');
    const sampleData = {
      textExtract: {
        averageScore: 85,
        leaderboard: [
          { rank: 1, name: 'John Doe', score: 500, perfectScoreCount: 3, date: '2024-01-05', userID: 1 },
          { rank: 2, name: 'Jane Smith', score: 450, perfectScoreCount: 1, date: '2024-01-04', userID: 2 },
          { rank: 3, name: 'Bob Johnson', score: 400, perfectScoreCount: 0, date: '2024-01-03', userID: 3 }
        ]
      },
      twoTruths: {
        averageScore: 78,
        leaderboard: [
          { rank: 1, name: 'Alice Brown', score: 500, perfectScoreCount: 2, date: '2024-01-05', userID: 4 },
          { rank: 2, name: 'Charlie Wilson', score: 425, perfectScoreCount: 1, date: '2024-01-04', userID: 5 },
          { rank: 3, name: 'Diana Lee', score: 380, perfectScoreCount: 0, date: '2024-01-03', userID: 6 }
        ]
      },
      statementScrutinize: {
        averageScore: 82,
        leaderboard: [
          { rank: 1, name: 'Eve Davis', score: 500, perfectScoreCount: 4, date: '2024-01-05', userID: 7 },
          { rank: 2, name: 'Frank Miller', score: 475, perfectScoreCount: 2, date: '2024-01-04', userID: 8 },
          { rank: 3, name: 'Grace Taylor', score: 420, perfectScoreCount: 0, date: '2024-01-03', userID: 9 }
        ]
      }
    };

    displayGameData(sampleData);
  }

  // Open student profile modal
  async function openStudentProfile(userID) {
    console.log('Opening profile for userID:', userID);
    
    try {
      const url = `${API_BASE_URL}/api/admin/student/details?userID=${userID}`;
      
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
      console.log('Student profile data retrieved:', data);
      displayStudentProfile(data);
      
      // Show modal
      document.getElementById('studentProfileModal').style.display = 'block';
    } catch (error) {
      console.error('Error fetching student profile:', error);
      alert('Failed to load student profile. Please try again.');
    }
  }

  // Display student profile in modal
  function displayStudentProfile(data) {
    const { student, achievements, challengeAttempts, weeklyAverages } = data;

    // Debug logging
    console.log('Full student object:', student);
    console.log('Gender value:', student.gender);
    console.log('Gender type:', typeof student.gender);

    // Update basic info (fix: ensure values display properly)
    const nameEl = document.getElementById('profile-name');
    const gradeEl = document.getElementById('profile-grade');
    const genderEl = document.getElementById('profile-gender');
    const sectionEl = document.getElementById('profile-section');

    if (nameEl) nameEl.textContent = student.name || '--';
    if (gradeEl) gradeEl.textContent = student.gradeLevel ? `Grade ${student.gradeLevel}` : '--';
    if (genderEl) {
      console.log('Setting gender element to:', student.gender);
      genderEl.textContent = student.gender || '--';
    }
    if (sectionEl) sectionEl.textContent = student.section || '--';

    // Helper function to display comparison indicator
    const getComparisonIndicator = (studentScore, classAverage) => {
      if (classAverage <= 0) return '';
      if (studentScore > classAverage) return '📈';
      if (studentScore < classAverage) return '📉';
      return '➡️';
    };

    const getComparisonColor = (studentScore, classAverage) => {
      if (classAverage <= 0) return '#999';
      if (studentScore > classAverage) return '#10b981';
      if (studentScore < classAverage) return '#ef4444';
      return '#fbbf24';
    };

    // Update game stats
    const attempts = challengeAttempts || { textExtract: 0, twoTruths: 0, statementScrutinize: 0 };
    const totalAttempts = attempts.textExtract + attempts.twoTruths + attempts.statementScrutinize;
    
    document.getElementById('stat-attempts').textContent = totalAttempts;
    document.getElementById('stat-extract').textContent = attempts.textExtract || 0;
    document.getElementById('stat-truths').textContent = attempts.twoTruths || 0;
    document.getElementById('stat-scrutinize').textContent = attempts.statementScrutinize || 0;

    // Display achievement badges
    displayAchievementBadges(attempts);

    // Calculate stats from weeklyAverages
    if (weeklyAverages) {
      // weeklyAverages is an object with gameID keys, we need to get all scores from all games
      const allScores = [];
      Object.values(weeklyAverages).forEach(gameScores => {
        if (Array.isArray(gameScores)) {
          gameScores.forEach(item => {
            if (item.score) allScores.push(item.score);
          });
        }
      });

      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
      const highScore = allScores.length > 0 ? Math.max(...allScores) : 0;
      
      document.getElementById('stat-highscore').textContent = highScore || 0;
      document.getElementById('stat-avg').textContent = avgScore || 0;

      // Display comparison indicators
      const indicatorHigh = document.getElementById('performance-indicator-high');
      const indicatorAvg = document.getElementById('performance-indicator-avg');
      const averageComparison = document.getElementById('average-comparison-gamemastery');

      if (indicatorHigh) {
        const highIndicator = getComparisonIndicator(highScore, overallAverage);
        indicatorHigh.textContent = highIndicator;
        indicatorHigh.style.color = getComparisonColor(highScore, overallAverage);
        console.log('High score indicator:', highIndicator, 'High score:', highScore, 'Overall avg:', overallAverage);
      }

      if (indicatorAvg) {
        const avgIndicator = getComparisonIndicator(avgScore, overallAverage);
        indicatorAvg.textContent = avgIndicator;
        indicatorAvg.style.color = getComparisonColor(avgScore, overallAverage);
        console.log('Avg score indicator:', avgIndicator, 'Avg score:', avgScore, 'Overall avg:', overallAverage);
      }

      if (averageComparison) {
        averageComparison.textContent = `Class Average: ${overallAverage} PTS.`;
      }

      // Update performance chart - only if we have game data
      if (allScores.length > 0) {
        updatePerformanceChart(weeklyAverages);
      }
    } else {
      document.getElementById('stat-highscore').textContent = '0';
      document.getElementById('stat-avg').textContent = '0';
      console.log('No weeklyAverages data available');
    }

    // Update achievements
    const achievementsGrid = document.getElementById('profile-achievements');
    if (achievementsGrid) {
      achievementsGrid.innerHTML = '';
      
      if (achievements && achievements.length > 0) {
        achievements.slice(0, 8).forEach(achievement => {
          const badge = document.createElement('div');
          badge.style.cssText = `
            width: 100%;
            aspect-ratio: 1;
            border-radius: 8px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: help;
            border: 1px solid #ddd;
          `;
          badge.title = achievement.description || achievement.name || 'Achievement';
          badge.innerHTML = achievement.id % 4 === 0 ? '🎮' : achievement.id % 4 === 1 ? '🛡️' : achievement.id % 4 === 2 ? '⭐' : '🏆';
          achievementsGrid.appendChild(badge);
        });
      } else {
        achievementsGrid.innerHTML = '<p style="grid-column: 1/-1; color: #999; text-align: center;">No achievements yet</p>';
      }
    }
  }

  // Update performance chart
  function updatePerformanceChart(weeklyAverages) {
    const canvas = document.getElementById('performanceChart');
    
    // Destroy existing chart if it exists
    if (chartInstance) {
      chartInstance.destroy();
    }

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Collect all scores from all games
    const allData = [];
    Object.values(weeklyAverages).forEach(gameScores => {
      if (Array.isArray(gameScores)) {
        gameScores.forEach(item => {
          allData.push(item);
        });
      }
    });

    // Sort by week
    allData.sort((a, b) => (a.week || 0) - (b.week || 0));

    const labels = allData.map(w => `Week ${w.week || 0}`);
    const scores = allData.map(w => w.score || 0);

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Score',
          data: scores,
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
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
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
  }

  // Get badge level based on attempts
  function getBadgeLevel(attempts) {
    if (attempts >= 50) return { level: 'gold', name: 'Gold' };
    if (attempts >= 25) return { level: 'silver', name: 'Silver' };
    if (attempts >= 10) return { level: 'bronze', name: 'Bronze' };
    return { level: 'none', name: 'None' };
  }

  // Display achievement badges
  function displayAchievementBadges(attempts) {
    const badgesContainer = document.getElementById('badges-container');
    if (!badgesContainer) return;

    const games = [
      { key: 'textExtract', name: 'Text Extract' },
      { key: 'twoTruths', name: 'Two Truths' },
      { key: 'statementScrutinize', name: 'Statement Scrutinize' }
    ];

    badgesContainer.innerHTML = '';

    games.forEach(game => {
      const attemptCount = attempts[game.key] || 0;
      const badge = getBadgeLevel(attemptCount);
      
      const badgeItem = document.createElement('div');
      badgeItem.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      `;
      
      const badgeEmoji = document.createElement('div');
      badgeEmoji.style.cssText = `
        font-size: 80px;
        line-height: 1;
      `;
      
      // Set badge emoji based on level
      if (badge.level === 'none') {
        badgeEmoji.textContent = '❓';
      } else if (badge.level === 'bronze') {
        badgeEmoji.textContent = '🥉';
      } else if (badge.level === 'silver') {
        badgeEmoji.textContent = '🥈';
      } else if (badge.level === 'gold') {
        badgeEmoji.textContent = '🥇';
      }
      
      const label = document.createElement('div');
      label.style.cssText = `
        text-align: center;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      `;
      label.innerHTML = `<div>${game.name}</div><div style="font-size: 12px; color: #666; margin-top: 4px;">${badge.name} (${attemptCount})</div>`;
      
      badgeItem.appendChild(badgeEmoji);
      badgeItem.appendChild(label);
      badgesContainer.appendChild(badgeItem);
    });
  }

  // Close modal
  window.closeProfileModal = function() {
    document.getElementById('studentProfileModal').style.display = 'none';
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('studentProfileModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Handle grade dropdown change
  if (gradeDropdown) {
    gradeDropdown.addEventListener('change', async function () {
      const selectedGrade = this.value;
      updateSectionDropdown(selectedGrade);
      // Fetch overall average for the selected grade
      fetchOverallAverage(selectedGrade);
      // Fetch data for selected grade and section
      const selectedSection = sectionDropdown.value || null;
      fetchGameMasteryData(selectedGrade === 'All Grade' ? null : selectedGrade, selectedSection);
    });
  }

  // Handle section dropdown change
  if (sectionDropdown) {
    sectionDropdown.addEventListener('change', function () {
      const selectedGrade = gradeDropdown.value;
      const selectedSection = this.value;
      // Extract the section letter from "Section A" format
      const sectionValue = selectedSection.replace('Section ', '') || null;
      fetchGameMasteryData(selectedGrade === 'All Grade' ? null : selectedGrade, sectionValue);
    });
  }

  // Initialize sections for default grade and fetch data on page load
  (function () {
    updateSectionDropdown('All Grade');
    fetchOverallAverage('All Grade');
    fetchGameMasteryData();
  })();
});
