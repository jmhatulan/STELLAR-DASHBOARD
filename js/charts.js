document.addEventListener("DOMContentLoaded", function () {
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

      // Hide all pages
      pages.forEach(page => page.style.display = "none");

      // Show the selected page
      document.getElementById(`page-${pageName}`).style.display = "block";

      // Update active menu item
      menuItems.forEach(mi => mi.classList.remove("active"));
      this.classList.add("active");
    });
  });
});