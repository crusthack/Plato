(() => {
  "use strict";

  if (document.body?.classList.contains("notloggedin")) return;

  const ACTIVE_CLASS = "plato-classic-avatar-active";
  const start = () => {

  const avatarSelector = ".csms-avata-picture, .userinitials";
  const defaultAvatarUrl = chrome.runtime.getURL("assets/icons/default-user.svg");

  const hasRealPicture = (avatar) => {
    if (avatar.matches("img") || avatar.querySelector("img, picture")) return true;
    const inlineBackground = avatar.style?.backgroundImage || "";
    if (/url\s*\(/i.test(inlineBackground)) return true;
    const computedBackground = getComputedStyle(avatar).backgroundImage;
    return computedBackground && computedBackground !== "none" && /url\s*\(/i.test(computedBackground);
  };

  const replaceInitialAvatar = (avatar) => {
    if (!(avatar instanceof HTMLElement)) return;
    if (avatar.dataset.classicDefaultAvatar === "true" || hasRealPicture(avatar)) return;

    const originalText = avatar.textContent.replace(/\s+/g, " ").trim();
    const image = document.createElement("img");
    image.src = defaultAvatarUrl;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.className = "plato-classic-default-avatar-image";

    avatar.replaceChildren(image);
    avatar.dataset.classicDefaultAvatar = "true";
    avatar.classList.add("plato-classic-default-avatar");
    if (originalText && !avatar.title) avatar.title = originalText;
  };

  const applyDefaultAvatars = (root) => {
    if (!(root instanceof Element || root instanceof Document)) return;
    if (root instanceof Element && root.matches(avatarSelector)) replaceInitialAvatar(root);
    root.querySelectorAll(avatarSelector).forEach(replaceInitialAvatar);
  };

  applyDefaultAvatars(document);

  let refreshFrame = 0;
  const pendingRoots = new Set();
  const queueRoot = (root) => {
    for (const pending of pendingRoots) {
      if (pending.contains(root)) return;
      if (root.contains(pending)) pendingRoots.delete(pending);
    }
    pendingRoots.add(root);
  };
  new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) queueRoot(node);
      });
    });
    if (refreshFrame || !pendingRoots.size) return;
    refreshFrame = requestAnimationFrame(() => {
      pendingRoots.forEach(applyDefaultAvatars);
      pendingRoots.clear();
      refreshFrame = 0;
    });
  }).observe(document.body, { childList: true, subtree: true });
  };

  chrome.storage.local.get({ classicEnabled: true, dashboardEnabled: true }, (settings) => {
    const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
    if (enabled) start();
  });
})();
