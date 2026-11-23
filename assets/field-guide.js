(function () {
  "use strict";
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const media = (query) => (window.matchMedia ? window.matchMedia(query) : { matches: false });
  const motion = media("(prefers-reduced-motion: reduce)");
  const narrow = media("(max-aspect-ratio: 4/5)");
  const dataSaver = Boolean(navigator.connection && navigator.connection.saveData);
  const mast = document.querySelector(".mast");
  const paper = Array.from(document.querySelectorAll(".paper-block,.case-band"));
  const projects = document.querySelector(".exhibit");
  const entries = Array.from(document.querySelectorAll("[data-specimen]"));
  const figures = Array.from(document.querySelectorAll("[data-figure]"));
  const gallery = document.querySelector(".specimens");
  const pocket = media("(max-width: 700px)");
  const tour = document.querySelector(".tour");
  const stage = document.querySelector(".tour-stage");
  const copies = Array.from(document.querySelectorAll("[data-copy]"));
  const plates = Array.from(document.querySelectorAll("[data-plate]"));
  const stops = Array.from(document.querySelectorAll("[data-jump]"));
  const anchors = ["ho-so", "ma-nguon", "bo-mach"];
  const chapters = ["profile", "code", "hardware"];
  const dialog = document.getElementById("orbit-dialog");
  const openButton = document.getElementById("open-orbit");
  const closeButton = document.getElementById("close-orbit");
  const figure = document.getElementById("workbench");
  const worldHolder = document.querySelector(".world-visual");
  const orbitHolder = document.getElementById("model-stage");
  let liveOrbit = false;
  let orbitView = { view: "profile", angle: 0, tilt: 0 };
  function markOrbit(value) {
    if (liveOrbit === value) return;
    liveOrbit = value;
    figure.dispatchEvent(new CustomEvent("lab-live", { detail: value }));
  }
  let frame = 0,
    stopTimer = 0,
    moving = false,
    inView = false;
  let current = -1,
    progress = 0,
    engine = null;
  let loadingEngine = false,
    engineFailed = false,
    startupScheduled = false;
  let filmContext,
    filmCanvas,
    filmIndex = -1,
    filmFormat = "";
  const films = new Map();

  function askFrame() {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(update);
  }
  function onActivity() {
    moving = true;
    clearTimeout(stopTimer);
    stopTimer = setTimeout(function () {
      moving = false;
      askFrame();
    }, 190);
    askFrame();
  }
  function selectSpecimen(entry) {
    for (const other of entries) if (other !== entry && other.open) other.open = false;
    for (const f of figures) {
      const selected = f.dataset.figure === entry.dataset.specimen;
      f.hidden = !selected;
      const holder = pocket.matches && selected ? entry.querySelector(".spec-slot") : gallery;
      if (f.parentElement !== holder) holder.append(f);
    }
  }
  for (const entry of entries) {
    entry.addEventListener("toggle", function () {
      if (entry.open) selectSpecimen(entry);
    });
  }
  if (entries.length) {
    const placeSelection = function () {
      const selected = entries.find(function (entry) {
        return entry.open;
      });
      if (selected) selectSpecimen(selected);
    };
    placeSelection();
    if (pocket.addEventListener) pocket.addEventListener("change", placeSelection);
    else if (pocket.addListener) pocket.addListener(placeSelection);
  }
  function updatePaper() {
    const y = mast.getBoundingClientRect().bottom - 8;
    const onPaper = paper.some(function (section) {
      const rect = section.getBoundingClientRect();
      return rect.top <= y && rect.bottom > y;
    });
    mast.classList.toggle("on-paper", onPaper);
    if (!projects) return;
    const rect = projects.getBoundingClientRect(),
      h = window.innerHeight;
    if (rect.bottom < 0 || rect.top > h) return;
    const ratio = clamp((h - rect.top) / (rect.height + h));
    projects.style.setProperty("--survey", (ratio * 130 - 15).toFixed(1) + "%");
    projects.style.setProperty("--survey-alpha", moving && !motion.matches ? ".94" : "0");
  }
  function selectChapter(index) {
    if (index === current) return;
    current = index;
    for (let i = 0; i < copies.length; i++) {
      const active = i === index;
      copies[i].classList.toggle("active", active);
      if (!active && copies[i].contains(document.activeElement)) stops[index].focus({ preventScroll: true });
      copies[i].inert = !active;
      copies[i].setAttribute("aria-hidden", String(!active));
      for (const a of copies[i].querySelectorAll("a")) a.tabIndex = active ? 0 : -1;
      if (active) stops[i].setAttribute("aria-current", "step");
      else stops[i].removeAttribute("aria-current");
    }
  }
  function loadFilm(format) {
    if (films.has(format) || dataSaver || motion.matches) return;
    const sheet = new Image();
    const item = { image: sheet, ready: false };
    films.set(format, item);
    sheet.onload = function () {
      item.ready = true;
      askFrame();
    };
    sheet.src = "/assets/field/journey/" + format + ".webp";
  }
  function paintFallback() {
    const position = motion.matches ? current * 0.5 : progress;
    plates.forEach(function (plate, index) {
      // Opaque lower layer avoids a black dip between the two views.
      plate.style.opacity = position * 2 >= index ? "1" : String(clamp(position * 2 - index + 1));
    });
    const format = narrow.matches ? "mobile" : "desktop";
    const offStop = Math.min(position, Math.abs(position - 0.5), 1 - position) > 0.024;
    if (offStop && !motion.matches && !dataSaver) loadFilm(format);
    const item = films.get(format);
    if (engine || !offStop || !item || !item.ready || motion.matches || dataSaver) {
      if (filmCanvas) filmCanvas.hidden = true;
      return;
    }
    if (!filmCanvas) {
      filmCanvas = document.createElement("canvas");
      filmCanvas.className = "travel-film";
      filmCanvas.setAttribute("aria-hidden", "true");
      document.querySelector(".world-visual").append(filmCanvas);
      filmContext = filmCanvas.getContext("2d");
    }
    if (!filmContext) {
      filmCanvas.hidden = true;
      return;
    }
    const index = Math.round(position * 31);
    if (index !== filmIndex || format !== filmFormat) {
      const w = item.image.naturalWidth / 8,
        h = item.image.naturalHeight / 4;
      if (!w || !h) return;
      if (filmCanvas.width !== w || filmCanvas.height !== h) {
        filmCanvas.width = w;
        filmCanvas.height = h;
      }
      filmContext.drawImage(item.image, (index % 8) * w, Math.floor(index / 8) * h, w, h, 0, 0, w, h);
      filmIndex = index;
      filmFormat = format;
    }
    filmCanvas.hidden = false;
  }
  function allowedLive() {
    return tour && inView && !document.hidden && !motion.matches && !dataSaver;
  }
  function engineLost() {
    engineFailed = true;
    engine = null;
    markOrbit(false);
    document.getElementById("world-canvas").hidden = true;
    askFrame();
  }
  function launch() {
    startupScheduled = false;
    if (!allowedLive() || engine || loadingEngine || engineFailed) return;
    loadingEngine = true;
    const component = document.createElement("script");
    if (!("noModule" in component)) {
      engineFailed = true;
      loadingEngine = false;
      return;
    }
    component.type = "module";
    component.src = "/assets/field-scene.js";
    function failed() {
      loadingEngine = false;
      engineLost();
    }
    component.onerror = failed;
    if (window.THREE) {
      document.head.append(component);
      return;
    }
    const three = document.createElement("script");
    three.src = "/assets/vendor/three.min.js";
    three.onload = function () {
      document.head.append(component);
    };
    three.onerror = failed;
    document.head.append(three);
  }
  function scheduleEngine() {
    if (!allowedLive() || engine || loadingEngine || startupScheduled || engineFailed) return;
    startupScheduled = true;
    if ("requestIdleCallback" in window) window.requestIdleCallback(launch, { timeout: 900 });
    else setTimeout(launch, 100);
  }
  if (tour)
    tour.addEventListener("field-engine", function (event) {
      loadingEngine = false;
      try {
        engine = event.detail(window.THREE, document.getElementById("world-canvas"), engineLost);
        askFrame();
      } catch (_) {
        engineLost();
      }
    });
  function update() {
    frame = 0;
    updatePaper();
    if (!tour || document.hidden) return;
    const rect = tour.getBoundingClientRect(),
      height = stage.offsetHeight || window.innerHeight;
    inView = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!inView) return;
    progress = clamp(-rect.top / Math.max(1, tour.offsetHeight - height));
    selectChapter(Math.round(progress * 2));
    tour.style.setProperty("--progress", progress.toFixed(4));
    const canvas = document.getElementById("world-canvas");
    if (dialog && dialog.open) {
      if (engine && allowedLive()) {
        try {
          if (canvas.parentElement !== orbitHolder) orbitHolder.append(canvas);
          const visible = engine.orbit(
            orbitView.view,
            orbitView.angle,
            orbitView.tilt,
            orbitHolder.clientWidth,
            orbitHolder.clientHeight,
          );
          canvas.hidden = !visible;
          markOrbit(visible);
        } catch (_) {
          engineLost();
        }
      } else {
        canvas.hidden = true;
        markOrbit(false);
        scheduleEngine();
      }
      return;
    }
    if (canvas.parentElement !== worldHolder) worldHolder.append(canvas);
    markOrbit(false);
    if (!allowedLive() || !engine) {
      canvas.hidden = true;
      paintFallback();
      scheduleEngine();
    } else {
      try {
        const liveSurvey = moving && progress > 0 && progress < 1;
        engine.draw(
          progress,
          chapters[current],
          narrow.matches,
          stage.clientWidth,
          height,
          liveSurvey ? progress : -1,
        );
        canvas.hidden = false;
        if (filmCanvas) filmCanvas.hidden = true;
      } catch (_) {
        engineLost();
        paintFallback();
      }
    }
  }
  function jumpTo(index, smooth) {
    if (index < 0) return;
    const height = stage.offsetHeight || window.innerHeight;
    const y = window.scrollY + tour.getBoundingClientRect().top + ((tour.offsetHeight - height) * index) / 2;
    window.scrollTo({ top: y, behavior: smooth && !motion.matches ? "smooth" : "auto" });
    askFrame();
  }
  if (tour) {
    document.addEventListener("click", function (event) {
      const a = event.target.closest('a[href^="#"]');
      if (!a || event.defaultPrevented || event.metaKey || event.shiftKey || event.ctrlKey || event.altKey) return;
      const index = anchors.indexOf(a.hash.slice(1));
      if (index < 0) return;
      event.preventDefault();
      if (location.hash !== a.hash) history.pushState(null, "", a.hash);
      jumpTo(index, true);
    });
    function syncHash() {
      const index = anchors.indexOf(location.hash.slice(1));
      if (index >= 0) jumpTo(index, false);
    }
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("pageshow", function (event) {
      if (!event.persisted) syncHash();
      askFrame();
    });
    syncHash();
  }
  function closeInspector() {
    if (dialog.close) dialog.close();
    else {
      dialog.removeAttribute("open");
      afterClose();
    }
  }
  function afterClose() {
    markOrbit(false);
    if (figure) figure.dispatchEvent(new Event("lab-close"));
    openButton.focus({ preventScroll: true });
    askFrame();
  }
  function openInspector() {
    if (!dialog || dialog.open) return;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    const choice = figure.querySelector('[data-angle="' + chapters[Math.max(current, 0)] + '"]');
    if (choice) choice.click();
    figure.dispatchEvent(new Event("lab-open"));
    figure.querySelector("#model-stage").focus({ preventScroll: true });
    askFrame();
  }
  if (dialog) {
    figure.addEventListener("lab-camera", function (event) {
      orbitView = event.detail;
      askFrame();
    });
    openButton.addEventListener("click", openInspector);
    closeButton.addEventListener("click", closeInspector);
    dialog.addEventListener("close", afterClose);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
          closeInspector();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dialog.open) {
        e.preventDefault();
        closeInspector();
      }
    });
    // A horizontal drag on the opening landscape picks up the same orbit as the dedicated control.
    let candidate = null;
    stage.addEventListener("pointerdown", function (e) {
      if (!e.isPrimary || e.button !== 0 || e.target.closest("a,button")) return;
      candidate = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false };
    });
    window.addEventListener(
      "pointermove",
      function (e) {
        if (!candidate || candidate.id !== e.pointerId) return;
        const dx = e.clientX - candidate.x,
          dy = e.clientY - candidate.y;
        if (!candidate.active) {
          if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
            candidate = null;
            return;
          }
          if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
          openInspector();
          candidate.active = true;
        }
        if (e.cancelable) e.preventDefault();
        figure.dispatchEvent(new CustomEvent("lab-drag", { detail: (dx * 360) / Math.max(260, stage.clientWidth) }));
        candidate.x = e.clientX;
        candidate.y = e.clientY;
      },
      { passive: false },
    );
    for (const name of ["pointerup", "pointercancel", "blur"])
      window.addEventListener(name, function () {
        candidate = null;
      });
  }
  function revealProject() {
    const id = location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target || !target.closest(".proj-page")) return;
    const group = target.closest(".eco");
    if (group) group.open = true;
    const record = target.querySelector(".case-record");
    if (target.classList.contains("node") && record) record.open = true;
    target.scrollIntoView({ block: "start" });
  }
  if (document.querySelector(".proj-page")) {
    revealProject();
    window.addEventListener("hashchange", revealProject);
  }
  function preference() {
    askFrame();
  }
  for (const m of [motion, narrow]) {
    if (m.addEventListener) m.addEventListener("change", preference);
    else if (m.addListener) m.addListener(preference);
  }
  window.addEventListener("scroll", onActivity, { passive: true });
  window.addEventListener("resize", askFrame, { passive: true });
  document.addEventListener("tp-language", askFrame);
  document.addEventListener("visibilitychange", askFrame);
  askFrame();
})();
