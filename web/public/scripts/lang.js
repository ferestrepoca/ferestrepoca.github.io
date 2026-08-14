/**
 * Locale: localStorage override → navigator.languages → es.
 * Visibility via html.lang-* + CSS (FOUC-safe when this runs in <head>).
 */
(function () {
  var KEY = "siteLang";

  function detect() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored === "es" || stored === "en") return stored;
    } catch (_) {}
    var list = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "es"];
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i] || "").toLowerCase();
      if (l.indexOf("en") === 0) return "en";
      if (l.indexOf("es") === 0) return "es";
    }
    return "es";
  }

  function syncSwitcher(lang) {
    var buttons = document.querySelectorAll("[data-set-lang]");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var on = btn.getAttribute("data-set-lang") === lang;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    }
  }

  function syncTitle(lang) {
    var root = document.documentElement;
    var es = root.getAttribute("data-title-es");
    var en = root.getAttribute("data-title-en");
    if (!es) return;
    document.title = lang === "en" && en ? en : es;
  }

  function apply(lang) {
    var root = document.documentElement;
    root.lang = lang;
    root.classList.remove("lang-es", "lang-en");
    root.classList.add("lang-" + lang);
    syncSwitcher(lang);
    syncTitle(lang);
  }

  function setLang(lang) {
    if (lang !== "es" && lang !== "en") return;
    try {
      localStorage.setItem(KEY, lang);
    } catch (_) {}
    apply(lang);
  }

  var lang = detect();
  apply(lang);

  window.__siteLang = { detect: detect, apply: apply, set: setLang };

  document.addEventListener("DOMContentLoaded", function () {
    apply(detect());
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-set-lang"));
      });
    });
  });
})();
