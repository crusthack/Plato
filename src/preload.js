(() => {
  "use strict";

  const PREPARING_CLASS = "plato-classic-preparing";
  const SETTING_KEYS = new Set(["classicEnabled", "loginEnabled", "dashboardEnabled"]);
  const root = document.documentElement;
  root.classList.add(PREPARING_CLASS);

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
