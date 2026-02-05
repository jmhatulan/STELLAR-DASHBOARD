document.addEventListener("DOMContentLoaded", function () {
  // ---- SIDEBAR TOGGLE ----
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleBtn');
  
  // Create expand button
  const expandBtn = document.createElement('button');
  expandBtn.className = 'expand-btn';
  expandBtn.innerHTML = '☰';
  expandBtn.title = 'Show sidebar';
  document.body.appendChild(expandBtn);
  
  // Load sidebar state from localStorage
  const sidebarState = localStorage.getItem('sidebarCollapsed');
  if (sidebarState === 'true') {
    sidebar.classList.add('collapsed');
    expandBtn.classList.add('visible');
  }
  
  // Toggle sidebar
  toggleBtn.addEventListener('click', function() {
    sidebar.classList.toggle('collapsed');
    expandBtn.classList.toggle('visible');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  });
  
  expandBtn.addEventListener('click', function() {
    sidebar.classList.remove('collapsed');
    expandBtn.classList.remove('visible');
    localStorage.setItem('sidebarCollapsed', 'false');
  });

  // ---- PAGE NAVIGATION ----
  const menuItems = document.querySelectorAll(".menu-item[data-page]");
  const pages = document.querySelectorAll(".page");

  // Check for page parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const pageFromUrl = urlParams.get('page');
  
  if (pageFromUrl) {
    // Load the page from URL parameter
    pages.forEach(page => page.style.display = "none");
    const targetPage = document.getElementById(`page-${pageFromUrl}`);
    if (targetPage) {
      targetPage.style.display = "block";
      // Update active menu item
      menuItems.forEach(mi => {
        if (mi.getAttribute("data-page") === pageFromUrl) {
          mi.classList.add("active");
        } else {
          mi.classList.remove("active");
        }
      });
    }
  }

  menuItems.forEach(item => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Get the page name
      const pageName = this.getAttribute("data-page");

      // Fade out all pages
      pages.forEach(page => page.style.opacity = '0');

      setTimeout(() => {
        // Hide all pages and show the selected page
        pages.forEach(page => page.style.display = "none");
        const targetPage = document.getElementById(`page-${pageName}`);
        targetPage.style.display = "block";
        targetPage.style.opacity = '0';

        // Reset progress page iframe to sections view when accessing from menu
        if (pageName === "progress") {
          targetPage.src = "mp_progress_section.html";
        }

        // Trigger fade in
        setTimeout(() => { targetPage.style.opacity = '1'; }, 10);
      }, 250);

      // Update active menu item
      menuItems.forEach(mi => mi.classList.remove("active"));
      this.classList.add("active");
    });
  });
});