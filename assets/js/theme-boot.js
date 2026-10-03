/* Loaded BLOCKING in <head>, before first paint, so the saved theme is
   applied without a flash of the wrong one. Keep this file tiny and
   dependency-free — it must not wait on shell.js. */
(function () {
  try {
    var saved = localStorage.getItem('bog-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      return;
    }
  } catch (e) {}
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
