const root = document.documentElement;
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#nav-menu");
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const year = document.querySelector("#current-year");

const THEME_KEY = "portfolio-theme";

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);

  if (themeIcon) {
    themeIcon.textContent = theme === "dark" ? "☾" : theme === "light" ? "☼" : "◐";
  }
}

function getNextTheme(currentTheme) {
  if (currentTheme === "auto") return "dark";
  if (currentTheme === "dark") return "light";
  return "auto";
}

const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme || "auto");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    });
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(getNextTheme(root.dataset.theme || "auto"));
  });
}
