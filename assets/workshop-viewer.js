(function () {
  "use strict";
  const figure = document.getElementById("xuong-3d");
  if (!figure) return;

  const entry = document.querySelector('[data-specimen="workshop"]');
  const panel = document.getElementById("workshop-panel");
  const stage = panel.querySelector("[data-workshop-stage]");
  const host = panel.querySelector("[data-workshop-host]");
  const poster = panel.querySelector("[data-workshop-poster]");
  const film = panel.querySelector("[data-workshop-film]");
  const photo = panel.querySelector("[data-workshop-photo]");
  const markers = panel.querySelector("[data-workshop-labels]");
  const tools = Array.from(panel.querySelectorAll("[data-workshop-tools]"));
  const modes = Array.from(panel.querySelectorAll("[data-workshop-mode]"));
  const controls = panel.querySelector(".workshop-ctrl");
  const turns = Array.from(panel.querySelectorAll("[data-workshop-turn]"));
  const reset = panel.querySelector("[data-workshop-reset]");
  const degrees = reset.querySelector("[data-workshop-degrees]");
  const select = document.getElementById("workshop-room");
  const zoomButtons = Array.from(panel.querySelectorAll("[data-workshop-zoom]"));
  const magnification = panel.querySelector("[data-workshop-magnification]");
  const home = panel.querySelector("[data-workshop-home]");
  const expand = panel.querySelector("[data-workshop-expand]");
  const dialog = document.getElementById("workshop-dialog");
  const slot = dialog.querySelector("[data-workshop-slot]");
  const help = panel.querySelector("[data-workshop-help]");
  const status = panel.querySelector("[data-workshop-status]");
  const options = Array.from(select.options);
  const rooms = options.slice(1).map((option) => option.value);
  const base = "/assets/workshop/";
  const frameCount = 36;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const radians = Math.PI / 180;
  const minZoom = 0.8, maxZoom = 1.7;
  // Room tiles are optically rendered at minZoom. Their center crop matches the live lens.
  const roomSheetZoom = 0.8;
  const touches = new Map();
  let zoom = 1, arrival = null, pinch = null;
  let room = "",
    mode = "model",
    angle = 0,
    pitch = 0,
    gesture = null;
  let engine = null,
    loading = null,
    unavailable = false,
    near = false,
    canDraw = false;
  let scheduled = 0,
    lastW = 0,
    lastH = 0,
    projection = null,
    anchorsRequested = false;
  const sheets = new Map(),
    labels = new Map();
  let labelWidth = -1,
    labelLanguage = "",
    sizes = new Map();
  const lang = () => (document.documentElement.lang === "en" ? "en" : "vi");
  const copy = (vi, en) => (lang() === "en" ? en : vi);
  const wrap = (n) => ((n % 360) + 360) % 360;
  const tile = () => Math.round(angle / (360 / frameCount)) % frameCount;
  const active = () => !document.hidden && (dialog.open || (near && !figure.hidden && stage.clientWidth > 0));

  for (const option of options.slice(1)) {
    const button = document.createElement("button");
    button.type = "button";
    button.hidden = true;
    button.addEventListener("click", function () {
      chooseRoom(option.value, true);
    });
    markers.append(button);
    labels.set(option.value, button);
  }

  function queue() {
    if (!scheduled && !document.hidden) scheduled = requestAnimationFrame(draw);
  }
  function requestAnchors() {
    if (anchorsRequested || typeof fetch !== "function") return;
    anchorsRequested = true;
    fetch(base + "anchors.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length === frameCount) projection = data;
        queue();
      })
      .catch(() => {});
  }
  function loadSheet(name) {
    if (sheets.has(name)) return sheets.get(name);
    const sheet = { image: new Image(), ready: false, failed: false };
    sheets.set(name, sheet);
    sheet.image.onload = function () {
      sheet.ready = true;
      queue();
    };
    sheet.image.onerror = function () {
      sheet.failed = true;
      queue();
    };
    sheet.image.src = base + name + ".webp" + (name === "rooms" ? "?v=6" : "");
    return sheet;
  }
  function loseEngine(event) {
    if (event) event.preventDefault();
    const old = engine;
    engine = null;
    canDraw = false;
    unavailable = true;
    host.replaceChildren();
    if (old) {
      try {
        old.dispose();
      } catch (_) {}
    }
    requestAnchors();
    queue();
  }
  // Resolves once the page has been still (no scroll, wheel, touch or key) for a moment.
  // The viewer is near already? Then resolve at once: the visitor is waiting for it.
  function stillness() {
    return new Promise(function (resolve) {
      if (active()) return resolve();
      const events = ["scroll", "wheel", "touchstart", "touchmove", "pointerdown", "keydown"];
      let timer = 0;
      const done = function () {
        events.forEach((name) => window.removeEventListener(name, restart, true));
        resolve();
      };
      const restart = function () {
        clearTimeout(timer);
        if (active()) return done();
        timer = setTimeout(done, 450);
      };
      events.forEach((name) => window.addEventListener(name, restart, { capture: true, passive: true }));
      restart();
    });
  }
  const pose = () => ({ room, yaw: angle * radians, pitch, zoom });
  const ratioFor = (width) => Math.min(window.devicePixelRatio || 1, 1.5, 1600 / width);
  const lowPower = () => Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  let workerBroken = false;
  const canWork = () =>
    !workerBroken &&
    typeof Worker === "function" &&
    typeof OffscreenCanvas === "function" &&
    typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function";

  // Preferred engine: the model lives in a worker and draws on an OffscreenCanvas. Building the
  // scene, compiling shaders and rendering then never block scrolling or input on the page.
  function workerEngine(canvas, width, height) {
    return new Promise(function (resolve, reject) {
      let worker,
        settled = false,
        points = null,
        seq = 0,
        picks = 0,
        dead = false,
        size = { w: width, h: height, dpr: ratioFor(width) };
      const waiting = new Map();
      const api = {
        remote: true,
        resize(w, h, dpr) {
          size = { w, h, dpr };
        },
        render(next) {
          if (!dead) worker.postMessage({ type: "frame", seq: ++seq, w: size.w, h: size.h, dpr: size.dpr, pose: next });
        },
        projectRooms: () => points,
        pickRoom(x, y) {
          return new Promise(function (done) {
            if (dead) return done(null);
            const id = ++picks;
            waiting.set(id, done);
            worker.postMessage({ type: "pick", id, x, y });
          });
        },
        dispose() {
          if (dead) return;
          dead = true;
          try {
            worker.postMessage({ type: "dispose" });
          } catch (_) {}
          setTimeout(() => worker.terminate(), 300);
        },
      };
      const fail = function () {
        if (settled) {
          if (engine === api) loseEngine();
          return;
        }
        settled = true;
        dead = true;
        try {
          worker.terminate();
        } catch (_) {}
        reject(new Error("workshop worker failed"));
      };
      try {
        const surface = canvas.transferControlToOffscreen();
        worker = new Worker("/assets/workshop/workshop-worker.js?v=7");
        worker.onerror = fail;
        worker.onmessage = function (event) {
          const message = event.data;
          if (message.type === "ready") {
            points = message.points;
            settled = true;
            resolve(api);
          } else if (message.type === "drawn") {
            // Labels follow the frame the worker actually drew, so they stay glued to the rooms.
            points = message.points;
            if (engine === api && mode === "model" && active())
              updateLabels(room ? null : points);
          } else if (message.type === "pick") {
            const done = waiting.get(message.id);
            waiting.delete(message.id);
            if (done) done(message.room);
          } else if (message.type === "lost" || message.type === "error") fail();
        };
        worker.postMessage(
          { type: "init", canvas: surface, lowPower: lowPower(), frame: { ...size, pose: pose() } },
          [surface],
        );
      } catch (_) {
        fail();
      }
    });
  }
  // Fallback engine, on the page itself. The scene is built in short slices so input stays responsive.
  async function pageEngine(canvas, width, height, relaxed) {
    const module = await import("/assets/workshop/workshop.js?v=7");
    const pause = () =>
      new Promise(function (next) {
        if (relaxed && !active() && "requestIdleCallback" in window) requestIdleCallback(() => next(), { timeout: 250 });
        else setTimeout(next, 0);
      });
    const viewer = await module.createWorkshopViewerAsync(canvas, { lowPower: lowPower(), pause, sliceMs: 8 });
    if (relaxed) await stillness();
    await viewer.warm(width, height, ratioFor(width), pose());
    return viewer;
  }
  // warm = build the model ahead of time, while the visitor is still above it.
  async function init(force, warm) {
    if (engine || loading || unavailable || mode !== "model") return;
    if (!warm && !active()) return;
    if (warm && (!entry.open || figure.hidden)) return;
    if (saveData || (!force && reduced && reduced.matches)) return;
    const job = (async function () {
      if (warm) await stillness();
      const width = stage.clientWidth,
        height = stage.clientHeight;
      if (!width || !height || mode !== "model") return null;
      let canvas = document.createElement("canvas");
      canvas.hidden = true;
      host.replaceChildren(canvas);
      let viewer = null;
      if (canWork()) {
        try {
          viewer = await workerEngine(canvas, width, height);
        } catch (_) {
          // A transferred canvas cannot be used again: start over with a fresh one on the page.
          workerBroken = true;
          canvas = document.createElement("canvas");
          canvas.hidden = true;
          host.replaceChildren(canvas);
        }
      }
      if (!viewer) {
        canvas.addEventListener("webglcontextlost", loseEngine, { once: true });
        viewer = await pageEngine(canvas, width, height, warm);
      }
      lastW = width;
      lastH = height;
      return viewer;
    })();
    loading = job;
    try {
      const viewer = await job;
      if (!viewer) return;
      if (unavailable) {
        viewer.dispose();
        return;
      }
      engine = viewer;
      if (lastW !== stage.clientWidth || lastH !== stage.clientHeight) {
        lastW = 0;
        lastH = 0;
      }
      queue();
      if (engine.ready) Promise.resolve(engine.ready).then(queue, queue);
    } catch (_) {
      loseEngine();
    } finally {
      loading = null;
      if (!engine && !unavailable && active()) queue();
    }
  }
  function updateLabels(points) {
    if (!points || room || mode !== "model") {
      markers.hidden = true;
      return;
    }
    markers.hidden = false;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    if (w !== labelWidth || lang() !== labelLanguage) {
      sizes = new Map();
      labels.forEach((btn) => {
        btn.style.visibility = "hidden";
        btn.hidden = false;
      });
      labels.forEach((btn, id) =>
        sizes.set(id, {
          w: btn.offsetWidth || Math.max(53, btn.textContent.length * 6.6 + 13),
          h: btn.offsetHeight || 22,
        }),
      );
      labels.forEach((btn) => {
        btn.hidden = true;
        btn.style.visibility = "";
      });
      labelWidth = w;
      labelLanguage = lang();
    }
    const positions = new Map(points.map((point) => [point.id, point]));
    const occupied = [];
    const priority = [
      "nhac",
      "cong",
      "sach",
      "garage",
      "nghi",
      "bep",
      "vuon",
      "kehoach",
      "game",
      "hoc",
      "ham",
      "san",
    ];
    const limit = w < 400 ? 4 : w < 600 ? 7 : 12;
    priority.forEach((id) => {
      const point = positions.get(id),
        button = labels.get(id);
      if (!button) return;
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || occupied.length >= limit) {
        button.hidden = true;
        return;
      }
      const size = sizes.get(id),
        x = w * point.x,
        y = h * point.y;
      const box = { left: x - size.w / 2, right: x + size.w / 2, top: y - size.h / 2, bottom: y + size.h / 2 };
      const fits = box.left >= 2 && box.right <= w - 2 && box.top >= 2 && box.bottom <= h - 2;
      const overlaps = occupied.some(
        (b) => box.left < b.right + 4 && box.right > b.left - 4 && box.top < b.bottom + 3 && box.bottom > b.top - 3,
      );
      button.hidden = !fits || overlaps;
      if (!button.hidden) {
        occupied.push(box);
        button.style.left = point.x * 100 + "%";
        button.style.top = point.y * 100 + "%";
      }
    });
  }
  function fallback(shownZoom) {
    const frame = tile();
    const name = room ? "rooms" : "orbit";
    const useSheet = Boolean(room) || frame !== 0;
    const sheet = useSheet ? loadSheet(name) : null;
    const ready = Boolean(sheet && sheet.ready);
    film.hidden = !ready;
    poster.hidden = ready;
    if (ready) {
      const cols = room ? 4 : 6,
        rows = room ? 3 : 6,
        i = room ? rooms.indexOf(room) : frame;
      film.style.backgroundImage = 'url("' + sheet.image.src + '")';
      film.style.backgroundSize = cols * 100 + "% " + rows * 100 + "%";
      film.style.backgroundPosition =
        ((i % cols) / (cols - 1)) * 100 + "% " + (Math.floor(i / cols) / (rows - 1)) * 100 + "%";
    }
    film.style.transform = "scale(" + (room ? shownZoom / roomSheetZoom : shownZoom) + ")";
    poster.style.transform = "scale(" + (room ? 1 : shownZoom) + ")";
    const points = !room && projection && projection[ready ? frame : 0];
    updateLabels(points && points.map(({ id, x, y }) => ({
      id, x: 0.5 + (x - 0.5) * shownZoom, y: 0.5 + (y - 0.5) * shownZoom,
    })));
    return sheet;
  }
  function setHelp(sheet) {
    let message;
    if (mode === "photo")
      message = copy("Ảnh chụp trang Xưởng của Thức.", "Screenshot of the original workshop website.");
    else if (sheet && sheet.failed)
      message = copy(
        "Chưa tải được góc nhìn này. Chọn lại góc để thử lại.",
        "This view could not load. Select it again to retry.",
      );
    else if (sheet && !sheet.ready)
      message = copy("Đang tải góc nhìn từ xưởng gốc…", "Loading a view from the original workshop…");
    else if (room && !canDraw)
      message = copy(
        "Dùng + hoặc − để xem chi tiết trong ảnh phòng.",
        "Use + or − to zoom into the room image.",
      );
    else if (room) message = copy("Kéo để nhìn quanh. Dùng + hoặc − để chỉnh độ phóng đại.", "Drag to look around. Use + or − to zoom.");
    else
      message = copy("Kéo để xoay. Chọn một phòng để xem gần.", "Drag to rotate. Choose a room for a closer look.");
    if (help.textContent !== message) help.textContent = message;
  }
  function lensAt(now) {
    if (!arrival) return zoom;
    const t = Math.min(1, Math.max(0, (now - arrival.start) / 320));
    const shown = zoom + (arrival.from - zoom) * (1 - t) ** 3;
    if (t === 1) arrival = null;
    else queue();
    return shown;
  }
  function draw(now) {
    scheduled = 0;
    if (!active()) return;
    const isPhoto = mode === "photo";
    home.hidden = isPhoto || !room;
    photo.hidden = !isPhoto;
    host.hidden = isPhoto;
    controls.hidden = isPhoto;
    let sheet = null;
    if (isPhoto) {
      poster.hidden = true;
      film.hidden = true;
      markers.hidden = true;
      canDraw = false;
      stage.classList.remove("is-interactive");
    } else {
      const width = stage.clientWidth,
        height = stage.clientHeight;
      if (!width || !height) return;
      const shownZoom = lensAt(now);
      if (engine) {
        try {
          if (lastW !== width || lastH !== height) {
            engine.resize(width, height, Math.min(window.devicePixelRatio || 1, 1.5, 1600 / width));
            lastW = width;
            lastH = height;
          }
          engine.render({ room, yaw: angle * radians, pitch, zoom: shownZoom });
          canDraw = true;
          host.firstElementChild.hidden = false;
          poster.hidden = true;
          film.hidden = true;
          // A worker engine reports label positions with each frame it draws (see workerEngine).
          if (!engine.remote || room) updateLabels(room ? null : engine.projectRooms());
          else if (markers.hidden) updateLabels(engine.projectRooms());
        } catch (_) {
          loseEngine();
        }
      }
      if (!engine) {
        canDraw = false;
        sheet = fallback(shownZoom);
      }
      const orientable = canDraw || !room;
      turns.forEach((b) => (b.disabled = !orientable));
      reset.disabled = !orientable && zoom === 1;
      stage.classList.toggle("is-interactive", orientable);
      zoomButtons[0].disabled = zoom <= minZoom;
      zoomButtons[1].disabled = zoom >= maxZoom;
      const percent = Math.round(zoom * 100) + "%";
      if (magnification.textContent !== percent) magnification.textContent = percent;
    }
    const shown = (Math.round(angle) % 360) + "°";
    if (degrees.textContent !== shown) degrees.textContent = shown;
    setHelp(sheet);
  }
  function photoSource() {
    if (photo.firstElementChild) return;
    const img = document.createElement("img");
    img.alt = copy(
      "Trang gốc với căn nhà 3D, mười hai nhãn phòng và logo TP.",
      "Original site showing the 3D house, twelve room labels and TP logo.",
    );
    img.dataset.altVi = "Trang gốc với căn nhà 3D, mười hai nhãn phòng và logo TP.";
    img.dataset.altEn = "Original site showing the 3D house, twelve room labels and TP logo.";
    img.srcset = base + "site-900.webp 900w, /img/xuong.webp 1680w";
    img.sizes = "(max-width:700px) 92vw, (min-width:1400px) 680px, 50vw";
    img.src = "/img/xuong.webp";
    img.draggable = false;
    photo.append(img);
  }
  function switchMode(next) {
    if (mode !== next) {
      clearGestures();
      arrival = null;
    }
    mode = next;
    stage.classList.toggle("model-mode", next === "model");
    stage.classList.toggle("room-view", next === "model" && Boolean(room));
    stage.tabIndex = next === "model" ? 0 : -1;
    stage.setAttribute("aria-label", stageLabel());
    for (const b of modes) b.setAttribute("aria-pressed", String(next === b.dataset.workshopMode));
    if (next === "photo") photoSource();
    else {
      requestAnchors();
      init(true);
    }
    const img = photo.firstElementChild;
    if (img && dialog.open) img.sizes = "95vw";
    queue();
  }
  function chooseRoom(next, focus) {
    if (next && !rooms.includes(next)) return;
    const existing = sheets.get(next ? "rooms" : "orbit");
    if (existing && existing.failed) sheets.delete(next ? "rooms" : "orbit");
    const moveIn = next && room !== next && !(reduced && reduced.matches);
    clearGestures();
    room = next;
    angle = 0;
    pitch = 0;
    zoom = 1;
    select.value = room;
    switchMode("model");
    arrival = moveIn ? { start: performance.now(), from: 0.83 } : null;
    status.textContent = select.options[select.selectedIndex].textContent;
    if (focus) stage.focus({ preventScroll: true });
  }
  function setZoom(value) {
    if (mode !== "model" || !Number.isFinite(value)) return;
    zoom = Math.max(minZoom, Math.min(maxZoom, value));
    arrival = null;
    init(true);
    queue();
  }
  function stepZoom(direction) {
    setZoom((Math.round(zoom * 100) + direction * 10) / 100);
    status.textContent = copy("Độ phóng đại ", "Magnification ") + Math.round(zoom * 100) + "%";
  }
  function resetView() {
    angle = 0;
    pitch = 0;
    setZoom(1);
    status.textContent = copy("Đã về góc gốc, độ phóng đại 100%.", "View restored at 100% magnification.");
  }
  function turnBy(by, raise = 0) {
    if (mode !== "model" || (room && !canDraw)) return;
    if (sheets.get("orbit")?.failed) sheets.delete("orbit");
    angle = wrap(angle + by);
    pitch = Math.max(-0.36, Math.min(0.55, pitch + raise));
    init(true);
    queue();
  }
  function stageLabel() {
    return mode === "photo"
      ? copy("Ảnh chụp trang Xưởng của Thức", "Screenshot of the workshop website")
      : copy(
          "Xưởng của Thức. Phím trái, phải để xoay, + và − để phóng hoặc thu, Home để đặt lại góc nhìn.",
          "Thức’s workshop. Use Left and Right to rotate, + and − to zoom, and Home to reset.",
        );
  }
  function language() {
    options.forEach((option) => {
      option.textContent = lang() === "vi" ? option.dataset.vi : option.dataset.en;
      const btn = labels.get(option.value);
      if (btn) {
        btn.textContent = option.textContent;
        btn.setAttribute("aria-label", copy("Vào ", "Enter ") + option.textContent);
      }
    });
    labelLanguage = "";
    stage.setAttribute("aria-label", stageLabel());
    expand.textContent = dialog.open ? copy("Thu nhỏ", "Close large view") : copy("Mở rộng", "Enlarge");
    const img = photo.firstElementChild;
    if (img) img.alt = lang() === "vi" ? img.dataset.altVi : img.dataset.altEn;
    setHelp();
    queue();
  }
  function restored() {
    if (panel.parentNode !== figure) figure.insertBefore(panel, figure.firstChild);
    expand.setAttribute("aria-expanded", "false");
    lastW = 0;
    const img = photo.firstElementChild;
    if (img) img.sizes = "(max-width:700px) 92vw, (min-width:1400px) 680px, 50vw";
    language();
    expand.focus({ preventScroll: true });
    queue();
  }
  function enlarge() {
    if (dialog.open) {
      if (dialog.close) dialog.close();
      else {
        dialog.removeAttribute("open");
        restored();
      }
      return;
    }
    slot.append(panel);
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    expand.setAttribute("aria-expanded", "true");
    lastW = 0;
    const img = photo.firstElementChild;
    if (img) img.sizes = "95vw";
    language();
    expand.focus({ preventScroll: true });
    init(true);
    queue();
  }
  expand.addEventListener("click", enlarge);
  dialog.addEventListener("close", restored);
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialog.open) {
      e.preventDefault();
      enlarge();
    }
  });
  for (const b of modes) b.addEventListener("click", () => switchMode(b.dataset.workshopMode));
  select.addEventListener("change", () => chooseRoom(select.value, false));
  home.addEventListener("click", () => chooseRoom("", true));
  for (const b of zoomButtons) b.addEventListener("click", () => stepZoom(Number(b.dataset.workshopZoom)));
  for (const b of turns)
    b.addEventListener("click", () => {
      turnBy(Number(b.dataset.workshopTurn) * 30);
      status.textContent = Math.round(angle) + "°";
    });
  reset.addEventListener("click", resetView);
  stage.tabIndex = 0;
  stage.addEventListener("keydown", (e) => {
    if (e.target !== stage || mode !== "model" || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "ArrowRight") turnBy(10);
    else if (e.key === "ArrowLeft") turnBy(-10);
    else if (e.key === "+" || e.key === "=" || e.code === "NumpadAdd") stepZoom(1);
    else if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract") stepZoom(-1);
    else if (e.key === "Home") resetView();
    else return;
    e.preventDefault();
  });
  stage.addEventListener("wheel", (e) => {
    if (mode !== "model" || e.metaKey || !e.deltaY) return;
    if (e.ctrlKey && !room && !dialog.open) return;
    if (!room && !dialog.open && !stage.contains(document.activeElement)) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1;
    const delta = Math.max(-120, Math.min(120, e.deltaY * unit));
    const next = zoom * Math.exp(-delta * (e.ctrlKey ? 0.008 : 0.002));
    if ((next >= zoom && zoom >= maxZoom) || (next <= zoom && zoom <= minZoom)) {
      if (e.ctrlKey) e.preventDefault();
      return;
    }
    e.preventDefault();
    setZoom(next);
  }, { passive: false });
  function endGesture() {
    gesture = null;
    stage.classList.remove("is-dragging");
  }
  function clearGestures() {
    touches.clear();
    pinch = null;
    endGesture();
  }
  function touchSpan() {
    const [a, b] = touches.values();
    return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  }
  function begin(id, x, y, kind, target, button) {
    if (mode !== "model" || button > 0 || target.closest("button")) return;
    if (kind === "touch") {
      touches.set(id, { x, y });
      if (touches.size >= 2) {
        endGesture();
        if (touches.size === 2) pinch = { distance: touchSpan(), zoom };
        return;
      }
    }
    if (gesture) return;
    gesture = { id, x, y, initialX: x, initialY: y, kind, moved: false };
  }
  function move(id, x, y, event) {
    if (touches.has(id)) {
      touches.set(id, { x, y });
      if (pinch && touches.size >= 2) {
        if (touches.size === 2) setZoom(pinch.zoom * touchSpan() / pinch.distance);
        if (event.cancelable) event.preventDefault();
        return;
      }
    }
    if (!gesture || gesture.id !== id) return;
    const dx = x - gesture.x,
      dy = y - gesture.y;
    if (!gesture.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      if (gesture.kind === "touch" && !room && !dialog.open && Math.abs(dy) > Math.abs(dx) * 1.18) {
        endGesture();
        return;
      }
      gesture.moved = true;
      stage.classList.add("is-dragging");
    }
    if (event.cancelable) event.preventDefault();
    turnBy((-dx * 360) / Math.max(180, stage.clientWidth), canDraw ? dy * 0.003 : 0);
    gesture.x = x;
    gesture.y = y;
  }
  function end(id, x, y, event) {
    if (touches.delete(id) && pinch) {
      // Lifted pinch fingers must not become room taps or rotate the camera.
      if (!touches.size) pinch = null;
      else if (touches.size === 2) pinch = { distance: touchSpan(), zoom };
      return;
    }
    if (!gesture || gesture.id !== id) return;
    const tap = !gesture.moved && Math.hypot(x - gesture.initialX, y - gesture.initialY) < 7;
    endGesture();
    if (tap && !room && engine && mode === "model") {
      const rect = stage.getBoundingClientRect();
      // The page engine answers at once, the worker engine with a promise.
      const picked = engine.pickRoom((x - rect.left) / rect.width, (y - rect.top) / rect.height);
      if (picked && typeof picked.then === "function") {
        picked.then(function (id) {
          if (id && !room && mode === "model") chooseRoom(id, false);
        });
      } else if (picked) {
        if (event.cancelable) event.preventDefault();
        chooseRoom(picked, false);
      }
    }
  }
  if ("PointerEvent" in window) {
    stage.addEventListener("pointerdown", (e) => {
      begin(e.pointerId, e.clientX, e.clientY, e.pointerType, e.target, e.button);
      if ((gesture?.id === e.pointerId || touches.has(e.pointerId)) && stage.setPointerCapture) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    });
    window.addEventListener("pointermove", (e) => move(e.pointerId, e.clientX, e.clientY, e), { passive: false });
    window.addEventListener("pointerup", (e) => end(e.pointerId, e.clientX, e.clientY, e));
    window.addEventListener("pointercancel", clearGestures);
  } else {
    stage.addEventListener("mousedown", (e) => begin("mouse", e.clientX, e.clientY, "mouse", e.target, e.button));
    window.addEventListener("mousemove", (e) => move("mouse", e.clientX, e.clientY, e));
    window.addEventListener("mouseup", (e) => end("mouse", e.clientX, e.clientY, e));
    stage.addEventListener(
      "touchstart",
      (e) => {
        for (const t of e.changedTouches) begin(t.identifier, t.clientX, t.clientY, "touch", e.target, 0);
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        for (const t of e.changedTouches) move(t.identifier, t.clientX, t.clientY, e);
      },
      { passive: false },
    );
    window.addEventListener(
      "touchend",
      (e) => {
        for (const t of e.changedTouches) end(t.identifier, t.clientX, t.clientY, e);
      },
      { passive: false },
    );
    window.addEventListener("touchcancel", clearGestures);
  }
  window.addEventListener("blur", clearGestures);
  function showProject(scroll) {
    entry.open = true;
    requestAnimationFrame(function () {
      if (scroll) figure.scrollIntoView({ block: "start" });
      requestAnchors();
      queue();
    });
  }
  for (const b of entry.querySelectorAll("[data-room-jump]"))
    b.addEventListener("click", () => {
      showProject(true);
      chooseRoom(b.dataset.roomJump, true);
    });
  for (const a of document.querySelectorAll('a[href="#xuong-3d"]'))
    a.addEventListener("click", () => showProject(true));
  function followHash() {
    if (location.hash === "#xuong-3d") showProject(true);
  }
  window.addEventListener("hashchange", followHash);
  window.addEventListener("pageshow", followHash);
  function sync() {
    if (!active()) return;
    if (mode === "model") {
      requestAnchors();
      init(false);
    }
    queue();
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        near = entries[0].isIntersecting;
        sync();
      },
      { rootMargin: "170px 0px" },
    ).observe(figure);
  } else {
    near = true;
  }
  if ("ResizeObserver" in window) new ResizeObserver(sync).observe(stage);
  if ("MutationObserver" in window)
    new MutationObserver(sync).observe(figure, { attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("resize", sync, { passive: true });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("tp-language", language);
  tools.forEach((el) => (el.hidden = false));
  help.hidden = false;
  stage.classList.add("model-mode");
  stage.classList.add("is-interactive");
  language();
  followHash();
  sync();
  // Build the model shortly after the page has loaded, before the visitor scrolls down to it.
  const warmUp = function () {
    setTimeout(function () {
      init(false, true);
    }, 1200);
  };
  if (document.readyState === "complete") warmUp();
  else window.addEventListener("load", warmUp, { once: true });
})();
