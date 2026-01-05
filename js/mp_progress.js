document.addEventListener("DOMContentLoaded", function () {
  // Add click handlers to progress cards for redirect
  const progressCards = document.querySelectorAll('.progress-card');
  progressCards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
      // Load detail page in the same iframe
      if (window.parent !== window) {
        // If in iframe, update parent's iframe src
        window.parent.document.getElementById('page-progress').src = 'mp_progress_detail.html';
      } else {
        // If not in iframe, navigate normally
        window.location.href = 'mp_progress_detail.html';
      }
    });
  });

  // Chart configuration for all cards
  const chartsConfig = [
    { donutId: "chart-1", barId: "activity-1" },
    { donutId: "chart-2", barId: "activity-2" },
    { donutId: "chart-3", barId: "activity-3" },
    { donutId: "chart-4", barId: "activity-4" },
    { donutId: "chart-5", barId: "activity-5" },
    { donutId: "chart-6", barId: "activity-6" }
  ];

  chartsConfig.forEach((config, index) => {
    // ---- DONUT CHART (60% Accuracy) ----
    new Chart(document.getElementById(config.donutId), {
      type: "doughnut",
      data: {
        datasets: [{
          data: [60, 40],
          backgroundColor: ["#d0f9d0", "#f0f0f0"],
          borderColor: ["#10b981", "#e5e5e5"],
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
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
          const text = "60%";
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2;
          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }]
    });

    // ---- ACTIVITY BAR CHART ----
    new Chart(document.getElementById(config.barId), {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Activity",
          data: [12, 18, 14, 16],
          backgroundColor: "#10b981",
          borderRadius: 3,
          barThickness: 10,
          maxBarThickness: 10
        }]
      },
      options: {
        responsive: false,
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
            max: 30,
            grid: {
              display: false
            },
            ticks: {
              display: false
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 8
              }
            }
          }
        }
      }
    });
  });
});
