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
  const cruiseList = section.querySelector("[data-cruise-list]");
  const allCruises = section.querySelector("[data-cruise-all]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const initialRotation = [-15, -25, 0];
  const minZoom = .85;
  const maxZoom = 4;
  const ns = "http://www.w3.org/2000/svg";
  let entries = [{ id: "GBR", name: "United Kingdom", home: true, notes: ["Based in Yorkshire, England."], photos: [] }];
  let selectedId = "GBR";
  let countries = new Map();
  let countryPaths = [];
  let pins = [];
  let cruises = [];
  let cruiseRoutes = [];
  let cruisePorts = [];
  let activeCruiseId = null;
  let hoveredCruiseId = null;
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

  const cruiseDateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  function formatCruiseDate(date) {
    return cruiseDateFormat.format(new Date(`${date}T00:00:00Z`));
  }

  function updateCruiseStyles() {
    const highlighted = hoveredCruiseId || activeCruiseId;
    cruiseRoutes.forEach(({ group, cruise }) => {
      group.classList.toggle("is-highlighted", cruise.id === highlighted);
      group.classList.toggle("is-muted", Boolean(highlighted && cruise.id !== highlighted));
    });
    cruiseList?.querySelectorAll("[data-cruise-card]").forEach(card => {
      const selected = card.dataset.cruiseCard === activeCruiseId;
      card.classList.toggle("is-selected", selected);
      card.querySelector("button").setAttribute("aria-pressed", String(selected));
    });
    if (allCruises) allCruises.hidden = !activeCruiseId;
  }

  function hoverCruise(id) {
    if (hoveredCruiseId === id) return;
    hoveredCruiseId = id;
    updateCruiseStyles();
    requestDraw();
  }

  function clearCruiseSelection() {
    activeCruiseId = null;
    hoveredCruiseId = null;
    updateCruiseStyles();
    requestDraw();
  }

  function selectCruise(id) {
    const cruise = cruises.find(item => item.id === id);
    if (!cruise) return;
    activeCruiseId = id;
    hoveredCruiseId = null;
    tooltip.hidden = true;
    updateCruiseStyles();
    if (projection) {
      const centre = window.d3.geoCentroid(cruise.feature);
      const angle = Math.max(...cruise.coordinates.map(point => window.d3.geoDistance(centre, point)));
      zoom = Math.min(maxZoom, Math.max(1, .95 / Math.max(.1, Math.sin(angle))));
      rotateTo([-centre[0], -centre[1], 0]);
      svg.focus({ preventScroll: true });
    }
    mapCard.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
  }

  function renderCruises() {
    if (!cruiseList || !cruises.length) return;
    cruiseList.replaceChildren();
    cruises.forEach((cruise, index) => {
      const card = document.createElement("li");
      card.className = "cruise-card";
      card.dataset.cruiseCard = cruise.id;
      card.dataset.cruiseColour = String(index % 3);
      const heading = document.createElement("div");
      heading.className = "cruise-card-title";
      const name = document.createElement("h3");
      name.textContent = cruise.name;
      heading.append(name);
      const line = document.createElement("p");
      line.className = "cruise-line";
      line.textContent = cruise.line || "";
      const dates = document.createElement("p");
      dates.className = "cruise-date";
      [cruise.departureDate, cruise.returnDate].forEach((date, i) => {
        if (i) dates.append(" – ");
        const time = document.createElement("time");
        time.dateTime = date;
        time.textContent = formatCruiseDate(date);
        dates.append(time);
      });
      const itinerary = document.createElement("p");
      itinerary.className = "cruise-itinerary";
      itinerary.textContent = cruise.ports.map(port => port.name).join(" → ");
      const actions = document.createElement("div");
      actions.className = "cruise-actions";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cruise-route-button";
      button.textContent = "Show route";
      button.setAttribute("aria-label", `Show ${cruise.name} route`);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => selectCruise(cruise.id));
      actions.append(button);
      if (/^https:\/\//.test(cruise.itineraryUrl || "")) {
        const source = document.createElement("a");
        source.className = "cruise-source";
        source.href = cruise.itineraryUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Itinerary ↗";
        source.setAttribute("aria-label", `${cruise.name} published itinerary (opens in a new tab)`);
        actions.append(source);
      }
      card.append(heading, line, dates, itinerary, actions);
      cruiseList.append(card);
    });
    updateCruiseStyles();
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
    cruiseRoutes.forEach(route => {
      const routePath = path(route.cruise.feature) || "";
      route.paths.forEach(node => node.setAttribute("d", routePath));
    });
    const highlighted = hoveredCruiseId || activeCruiseId;
    cruisePorts.forEach(({ node, port, cruiseId }) => {
      const [x, y] = projection(port.coordinates);
      const visible = cruiseId === highlighted && window.d3.geoDistance(port.coordinates, centre) < Math.PI / 2 - .02;
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
    if (rotate) clearCruiseSelection();
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
      const routeLayer = makeSVG("g", { "aria-hidden": "true" });
      const portLayer = makeSVG("g", { "aria-hidden": "true" });
      countryPaths = [];
      pins = [];
      cruiseRoutes = [];
      cruisePorts = [];
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
      cruises.forEach((cruise, index) => {
        const group = makeSVG("g", { class: "cruise-route-group", "data-cruise": cruise.id, "data-cruise-colour": index % 3 });
        const paths = ["cruise-route-halo", "cruise-route", "cruise-route-hit"].map(className => makeSVG("path", { class: className }));
        group.append(...paths);
        routeLayer.append(group);
        cruiseRoutes.push({ group, paths, cruise });
        cruise.ports.forEach(port => {
          const node = makeSVG("circle", { class: "cruise-port", r: "4", "data-cruise": cruise.id, "data-cruise-colour": index % 3, "data-port-name": port.name });
          portLayer.append(node);
          cruisePorts.push({ node, port, cruiseId: cruise.id });
        });
      });
      layers.replaceChildren(sphere, grid, land, shade, routeLayer, markers, portLayer);
      selectEntry(selectedId, false);
      updateCruiseStyles();
      draw();
      svg.removeAttribute("hidden");
      controls.hidden = false;
      status.hidden = true;
      mapCard.classList.add("is-ready");
      if (activeCruiseId) selectCruise(activeCruiseId);
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
    const cruise = event.target.closest("[data-cruise]")?.dataset.cruise;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: rotation.slice(), moved: false, country, cruise };
    svg.setPointerCapture(event.pointerId);
    tooltip.hidden = true;
    hoverCruise(null);
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
      const route = event.target.closest("[data-cruise]");
      const cruise = cruises.find(item => item.id === route?.dataset.cruise);
      hoverCruise(cruise?.id || null);
      if (cruise) {
        const portName = route.dataset.portName;
        tooltip.hidden = false;
        tooltip.textContent = `${cruise.name} · ${formatCruiseDate(cruise.departureDate)} – ${formatCruiseDate(cruise.returnDate)}${portName ? ` · ${portName}` : ""}`;
        return;
      }
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
    if (event.type === "pointerup" && !completed.moved) {
      if (completed.cruise) selectCruise(completed.cruise);
      else if (completed.country) selectEntry(completed.country);
    }
  }
  svg.addEventListener("pointerup", finishDrag);
  svg.addEventListener("pointercancel", finishDrag);
  svg.addEventListener("lostpointercapture", finishDrag);
  svg.addEventListener("pointerleave", () => { tooltip.hidden = true; hoverCruise(null); });
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
    clearCruiseSelection();
    rotateTo(initialRotation);
  }
  controls.querySelectorAll("[data-globe-zoom]").forEach(button => button.addEventListener("click", () => zoomBy(Number(button.dataset.globeZoom))));
  controls.querySelector("[data-globe-reset]").addEventListener("click", reset);
  retry.addEventListener("click", loadMap);
  allCruises?.addEventListener("click", () => {
    reset();
    mapCard.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
    svg.focus({ preventScroll: true });
  });
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
      if (Array.isArray(data.cruises)) {
        const coordinate = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
        const date = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
        const ids = new Set();
        cruises = data.cruises.filter(cruise => {
          if (!cruise || typeof cruise.id !== "string" || ids.has(cruise.id) || typeof cruise.name !== "string" || !date(cruise.departureDate) || !date(cruise.returnDate)) return false;
          if (!Array.isArray(cruise.ports) || cruise.ports.length < 2 || !cruise.ports.every(port => port && typeof port.name === "string" && coordinate(port.coordinates))) return false;
          ids.add(cruise.id);
          return true;
        }).map(cruise => {
          // Sea waypoints connect published itinerary ports; these are not recorded GPS tracks.
          const coordinates = Array.isArray(cruise.path) && cruise.path.length >= 2 && cruise.path.every(coordinate) ? cruise.path : cruise.ports.map(port => port.coordinates);
          return { ...cruise, coordinates, feature: { type: "LineString", coordinates } };
        });
      }
    } catch {
      // The home entry remains available if the journal file cannot be loaded.
    }
    renderPlaces();
    renderCruises();
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
