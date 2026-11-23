/* thcphm.github.io — tương tác tối thiểu: ngôn ngữ, giao diện sáng/tối, menu, in CV */
(function () {
  "use strict";

  var root = document.documentElement;

  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); }
    catch (e) { return null; }
  }

  /* ---------- Ngôn ngữ ---------- */
  function applyLang(lang) {
    lang = lang === "en" ? "en" : "vi";
    root.lang = lang;
    var t = root.getAttribute("data-title-" + lang);
    if (t) document.title = t;
    var d = root.getAttribute("data-desc-" + lang);
    var meta = document.querySelector('meta[name="description"]');
    if (d && meta) meta.setAttribute("content", d);
    document.querySelectorAll("[data-ph-vi]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute("data-ph-" + lang));
    });
    if (typeof window.__tpProjUpdate === "function") window.__tpProjUpdate();
    document.querySelectorAll("[data-label-vi]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute("data-label-" + lang));
    });
    document.querySelectorAll("[data-alt-vi]").forEach(function (el) {
      el.alt = el.getAttribute("data-alt-" + lang);
    });
    var cv = document.getElementById("download-cv");
    if (cv) {
      cv.setAttribute("href", "/assets/cv-" + lang + ".pdf");
      cv.download = "Pham-Tri-Thuc-CV-" + lang.toUpperCase() + ".pdf";
    }
    document.dispatchEvent(new Event("tp-language"));
  }

  var langBtn = document.getElementById("lang-toggle");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      var next = root.lang === "vi" ? "en" : "vi";
      applyLang(next);
      store("tp-lang", next);
    });
  }
  applyLang(root.lang || "vi");

  /* ---------- Giao diện sáng/tối ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  function syncThemeBtn() {
    if (!themeBtn) return;
    themeBtn.setAttribute("aria-pressed", root.getAttribute("data-theme") === "dark" ? "true" : "false");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("tp-theme", next);
      syncThemeBtn();
    });
  }
  syncThemeBtn();

  /* ---------- Menu trên di động ---------- */
  var menuBtn = document.getElementById("menu-toggle");
  var nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.focus();
      }
    });
  }

  /* ---------- In / lưu CV thành PDF ---------- */
  document.querySelectorAll("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });


  /* ---------- Quét mã vạch ở hero (một lần khi tải, hoặc khi bấm "Quét lại") ---------- */
  var scan = document.getElementById("scan");
  var readout = document.getElementById("readout");
  var rescan = document.getElementById("rescan");
  if (scan && readout) {
    var text = readout.querySelector(".readout-text");
    var done = text.innerHTML;
    var busy = '<span lang="vi">Đang quét…</span><span lang="en">Scanning…</span>';
    var motion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
    var beam = scan.querySelector(".beam");

    var finishScan = function () {
      scan.classList.remove("is-scanning");
      readout.classList.add("is-ok");
      text.innerHTML = done;
    };
    var runScan = function () {
      if (motion && motion.matches) { finishScan(); return; }
      scan.style.setProperty("--scan-w", scan.offsetWidth + "px");
      readout.classList.remove("is-ok");
      text.innerHTML = busy;
      scan.classList.remove("is-scanning");
      void scan.offsetWidth;            // khởi động lại animation
      scan.classList.add("is-scanning");
    };
    beam.addEventListener("animationend", finishScan);
    if (rescan) rescan.addEventListener("click", runScan);
    function syncScanMotion() { if (motion.matches) finishScan(); }
    if (motion && motion.addEventListener) motion.addEventListener("change", syncScanMotion);
    else if (motion && motion.addListener) motion.addListener(syncScanMotion);
    if ("IntersectionObserver" in window) {
      var labelObserver = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        labelObserver.disconnect();
        runScan();
      });
      labelObserver.observe(scan);
    } else {
      setTimeout(runScan, 350);
    }
  }


  /* ---------- Trang dự án: tìm kiếm (không cần dấu) + lọc theo loại ---------- */
  var search = document.getElementById("proj-search");
  if (search) {
    var fold = function (t) {
      return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
    };
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".proj-page .node"));
    var groups = Array.prototype.slice.call(document.querySelectorAll(".proj-page .eco.group"));
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip-btn"));
    var countEl = document.getElementById("proj-count");
    var empty = document.getElementById("proj-empty");
    var filter = "all";
    nodes.forEach(function (n) { n._text = fold(n.textContent + " " + (n.closest(".eco").querySelector(".eco-title") || {}).textContent); });

    var update = function () {
      var q = fold(search.value.trim());
      var words = q ? q.split(/\s+/) : [];
      var shown = 0;
      nodes.forEach(function (n) {
        var tags = (n.getAttribute("data-tags") || "").split(/\s+/);
        var okType = filter === "all" || tags.indexOf(filter) !== -1;
        var okText = words.every(function (w) { return n._text.indexOf(w) !== -1; });
        n.hidden = !(okType && okText);
        if (!n.hidden) shown++;
      });
      groups.forEach(function (g) {
        var visible = g.querySelectorAll(".node:not([hidden])").length;
        g.hidden = visible === 0;
        var nEl = g.querySelector(".eco-n");
        if (nEl) nEl.textContent = visible;
        if ((q || filter !== "all") && visible) g.open = true;
      });
      if (empty) empty.hidden = shown !== 0;
      if (countEl) {
        countEl.textContent = root.lang === "en"
          ? "Showing " + shown + " of " + nodes.length + " projects"
          : "Hiển thị " + shown + "/" + nodes.length + " dự án";
      }
    };
    window.__tpProjUpdate = update;

    search.addEventListener("input", update);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        filter = c.getAttribute("data-filter");
        chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        update();
      });
    });
    var reset = document.getElementById("proj-reset");
    if (reset) reset.addEventListener("click", function () {
      search.value = ""; filter = "all";
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-filter") === "all" ? "true" : "false"); });
      update(); search.focus();
    });
    // Cho phép link sẵn từ khoá: /solutions/du-an/?q=olive
    try { var q0 = new URLSearchParams(location.search).get("q"); if (q0) search.value = q0; } catch (e) {}
    update();
  }

  /* ---------- Năm ở footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
