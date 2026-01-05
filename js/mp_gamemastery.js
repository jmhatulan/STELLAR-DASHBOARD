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

  // Fetch game mastery data
  async function fetchGameMasteryData(gradeLevel = null) {
    try {
      let url = `${API_BASE_URL}/api/admin/dashboard/gamemastery`;
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

          // Add rows for top 10
          const leaderboard = gameData.leaderboard || [];
          if (leaderboard.length === 0) {
            // No data message
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No attempts yet</td></tr>';
          } else {
            leaderboard.forEach(entry => {
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${entry.rank}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.date}</td>
              `;
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
          { rank: 1, name: 'John Doe', score: 95, date: '2024-01-05' },
          { rank: 2, name: 'Jane Smith', score: 92, date: '2024-01-04' },
          { rank: 3, name: 'Bob Johnson', score: 88, date: '2024-01-03' }
        ]
      },
      twoTruths: {
        averageScore: 78,
        leaderboard: [
          { rank: 1, name: 'Alice Brown', score: 90, date: '2024-01-05' },
          { rank: 2, name: 'Charlie Wilson', score: 85, date: '2024-01-04' },
          { rank: 3, name: 'Diana Lee', score: 80, date: '2024-01-03' }
        ]
      },
      statementScrutinize: {
        averageScore: 82,
        leaderboard: [
          { rank: 1, name: 'Eve Davis', score: 93, date: '2024-01-05' },
          { rank: 2, name: 'Frank Miller', score: 87, date: '2024-01-04' },
          { rank: 3, name: 'Grace Taylor', score: 81, date: '2024-01-03' }
        ]
      }
    };

    displayGameData(sampleData);
  }

  // Handle grade filter dropdown change
  const gradeDropdown = document.querySelector('.dropdown');
  if (gradeDropdown) {
    gradeDropdown.addEventListener('change', function () {
      const selectedGrade = this.value;
      fetchGameMasteryData(selectedGrade);
    });
  }

  // Fetch data on page load
  fetchGameMasteryData();
});
