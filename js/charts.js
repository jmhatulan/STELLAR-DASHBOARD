document.addEventListener("DOMContentLoaded", function () {
  // ---- SAMPLE DATA ----
  const attemptsData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    values: [3, 5, 4, 7, 6]
  };

  const scoresData = {
    labels: ["Two Truths", "Text Extract", "Scrutinize"],
    values: [78, 85, 92]
  };

  const xpData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    values: [100, 250, 400, 600]
  };

  let charts = {};

  // ---- INITIALIZE CHARTS ----
  function initializeCharts() {
    // Only initialize if not already initialized
    if (Object.keys(charts).length === 0) {
      // ATTEMPTS CHART
      charts.attempts = new Chart(document.getElementById("attemptsChart"), {
        type: "line",
        data: {
          labels: attemptsData.labels,
          datasets: [{
            label: "Attempts",
            data: attemptsData.values,
            borderWidth: 2,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.1)"
          }]
        },
        options: { responsive: true }
      });

      // SCORE CHART
      charts.scores = new Chart(document.getElementById("scoresChart"), {
        type: "bar",
        data: {
          labels: scoresData.labels,
          datasets: [{
            label: "Average Score",
            data: scoresData.values,
            borderWidth: 2,
            backgroundColor: "#4f46e5"
          }]
        },
        options: { responsive: true }
      });

      // XP CHART
      charts.xp = new Chart(document.getElementById("xpChart"), {
        type: "radar",
        data: {
          labels: xpData.labels,
          datasets: [{
            label: "XP",
            data: xpData.values,
            borderWidth: 2,
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.2)"
          }]
        },
        options: { responsive: true }
      });
    }
  }

  // ---- PAGE NAVIGATION ----
  const menuItems = document.querySelectorAll(".menu-item[data-page]");
  const pages = document.querySelectorAll(".page");

  menuItems.forEach(item => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Get the page name
      const pageName = this.getAttribute("data-page");

      // Hide all pages
      pages.forEach(page => page.style.display = "none");

      // Show the selected page
      document.getElementById(`page-${pageName}`).style.display = "block";

      // Update active menu item
      menuItems.forEach(mi => mi.classList.remove("active"));
      this.classList.add("active");

      // Initialize charts if showing overview page
      if (pageName === "overview") {
        initializeCharts();
      }
    });
  });

  // Initialize charts on page load
  initializeCharts();

});