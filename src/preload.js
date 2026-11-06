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

  // True when the user typed into a form on this page, so a settings change made
  // from the popup does not throw away unsaved input by reloading the tab.
  let edited = false;
  document.addEventListener("input", (event) => {
    if (event.isTrusted) edited = true;
  }, true);
  const hasUnsavedInput = () => edited ||
    [...document.querySelectorAll("textarea, input:not([type='hidden']):not([type='button']):not([type='submit'])")]
      .some((field) => (field.type === "checkbox" || field.type === "radio")
        ? field.checked !== field.defaultChecked
        : field.value !== field.defaultValue);

  let reloadRequested = false;
  const reloadWhenSafe = () => {
    if (hasUnsavedInput()) return; // applied on the next page load instead
    reloadRequested = true;
    location.reload();
  };
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || reloadRequested) return;
    if (!Object.keys(changes).some((key) => SETTING_KEYS.has(key))) return;
    if (document.visibilityState === "visible") {
      reloadWhenSafe();
      return;
    }
    // Background tabs reload once they are shown again.
    document.addEventListener("visibilitychange", function onVisible() {
      if (document.visibilityState !== "visible" || reloadRequested) return;
      document.removeEventListener("visibilitychange", onVisible);
      reloadWhenSafe();
    });
  });
})();
