"use strict";

(() => {
  const section = document.querySelector("#life");
  if (!section) return;

  const svg = section.querySelector(".travel-globe");
  const layers = section.querySelector("[data-globe-layers]");
  const mapCard = section.querySelector(".travel-map-card");
  const status = section.querySelector("[data-map-status]");
  const tooltip = section.querySelector("[data-globe-tooltip]");
  const controls = section.querySelector("[data-globe-controls]");
  const retry = section.querySelector("[data-globe-retry]");
  const list = section.querySelector("[data-country-list]");
  const title = section.querySelector("#travel-country-name");
  const label = section.querySelector("[data-entry-label]");
  const notes = section.querySelector("[data-entry-notes]");
  const photos = section.querySelector("[data-entry-photos]");
  const emptyPhotos = section.querySelector("[data-photos-empty]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const initialRotation = [-15, -25, 0];
  const minZoom = .85;
  const maxZoom = 2.6;
  const ns = "http://www.w3.org/2000/svg";
  let entries = [{ id: "GBR", name: "United Kingdom", home: true, notes: ["Based in Yorkshire, England."], photos: [] }];
  let selectedId = "GBR";
  let countries = new Map();
  let countryPaths = [];
  let pins = [];
  let projection;
  let path;
  let graticule;
  let sphere;
  let grid;
  let shade;
  let zoom = 1;
  let rotation = initialRotation.slice();
  let renderFrame = 0;
  let animationFrame = 0;
  let drag = null;
  let libraryPromise;
  let loading = false;

  async function readJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.json();
  }

  function loadGeo() {
    if (window.d3?.geoOrthographic) return Promise.resolve();
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "Assets/vendor/d3-geo.bundle.min.js";
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        libraryPromise = null;
        reject(new Error("Could not load the globe renderer"));
      };
      document.head.append(script);
    });
    return libraryPromise;
  }

  function makeSVG(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function stopAnimation() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function draw() {
    if (!projection) return;
    projection.rotate(rotation).scale(230 * zoom);
    const outline = path({ type: "Sphere" });
    sphere.setAttribute("d", outline);
    shade.setAttribute("d", outline);
    grid.setAttribute("d", path(graticule));
    section.querySelector(".globe-atmosphere").setAttribute("r", 230 * zoom + 2);
    countryPaths.forEach(({ node, feature }) => node.setAttribute("d", path(feature) || ""));
    const centre = projection.invert([300, 300]);
    pins.forEach(({ node, feature }) => {
      const point = feature.properties.label;
      const [x, y] = projection(point);
      const visible = window.d3.geoDistance(point, centre) < Math.PI / 2 - .02;
      node.style.display = visible ? "" : "none";
      node.setAttribute("cx", x);
      node.setAttribute("cy", y);
    });
    controls.querySelector('[data-globe-zoom="1"]').disabled = zoom >= maxZoom;
    controls.querySelector('[data-globe-zoom="-1"]').disabled = zoom <= minZoom;
  }

  function requestDraw() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      draw();
    });
  }

  function rotateTo(target) {
    stopAnimation();
    if (!projection) return;
    if (reducedMotion.matches) {
      rotation = target.slice();
      draw();
      return;
    }
    const from = rotation.slice();
    const longitude = (((target[0] - from[0]) % 360 + 540) % 360) - 180;
    const start = performance.now();
    function animate(now) {
      const progress = Math.min(1, (now - start) / 550);
      const ease = 1 - (1 - progress) ** 3;
      rotation = [from[0] + longitude * ease, from[1] + (target[1] - from[1]) * ease, 0];
      draw();
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
      else animationFrame = 0;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function selectEntry(id, rotate = true) {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    selectedId = id;
    title.textContent = entry.name;
    label.textContent = entry.home ? "Home" : "Visited";
    notes.replaceChildren();
    const paragraphs = Array.isArray(entry.notes) && entry.notes.length ? entry.notes : ["Travel notes coming soon."];
    paragraphs.forEach(text => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      notes.append(paragraph);
    });
    photos.replaceChildren();
    (Array.isArray(entry.photos) ? entry.photos : []).forEach(photo => {
      if (!photo || typeof photo.src !== "string") return;
      let url;
      try {
        url = new URL(photo.src, document.baseURI);
      } catch {
        return;
      }
      if (!["http:", "https:"].includes(url.protocol)) return;
      const link = document.createElement("a");
      link.className = "travel-photo gallery-cover";
      link.href = url.href;
      link.dataset.gallery = `travel-${entry.id}`;
      link.dataset.caption = photo.caption || photo.alt || `${entry.name} travel photo`;
      link.setAttribute("aria-label", `Open photo: ${link.dataset.caption}`);
      const image = document.createElement("img");
      image.src = url.href;
      image.alt = photo.alt || link.dataset.caption;
      image.loading = "lazy";
      image.decoding = "async";
      const caption = document.createElement("span");
      caption.className = "gallery-label";
      caption.textContent = "View photo";
      link.append(image, caption);
      photos.append(link);
    });
    emptyPhotos.hidden = photos.childElementCount > 0;
    list.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.country === id)));
    [...countryPaths, ...pins].forEach(({ node, feature }) => node.classList.toggle("is-selected", feature.id === id));
    const feature = countries.get(id);
    if (rotate && feature) {
      const [longitude, latitude] = feature.properties.label;
      rotateTo([-longitude, -latitude, 0]);
    }
  }

  function renderPlaces() {
    list.replaceChildren();
    entries.forEach(entry => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.country = entry.id;
      button.textContent = entry.name;
      if (entry.home) {
        const home = document.createElement("span");
        home.textContent = "Home";
        button.append(home);
      }
      button.addEventListener("click", () => selectEntry(entry.id));
      list.append(button);
    });
    selectEntry(entries.some(entry => entry.id === selectedId) ? selectedId : entries[0].id, false);
  }

  async function loadMap() {
    if (loading) return;
    loading = true;
    retry.hidden = true;
    status.hidden = false;
    status.textContent = "Loading globe…";
    try {
      const [world] = await Promise.all([readJSON("Assets/travel/countries.geojson"), loadGeo()]);
      const geo = window.d3;
      countries = new Map(world.features.map(feature => [feature.id, feature]));
      projection = geo.geoOrthographic().translate([300, 300]).scale(230).rotate(rotation).clipAngle(90).precision(.5);
      path = geo.geoPath(projection).digits(2);
      graticule = geo.geoGraticule10();
      sphere = makeSVG("path", { class: "globe-ocean" });
      grid = makeSVG("path", { class: "globe-graticule" });
      shade = makeSVG("path", { class: "globe-shade" });
      const land = makeSVG("g", { "aria-hidden": "true" });
      const markers = makeSVG("g", { "aria-hidden": "true" });
      countryPaths = [];
      pins = [];
      const visited = new Set(entries.map(entry => entry.id));
      world.features.forEach(feature => {
        const node = makeSVG("path", { class: `travel-country${visited.has(feature.id) ? " is-visited" : ""}`, "data-country": feature.id });
        land.append(node);
        countryPaths.push({ node, feature });
        if (visited.has(feature.id)) {
          const pin = makeSVG("circle", { class: "globe-pin", r: "4.5", "data-country": feature.id });
          markers.append(pin);
          pins.push({ node: pin, feature });
        }
      });
      layers.replaceChildren(sphere, grid, land, shade, markers);
      selectEntry(selectedId, false);
      draw();
      svg.removeAttribute("hidden");
      controls.hidden = false;
      status.hidden = true;
      mapCard.classList.add("is-ready");
    } catch {
      status.textContent = "The globe couldn’t load. My travel notes are still available alongside it.";
      retry.hidden = false;
    } finally {
      loading = false;
    }
  }

  function zoomBy(direction) {
    stopAnimation();
    zoom = Math.max(minZoom, Math.min(maxZoom, +(zoom + direction * .25).toFixed(2)));
    draw();
  }

  svg.addEventListener("wheel", event => {
    // Activate the map first so scrolling past it still scrolls the page.
    if (!projection || !mapCard.contains(document.activeElement) || event.ctrlKey || !event.deltaY) return;
    event.preventDefault();
    stopAnimation();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1;
    const delta = Math.max(-200, Math.min(200, event.deltaY * unit));
    zoom = Math.max(minZoom, Math.min(maxZoom, zoom * Math.exp(-delta * .0015)));
    tooltip.hidden = true;
    requestDraw();
  }, { passive: false });

  svg.addEventListener("pointerdown", event => {
    if (event.button !== 0 || drag) return;
    stopAnimation();
    svg.focus({ preventScroll: true });
    const country = event.target.closest("[data-country]")?.dataset.country;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: rotation.slice(), moved: false, country };
    svg.setPointerCapture(event.pointerId);
    tooltip.hidden = true;
  });
  svg.addEventListener("pointermove", event => {
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      svg.classList.add("is-dragging");
      const sensitivity = 180 / Math.PI / projection.scale() * 600 / svg.getBoundingClientRect().width;
      rotation = [drag.rotation[0] + dx * sensitivity, Math.max(-85, Math.min(85, drag.rotation[1] - dy * sensitivity)), 0];
      requestDraw();
    } else if (!drag) {
      const id = event.target.closest("[data-country]")?.dataset.country;
      const feature = countries.get(id);
      tooltip.hidden = !feature;
      if (feature) {
        const entry = entries.find(item => item.id === id);
        tooltip.textContent = `${entry?.name || feature.properties.name}${entry ? (entry.home ? " · Home" : " · Visited") : ""}`;
      }
    }
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const completed = drag;
    drag = null;
    svg.classList.remove("is-dragging");
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    if (event.type === "pointerup" && !completed.moved && completed.country) selectEntry(completed.country);
  }
  svg.addEventListener("pointerup", finishDrag);
  svg.addEventListener("pointercancel", finishDrag);
  svg.addEventListener("lostpointercapture", finishDrag);
  svg.addEventListener("pointerleave", () => { tooltip.hidden = true; });
  svg.addEventListener("keydown", event => {
    const arrows = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
    if (arrows[event.key]) {
      event.preventDefault();
      stopAnimation();
      rotation = [rotation[0] + arrows[event.key][0], Math.max(-85, Math.min(85, rotation[1] + arrows[event.key][1])), 0];
      draw();
    } else if (["+", "=", "-", "−", "Home"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") reset();
      else zoomBy(["+", "="].includes(event.key) ? 1 : -1);
    }
  });
  function reset() {
    zoom = 1;
    tooltip.hidden = true;
    rotateTo(initialRotation);
  }
  controls.querySelectorAll("[data-globe-zoom]").forEach(button => button.addEventListener("click", () => zoomBy(Number(button.dataset.globeZoom))));
  controls.querySelector("[data-globe-reset]").addEventListener("click", reset);
  retry.addEventListener("click", loadMap);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) stopAnimation();
  });

  async function initialize() {
    try {
      const data = await readJSON("travel-data.json");
      if (Array.isArray(data.countries) && data.countries.length) {
        const ids = new Set();
        const valid = data.countries.filter(entry => {
          if (!entry || !/^[A-Z]{3}$/.test(entry.id) || typeof entry.name !== "string" || ids.has(entry.id)) return false;
          ids.add(entry.id);
          return true;
        });
        if (valid.length) entries = valid;
      }
    } catch {
      // The home entry remains available if the journal file cannot be loaded.
    }
    renderPlaces();
    await loadMap();
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(records => {
      if (!records.some(record => record.isIntersecting)) return;
      observer.disconnect();
      initialize();
    }, { rootMargin: "350px" });
    observer.observe(section);
  } else initialize();
})();
