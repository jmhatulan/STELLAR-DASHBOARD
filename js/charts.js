document.addEventListener("DOMContentLoaded", function () {
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
    });
  });
});