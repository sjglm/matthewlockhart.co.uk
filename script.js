"use strict";

const themeToggle = document.querySelector("[data-theme-toggle]");
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(value) {
  const theme = value === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  if (themeColor) themeColor.content = theme === "dark" ? "#11100e" : "#f7f8f3";
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    themeToggle.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }
  return theme;
}

if (themeToggle) {
  applyTheme(document.documentElement.dataset.theme);
  themeToggle.hidden = false;
  themeToggle.addEventListener("click", () => {
    const theme = applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    try {
      localStorage.setItem("portfolio-theme", theme);
    } catch {
      // The control still works when the browser blocks persistent storage.
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "portfolio-theme" || event.key === null) applyTheme(event.newValue);
  });
}

// Load gallery images on demand; image links remain usable without JavaScript.
const dialog = document.querySelector(".gallery-dialog");
const galleryImage = document.querySelector("#gallery-image");
const galleryCaption = document.querySelector("#gallery-caption");
const galleryPosition = document.querySelector("#gallery-position");
const previousButton = document.querySelector(".gallery-previous");
const nextButton = document.querySelector(".gallery-next");
let activeImages = [];
let activeIndex = 0;

function showImage(index) {
  activeIndex = (index + activeImages.length) % activeImages.length;
  const link = activeImages[activeIndex];
  galleryImage.alt = link.dataset.caption;
  galleryImage.src = link.href;
  galleryCaption.textContent = link.dataset.caption;
  galleryPosition.textContent = `${activeIndex + 1} / ${activeImages.length}`;
}

if (dialog && typeof dialog.showModal === "function") {
  // Delegation also supports photos added when a travel entry is selected.
  document.addEventListener("click", (event) => {
    const cover = event.target instanceof Element ? event.target.closest("a.gallery-cover") : null;
    if (!cover) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activeImages = Array.from(document.querySelectorAll("a[data-gallery]"))
      .filter((link) => link.dataset.gallery === cover.dataset.gallery);
    showImage(activeImages.indexOf(cover));
    previousButton.hidden = nextButton.hidden = activeImages.length < 2;
    dialog.showModal();
    document.body.classList.add("gallery-open");
  });
  previousButton.addEventListener("click", () => showImage(activeIndex - 1));
  nextButton.addEventListener("click", () => showImage(activeIndex + 1));
  document.querySelector(".gallery-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showImage(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("gallery-open");
    galleryImage.removeAttribute("src");
  });
  galleryImage.addEventListener("error", () => {
    galleryCaption.textContent = "This image could not be loaded. Try the next image.";
  });
}

document.querySelector("#year").textContent = new Date().getFullYear();
