(() => {
  "use strict";

  const PREPARING_CLASS = "plato-classic-preparing";
  const SETTING_KEYS = new Set(["classicEnabled", "loginEnabled", "dashboardEnabled"]);
  const root = document.documentElement;
  root.classList.add(PREPARING_CLASS);

  const pageUrl = new URL(location.href);
  if (pageUrl.pathname === "/course/view.php" &&
      /^\d+$/.test(pageUrl.searchParams.get("id") || "") &&
      !pageUrl.searchParams.has("mode")) {
    const redirectFallback = window.setTimeout(() => {
      root.classList.remove(PREPARING_CLASS);
    }, 1500);
    chrome.storage.local.get(
      { classicEnabled: true, dashboardEnabled: true },
      (settings) => {
        if (settings.classicEnabled !== false && settings.dashboardEnabled !== false) {
          pageUrl.searchParams.set("mode", "sections");
          pageUrl.hash = "section-0";
          location.replace(pageUrl.href);
          return;
        }
        window.clearTimeout(redirectFallback);
        root.classList.remove(PREPARING_CLASS);
      }
    );
    return;
  }

  let fallbackTimer = window.setTimeout(() => {
    root.classList.remove(PREPARING_CLASS);
  }, 4500);

  const reveal = () => {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = 0;
    root.classList.remove(PREPARING_CLASS);
  };

  document.addEventListener("plato-classic-ready", reveal, { once: true });
  chrome.storage.local.get({ classicEnabled: true }, (settings) => {
    if (settings.classicEnabled === false) reveal();
  });

  let reloadRequested = false;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || reloadRequested) return;
    if (!Object.keys(changes).some((key) => SETTING_KEYS.has(key))) return;
    reloadRequested = true;
    location.reload();
  });
})();
