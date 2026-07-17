document.addEventListener("DOMContentLoaded", () => {

  const galleryLinks = document.querySelectorAll("a[data-lightbox]");

  galleryLinks.forEach((link) => {
    const image = new Image();
    image.src = link.href;
  });
});