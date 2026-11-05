"use strict";

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
  document.querySelectorAll(".gallery-cover").forEach((cover) => {
    cover.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      activeImages = Array.from(document.querySelectorAll("a[data-gallery]"))
        .filter((link) => link.dataset.gallery === cover.dataset.gallery);
      showImage(0);
      previousButton.hidden = nextButton.hidden = activeImages.length < 2;
      dialog.showModal();
      document.body.classList.add("gallery-open");
    });
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
