/**
 * Home page behavior:
 * - Section tabs under the hero, synced with the URL hash (#docencia, …) so a
 *   section can be linked directly. Arrow keys move between tabs.
 * - Research areas explorer: picking an area filters publications, theses and
 *   projects, shows the first N of each column and updates the counts.
 * - Figures count up once when they enter the viewport.
 * Without JavaScript every section is shown one after another.
 */
(function () {
  /* ---- Tabs ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
  var bar = document.querySelector("[data-tabs]");

  function panelFor(id) {
    return document.getElementById(id);
  }

  function activate(id, options) {
    var tab = tabs.find(function (t) { return t.dataset.tab === id; });
    if (!tab) return false;
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      panelFor(t.dataset.tab).classList.toggle("is-active", selected);
    });
    if (options && options.updateHash) history.replaceState(null, "", "#" + id);
    if (options && options.scroll && bar) {
      var top = bar.getBoundingClientRect().top + window.scrollY - 8;
      if (window.scrollY > top) window.scrollTo({ top: top });
    }
    if (options && options.focus) tab.focus();
    return true;
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      activate(tab.dataset.tab, { updateHash: true, scroll: true });
    });
    tab.addEventListener("keydown", function (event) {
      var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      var next = tabs[(index + step + tabs.length) % tabs.length];
      activate(next.dataset.tab, { updateHash: true, focus: true });
    });
  });

  /** Reveal an element inside a tab, unfolding a closed <details> around it. */
  function reveal(target, smooth) {
    var fold = target.closest("details");
    if (fold) fold.open = true;
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  // Links elsewhere on the page that open a tab (e.g. "View CV").
  document.querySelectorAll("[data-tab-link]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      activate(link.dataset.tabLink, { updateHash: true });
      if (bar) bar.scrollIntoView({ behavior: "smooth" });
    });
  });

  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    if (id.indexOf("pub-") === 0 && activate("publicaciones")) {
      var target = document.getElementById(id);
      if (target) reveal(target, false);
      return;
    }
    if (activate(id) && bar) bar.scrollIntoView();
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();

  /* ---- Research areas explorer ---- */
  var explorer = document.querySelector("[data-explorer]");
  if (explorer) {
    var buttons = explorer.querySelectorAll("[data-area-button]");
    var columns = explorer.querySelectorAll("[data-column]");
    var chip = explorer.querySelector("[data-topic-chip]");
    var graphNodes = explorer.querySelectorAll(".topic-graph__node");

    /** kind: "area" (id "all" = everything) or "topic". */
    function apply(kind, id, labels) {
      var attr = kind === "topic" ? "topics" : "areas";
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(kind === "area" && button.dataset.areaButton === id));
      });
      if (chip) {
        chip.hidden = kind !== "topic";
        if (labels) {
          chip.querySelector("[data-topic-label-es]").textContent = labels.es;
          chip.querySelector("[data-topic-label-en]").textContent = labels.en;
        }
      }
      graphNodes.forEach(function (node) {
        node.classList.toggle("is-selected", id !== "all" && node.dataset.nodeId === id);
      });
      columns.forEach(function (column) {
        var limit = Number(column.dataset.limit) || 5;
        var shown = 0;
        var total = 0;
        column.querySelectorAll("[data-areas]").forEach(function (item) {
          var match = id === "all" || item.dataset[attr].split(" ").indexOf(id) !== -1;
          if (match) total++;
          var visible = match && shown < limit;
          if (visible) shown++;
          item.hidden = !visible;
        });
        column.querySelector("[data-count]").textContent = total;
        column.querySelector("[data-empty]").hidden = total > 0;
      });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        apply("area", button.dataset.areaButton);
      });
    });
    if (chip) {
      chip.querySelector("[data-topic-clear]").addEventListener("click", function () {
        apply("area", "all");
      });
    }

    // Topic graph: a click on an area or topic node filters the work below.
    // (A drag never reaches here: the graph motion script swallows that click.)
    explorer.querySelectorAll("[data-graph-filter]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        apply(link.dataset.graphFilter, link.dataset.graphId, {
          es: link.dataset.labelEs,
          en: link.dataset.labelEn,
        });
        var picker = explorer.querySelector(".area-picker");
        if (picker && picker.getBoundingClientRect().top > window.innerHeight * 0.6) {
          picker.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
    apply("area", "all");
  }

  /* ---- Figures ---- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var figures = document.querySelectorAll("[data-countup]");
  if (reduce || !("IntersectionObserver" in window) || !figures.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var el = entry.target;
      var target = Number(el.dataset.countup);
      var start = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - start) / 900);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      }
      el.textContent = "0";
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  figures.forEach(function (el) {
    observer.observe(el);
  });
})();
