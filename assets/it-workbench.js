(function () {
  "use strict";

  const figure = document.getElementById("workbench");
  if (!figure) return;
  const stage = figure.querySelector("#model-stage");
  const poster = figure.querySelector("#desk-poster");
  const frames = figure.querySelector("#lab-frames");
  const caption = figure.querySelector("#lab-caption");
  const hint = figure.querySelector("#scene-hint");
  const retry = figure.querySelector("#lab-retry");
  const readout = figure.querySelector("#orbit-value");
  const reset = figure.querySelector("#orbit-reset");
  const status = figure.querySelector("#scene-status");
  const choices = Array.from(figure.querySelectorAll("[data-angle]"));
  const turns = Array.from(figure.querySelectorAll("[data-turn]"));
  const names = {
    profile: ["Góc lập trình", "Developer workstation"],
    code: ["Trình soạn thảo TypeScript", "TypeScript editor"],
    hardware: ["Bên trong thùng máy", "Inside the PC"],
  };
  const base = "/assets/lab/";
  const frameCount = 48;
  const columns = 8;
  const rows = frameCount / columns;
  const sheets = new Map();
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let view = "profile";
  let angle = 0,
    tilt = 0,
    live = false;
  let drag = null;

  function local(vi, en) {
    return document.documentElement.lang === "en" ? en : vi;
  }
  function modulo(value, by) {
    return ((value % by) + by) % by;
  }
  function sheetPath(chapter) {
    return base + "orbit/" + chapter + ".webp";
  }

  function loadSheet(chapter) {
    if (sheets.has(chapter)) return;
    const image = new Image();
    sheets.set(chapter, "loading");
    image.onload = function () {
      sheets.set(chapter, "ready");
      if (view === chapter) paint();
    };
    image.onerror = function () {
      sheets.set(chapter, "error");
      if (view === chapter) paint();
    };
    image.src = sheetPath(chapter);
  }

  function paint() {
    const frame = modulo(Math.round((-angle / 360) * frameCount), frameCount);
    const state = sheets.get(view);
    const useSheet = !live && frame !== 0 && state === "ready";
    let note = local("Kéo ngang để xoay 360°", "Drag sideways to rotate 360°");
    if (!live && frame !== 0 && state === "loading") note = local("Đang tải các góc nhìn…", "Loading views…");
    if (!live && frame !== 0 && state === "error")
      note = local("Chưa tải được các góc nhìn.", "Views could not be loaded.");
    if (useSheet) {
      frames.style.backgroundImage = 'url("' + sheetPath(view) + '")';
      frames.style.backgroundPosition =
        ((frame % columns) / (columns - 1)) * 100 + "% " + (Math.floor(frame / columns) / (rows - 1)) * 100 + "%";
    }
    frames.hidden = !useSheet;
    poster.hidden = live || useSheet;
    retry.hidden = live || state !== "error";
    const degrees = (Math.round(angle) % 360) + "°";
    if (readout.textContent !== degrees) readout.textContent = degrees;
    if (hint.textContent !== note) hint.textContent = note;
  }

  function updateLabels() {
    const name = local(names[view][0], names[view][1]);
    caption.textContent = name;
    stage.setAttribute(
      "aria-label",
      name +
        local(
          ". Kéo ngang hoặc dùng các phím trái, phải để xoay. Nhấn Home để về góc ban đầu.",
          ". Drag sideways or use the left and right arrow keys to rotate. Press Home to reset.",
        ),
    );
    reset.title = local("Về góc ban đầu", "Reset orientation");
    for (const button of turns) button.title = button.getAttribute("aria-label");
    for (const button of choices) button.setAttribute("aria-pressed", String(button.dataset.angle === view));
  }

  function updateScene() {
    if (!live && angle !== 0) loadSheet(view);
    figure.dispatchEvent(new CustomEvent("lab-camera", { detail: { view, angle, tilt } }));
    paint();
  }

  function setAngle(value, announce) {
    angle = modulo(value, 360);
    updateScene();
    if (announce) status.textContent = caption.textContent + " · " + readout.textContent;
  }

  function resetAngle(announce) {
    angle = 0;
    tilt = 0;
    updateScene();
    if (announce) status.textContent = local("Đã về góc ban đầu.", "Original view restored.");
  }

  for (const choice of choices)
    choice.addEventListener("click", function () {
      if (view === choice.dataset.angle) return;
      if (drag) end(drag.id);
      view = choice.dataset.angle;
      poster.src = base + view + ".webp";
      angle = 0;
      tilt = 0;
      updateLabels();
      updateScene();
      status.textContent = caption.textContent;
    });
  for (const turn of turns)
    turn.addEventListener("click", function () {
      setAngle(angle + 30 * Number(turn.dataset.turn), true);
    });
  reset.addEventListener("click", function () {
    resetAngle(true);
  });
  retry.addEventListener("click", function () {
    sheets.delete(view);
    loadSheet(view);
    paint();
  });
  stage.addEventListener("keydown", function (event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    switch (event.key) {
      case "ArrowLeft":
        setAngle(angle - 15, true);
        break;
      case "ArrowRight":
        setAngle(angle + 15, true);
        break;
      case "Home":
        resetAngle(true);
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  function begin(id, x, y, touch) {
    if (drag) return;
    const width = stage.clientWidth || stage.getBoundingClientRect().width || 400;
    drag = { id: id, x: x, y: y, width: width, touch: touch, moving: false };
    if (!live) loadSheet(view);
  }
  function move(id, x, y, event) {
    if (!drag || drag.id !== id) return;
    const dx = x - drag.x,
      dy = y - drag.y;
    if (!drag.moving) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      if (drag.touch && Math.abs(dy) > Math.abs(dx) * 1.25) {
        end(id);
        return;
      }
      drag.moving = true;
      stage.dataset.dragging = "true";
    }
    if (event.cancelable) event.preventDefault();
    if (live) tilt = Math.max(-0.3, Math.min(0.3, tilt - dy * 0.003));
    setAngle(angle + (dx * 360) / drag.width, false);
    drag.x = x;
    drag.y = y;
  }
  function end(id) {
    if (drag && drag.id === id) {
      drag = null;
      delete stage.dataset.dragging;
    }
  }
  stage.addEventListener("dragstart", function (event) {
    event.preventDefault();
  });
  if ("PointerEvent" in window) {
    stage.addEventListener("pointerdown", function (event) {
      if (event.button > 0) return;
      if (drag) {
        if (event.pointerType === "touch" && event.pointerId !== drag.id) end(drag.id);
        return;
      }
      begin(event.pointerId, event.clientX, event.clientY, event.pointerType === "touch");
      if (stage.setPointerCapture) {
        try {
          stage.setPointerCapture(event.pointerId);
        } catch (_) {
          /* Window listeners keep the drag active. */
        }
      }
    });
    window.addEventListener(
      "pointermove",
      function (event) {
        move(event.pointerId, event.clientX, event.clientY, event);
      },
      { passive: false },
    );
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      window.addEventListener(
        name,
        function (event) {
          end(event.pointerId);
        },
        true,
      );
    }
  } else {
    stage.addEventListener("mousedown", function (event) {
      if (event.button === 0) begin("mouse", event.clientX, event.clientY, false);
    });
    window.addEventListener("mousemove", function (event) {
      move("mouse", event.clientX, event.clientY, event);
    });
    window.addEventListener("mouseup", function () {
      end("mouse");
    });
    stage.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) {
          if (drag) end(drag.id);
          return;
        }
        const touch = event.touches[0];
        begin(touch.identifier, touch.clientX, touch.clientY, true);
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      function (event) {
        for (const touch of Array.from(event.changedTouches))
          move(touch.identifier, touch.clientX, touch.clientY, event);
      },
      { passive: false },
    );
    for (const name of ["touchend", "touchcancel"])
      window.addEventListener(
        name,
        function (event) {
          for (const touch of Array.from(event.changedTouches)) end(touch.identifier);
        },
        { passive: true },
      );
  }
  window.addEventListener("blur", function () {
    if (drag) end(drag.id);
  });

  figure.addEventListener("lab-live", function (event) {
    live = Boolean(event.detail);
    if (!live && angle !== 0) loadSheet(view);
    paint();
  });
  figure.addEventListener("lab-open", function () {
    figure.dispatchEvent(new CustomEvent("lab-camera", { detail: { view, angle, tilt } }));
    if (!saveData || angle !== 0) loadSheet(view);
    paint();
  });
  figure.addEventListener("lab-drag", function (event) {
    if (Number.isFinite(event.detail)) setAngle(angle + event.detail, false);
  });
  figure.addEventListener("lab-close", function () {
    if (drag) end(drag.id);
  });
  stage.tabIndex = 0;
  figure.querySelector(".desk-controls").hidden = false;
  document.addEventListener("tp-language", function () {
    status.textContent = "";
    updateLabels();
    paint();
  });
  updateLabels();
  paint();
})();
