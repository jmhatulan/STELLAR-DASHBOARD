document.addEventListener("DOMContentLoaded", function () {
  // ---- ENGAGEMENT DATA ----
  const engagementData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"],
    values: [45, 38, 50, 42, 55, 48, 60, 58, 65, 52, 70, 68, 75, 70, 78]
  };

  const challengeData = {
    labels: ["Text Extract", "Two Truths", "Statement Scrutinize"],
    values: [100, 60, 75]
  };

  // ---- INITIALIZE ENGAGEMENT CHART (Area Chart) ----
  new Chart(document.getElementById("engagementChart"), {
    type: "line",
    data: {
      labels: engagementData.labels,
      datasets: [{
        label: "Month's Daily Login",
        data: engagementData.values,
        borderWidth: 2,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
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

  // ---- INITIALIZE CHALLENGE ATTEMPTS CHART (Bar Chart) ----
  new Chart(document.getElementById("challengeChart"), {
    type: "bar",
    data: {
      labels: challengeData.labels,
      datasets: [{
        label: "Attempts",
        data: challengeData.values,
        backgroundColor: ["#e879f9", "#fbbf24", "#10b981"],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "x",
      plugins: {
        legend: {
          display: false
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
});

