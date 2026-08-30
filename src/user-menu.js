(() => {
  "use strict";

  const host = document.getElementById("plato-classic-dashboard-host");
  const root = host?.shadowRoot?.querySelector("#plato-classic-page-header")
    ? host.shadowRoot
    : document;
  const overlayHost = root instanceof ShadowRoot ? root : document.body;
  const header = root.querySelector("#plato-classic-page-header, #plato-classic-auth-header");
  const userButton = header?.querySelector(".btn-userinfo");
  if (!overlayHost || !header || !userButton || root.querySelector(".plato-classic-user-panel")) return;

  const NOTIFICATION_ENDPOINT = "/local/ubnotification/action.php";
  const NOTIFICATION_CACHE_MS = 5 * 60_000;
  const NOTIFICATION_RETRY_MS = 30_000;
  const normalize = (value = "") => value.replace(/\s+/g, " ").trim();
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const anchor = (text, href, className = "") => {
    const node = element("a", className, text);
    node.href = href;
    return node;
  };
  const currentLanguageUrl = (language) => {
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    return url.href;
  };
  const currentUserId = () => {
    const profileLink = document.querySelector("a[href*='/user/profile.php?id=']")?.getAttribute("href");
    if (profileLink) {
      try {
        const id = new URL(profileLink, location.origin).searchParams.get("id");
        if (/^\d+$/.test(id || "")) return id;
      } catch {
        return "";
      }
    }
    for (const script of document.scripts) {
      const match = (script.textContent || "").match(/["']?userId["']?\s*:\s*(\d+)/);
      if (match?.[1]) return match[1];
    }
    return "";
  };
  const profilePairs = (page) => {
    const pairs = [];
    page.querySelectorAll("dt").forEach((label) => {
      const value = label.nextElementSibling;
      if (value?.matches("dd")) pairs.push([normalize(label.textContent), normalize(value.textContent)]);
    });
    page.querySelectorAll("tr").forEach((row) => {
      const label = row.querySelector("th");
      const value = row.querySelector("td");
      if (label && value) pairs.push([normalize(label.textContent), normalize(value.textContent)]);
    });
    return pairs;
  };
  const requestProfileMeta = async () => {
    const userId = currentUserId();
    if (!userId) return "";
    try {
      const url = new URL("/user/profile.php", location.origin);
      url.searchParams.set("id", userId);
      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "text/html" }
      });
      if (!response.ok || response.redirected && new URL(response.url).pathname.startsWith("/login/")) return "";
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const pairs = profilePairs(page);
      const studentNumber = pairs
        .filter(([label]) => /^(?:학번|id\s*number|student\s*(?:id|number))$/i.test(label.replace(/[:：]/g, "").trim()))
        .map(([, value]) => value.match(/\b20\d{7}\b/)?.[0] || "")
        .find(Boolean);
      if (studentNumber) return `학번 ${studentNumber}`;

      const affiliation = pairs.find(([label, value]) =>
        /(?:학과|학부|소속|부서|department|institution)/i.test(label) && value
      )?.[1];
      return affiliation ? affiliation.slice(0, 80) : "";
    } catch {
      return "";
    }
  };
  const safeHref = (value = "") => {
    if (!value) return "";
    try {
      const url = new URL(value, location.origin);
      const unsafeQuery = ["sesskey", "confirm", "delete", "action"].some((name) => url.searchParams.has(name));
      const unsafePath = /\/(?:action|logout)\.php$/i.test(url.pathname);
      return url.protocol === "https:" && url.origin === location.origin && !unsafeQuery && !unsafePath
        ? url.href
        : "";
    } catch {
      return "";
    }
  };

  const iconShapes = {
    person: [
      ["circle", { cx: "12", cy: "8", r: "3.25" }],
      ["path", { d: "M5.7 19c.55-3.55 2.65-5.5 6.3-5.5s5.75 1.95 6.3 5.5" }]
    ],
    settings: [
      ["circle", { cx: "12", cy: "12", r: "3" }],
      ["path", { d: "M19 12a7 7 0 0 0-.09-1.1l2-1.55-2-3.45-2.48 1A7.3 7.3 0 0 0 14.5 5.8L14.15 3h-4.3L9.5 5.8A7.3 7.3 0 0 0 7.57 6.9l-2.48-1-2 3.45 2 1.55A7 7 0 0 0 5 12c0 .38.03.74.09 1.1l-2 1.55 2 3.45 2.48-1a7.3 7.3 0 0 0 1.93 1.1l.35 2.8h4.3l.35-2.8a7.3 7.3 0 0 0 1.93-1.1l2.48 1 2-3.45-2-1.55c.06-.36.09-.72.09-1.1Z" }]
    ],
    folder: [
      ["path", { d: "M3.5 7.5h6l1.8 2h9.2v8.75A1.75 1.75 0 0 1 18.75 20h-13A1.75 1.75 0 0 1 4 18.25V5.75A1.75 1.75 0 0 1 5.75 4h3.5l1.8 2H18a1.5 1.5 0 0 1 1.5 1.5" }]
    ],
    message: [
      ["path", { d: "M22 2 9.7 14.3" }],
      ["path", { d: "M22 2 14.2 22 9.7 14.3 2 9.8 22 2Z" }]
    ],
    refresh: [
      ["path", { d: "M19 8.5A7.5 7.5 0 1 0 19.25 15M19 4.5v4h-4" }]
    ]
  };
  const makeIcon = (name) => {
    const wrapper = element("span", `plato-classic-user-link-icon icon-${name}`);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    (iconShapes[name] || []).forEach(([tag, attributes]) => {
      const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attributes).forEach(([key, value]) => shape.setAttribute(key, value));
      svg.append(shape);
    });
    wrapper.append(svg);
    return wrapper;
  };

  const backdrop = element("button", "plato-classic-user-backdrop");
  backdrop.type = "button";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-label", "사용자 메뉴 닫기");

  const panel = element("section", "plato-classic-user-panel");
  panel.id = "plato-classic-user-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", "사용자 메뉴와 최근 알림");
  userButton.setAttribute("aria-controls", panel.id);
  userButton.setAttribute("aria-haspopup", "dialog");
  userButton.setAttribute("aria-expanded", "false");

  const tabs = element("div", "plato-classic-user-tabs");
  const tabList = element("div", "plato-classic-user-tablist");
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "사용자 메뉴 구분");
  tabList.setAttribute("aria-orientation", "vertical");
  const myTab = element("button", "plato-classic-user-tab active", "My");
  const notificationTab = element("button", "plato-classic-user-tab");
  const notificationTabLabel = element("span", "plato-classic-user-tab-label", "알림");
  const notificationCount = element("span", "plato-classic-user-tab-count");
  notificationCount.hidden = true;
  notificationTab.append(notificationTabLabel, notificationCount);
  const close = element("button", "plato-classic-user-close", "×");
  [myTab, notificationTab, close].forEach((button) => { button.type = "button"; });
  myTab.id = "plato-classic-user-tab-my";
  notificationTab.id = "plato-classic-user-tab-notification";
  myTab.setAttribute("role", "tab");
  notificationTab.setAttribute("role", "tab");
  myTab.setAttribute("aria-selected", "true");
  notificationTab.setAttribute("aria-selected", "false");
  myTab.setAttribute("aria-controls", "plato-classic-user-pane-my");
  notificationTab.setAttribute("aria-controls", "plato-classic-user-pane-notification");
  myTab.tabIndex = 0;
  notificationTab.tabIndex = -1;
  close.setAttribute("aria-label", "닫기");
  tabList.append(myTab, notificationTab);
  tabs.append(tabList, close);

  const content = element("div", "plato-classic-user-content");
  const myPane = element("div", "plato-classic-user-pane active");
  myPane.id = "plato-classic-user-pane-my";
  myPane.setAttribute("role", "tabpanel");
  myPane.setAttribute("aria-labelledby", myTab.id);
  const identity = element("div", "plato-classic-user-identity");
  const headerPicture = header.querySelector(".picture-badge img");
  const identityPicture = headerPicture?.cloneNode(true) || element("img");
  if (!identityPicture.src && typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    identityPicture.src = chrome.runtime.getURL("assets/icons/default-user.svg");
  }
  identityPicture.alt = identityPicture.alt || "사용자 기본 이미지";
  const identityText = element("div", "plato-classic-user-identity-text");
  const identityName = element("strong", "", normalize(header.querySelector(".fullname")?.textContent) || "PLATO 사용자");
  const identityMeta = element("span", "plato-classic-user-identity-meta");
  identityMeta.hidden = true;
  identityText.append(identityName, identityMeta);
  identity.append(identityPicture, identityText);

  const menu = element("nav", "plato-classic-user-links");
  menu.setAttribute("aria-label", "사용자 설정");
  const logoutHref = header.querySelector(".btn-loginout")?.href ||
    "https://plato.pusan.ac.kr/login/logout.php";
  [
    ["개인정보 수정", "프로필 및 계정 정보", "https://plato.pusan.ac.kr/local/ubion/user/edit.php", "person"],
    ["메시지 보내기", "PLATO 메시지", "https://plato.pusan.ac.kr/local/talk/index.php", "message"],
    ["개인 파일 관리", "내 파일 저장소", "https://plato.pusan.ac.kr/user/files.php", "folder"],
    ["환경설정", "알림·메시지 환경설정", "https://plato.pusan.ac.kr/user/preferences.php", "settings"],
    ["로그아웃", "PLATO에서 로그아웃", logoutHref, "person"]
  ].forEach(([label, description, href, icon]) => {
    const link = anchor("", href, "plato-classic-user-link");
    const copy = element("span", "plato-classic-user-link-copy");
    copy.append(element("strong", "", label), element("small", "", description));
    link.append(makeIcon(icon), copy, element("span", "plato-classic-user-link-arrow", "›"));
    menu.append(link);
  });

  const languages = element("div", "plato-classic-language");
  languages.append(element("div", "plato-classic-language-title", "디스플레이 언어"));
  const languageLinks = element("div", "plato-classic-language-links");
  const languageFlag = element("img", "plato-classic-language-flag");
  languageFlag.alt = "";
  languageFlag.setAttribute("aria-hidden", "true");
  const languageSelect = element("select", "plato-classic-language-select");
  languageSelect.setAttribute("aria-label", "디스플레이 언어");
  const currentLanguage = document.documentElement.lang.toLowerCase();
  [
    ["한국어 (ko)", "ko"],
    ["English (en)", "en"],
    ["简体中文 (zh_cn)", "zh_cn"]
  ].forEach(([label, language]) => {
    const option = element("option", "", label);
    option.value = language;
    option.selected = currentLanguage.startsWith(language.split("_")[0]);
    languageSelect.append(option);
  });
  const languageFlagAssets = {
    ko: "assets/icons/flag-ko.png",
    en: "assets/icons/flag-en.svg",
    zh_cn: "assets/icons/flag-zh-cn.svg"
  };
  const syncLanguageFlag = () => {
    const asset = languageFlagAssets[languageSelect.value] || languageFlagAssets.ko;
    languageFlag.src = chrome.runtime.getURL(asset);
  };
  syncLanguageFlag();
  languageSelect.addEventListener("change", () => {
    syncLanguageFlag();
    location.href = currentLanguageUrl(languageSelect.value);
  });
  languageLinks.append(languageFlag, languageSelect);
  languages.append(languageLinks);
  myPane.append(identity, languages, menu);

  const notificationPane = element("div", "plato-classic-user-pane plato-classic-notification-pane");
  notificationPane.id = "plato-classic-user-pane-notification";
  notificationPane.setAttribute("role", "tabpanel");
  notificationPane.setAttribute("aria-labelledby", notificationTab.id);
  notificationPane.hidden = true;
  const notificationHeader = element("div", "plato-classic-notification-header");
  const notificationHeading = element("div", "plato-classic-notification-heading");
  notificationHeading.append(element("strong", "", "최근 알림"));
  const notificationActions = element("div", "plato-classic-notification-actions");
  const refreshButton = element("button", "plato-classic-notification-refresh");
  refreshButton.type = "button";
  refreshButton.setAttribute("aria-label", "알림 새로고침");
  refreshButton.append(makeIcon("refresh"));
  notificationActions.append(
    refreshButton,
    anchor("전체보기", "https://plato.pusan.ac.kr/message/index.php?view=notifications")
  );
  notificationHeader.append(notificationHeading, notificationActions);
  const notificationList = element("div", "plato-classic-notification-list");
  const notificationFooter = element(
    "div",
    "plato-classic-notification-footer",
    "알림 탭을 열면 자동으로 조회하며, 새로고침 버튼으로 즉시 다시 확인할 수 있습니다."
  );
  notificationPane.append(notificationHeader, notificationList, notificationFooter);
  content.append(myPane, notificationPane);
  panel.append(tabs, content);
  overlayHost.append(backdrop, panel);

  const updateNotificationCount = (value) => {
    const count = Number.parseInt(String(value ?? ""), 10);
    const visible = Number.isFinite(count) && count > 0;
    notificationCount.hidden = !visible;
    notificationCount.textContent = visible ? (count > 99 ? "99+" : String(count)) : "";
  };
  const readSesskey = () => {
    const inputValue = document.querySelector("input[name='sesskey']")?.value;
    if (inputValue) return inputValue;
    const logoutHref = document.querySelector("a[href*='/login/logout.php'][href*='sesskey=']")?.getAttribute("href");
    if (logoutHref) {
      try {
        const value = new URL(logoutHref, location.origin).searchParams.get("sesskey");
        if (value) return value;
      } catch {
        // Continue with the inline Moodle configuration fallback.
      }
    }
    for (const script of document.scripts) {
      const source = script.textContent || "";
      const match = source.match(/["']sesskey["']\s*:\s*["']([^"']+)["']/i) ||
        source.match(/M\.cfg\.sesskey\s*=\s*["']([^"']+)["']/i);
      if (match?.[1]) return match[1];
    }
    return "";
  };
  const readNotifications = (source) => {
    const selectors = [
      ".notification-item:not(.placeholder-glow)",
      "[data-region='notification-content']",
      ".popover-region-notifications .content-item-container",
      "[data-region='all-notifications'] [data-region='notification-content-item-container']"
    ];
    const nodes = selectors.flatMap((selector) => [...source.querySelectorAll(selector)]);
    const seen = new Set();
    return nodes.map((node) => {
      const link = node.matches("a[href]") ? node : node.querySelector("a[href]");
      const sourceText = normalize(
        node.querySelector(".notification-item-header .header-title, .notification-item-header .title, .notification-source")?.textContent
      );
      const title = normalize(
        node.querySelector(".notification-item-body, .notification-title, .notification-item-title, .subject, [data-region='notification-message'], .text-truncate")?.textContent ||
        link?.textContent ||
        node.textContent
      );
      const date = normalize(
        node.querySelector(".notification-item-header .header-date, time, .date, .notification-date, [data-region='notification-time']")?.textContent
      );
      const href = safeHref(link?.getAttribute("href") || "");
      const read = node.classList.contains("notification-item-read") || node.getAttribute("data-read") === "true";
      return { source: sourceText, title, date, href, read };
    }).filter((item) => {
      const key = `${item.href}|${item.title}|${item.date}`;
      return item.title && !seen.has(key) && seen.add(key);
    }).slice(0, 10);
  };

  const renderNotificationState = (title, detail = "") => {
    notificationList.replaceChildren();
    const state = element("div", "plato-classic-notification-empty");
    state.append(element("strong", "", title));
    if (detail) state.append(element("span", "", detail));
    notificationList.append(state);
  };
  const renderNotifications = (items, totalCount = items.length) => {
    notificationList.replaceChildren();
    updateNotificationCount(totalCount);
    if (!items.length) {
      renderNotificationState("새 알림이 없습니다.", "최신 알림을 모두 확인했습니다.");
      return;
    }
    items.forEach((item) => {
      const row = item.href
        ? anchor("", item.href, "plato-classic-notification-item")
        : element("div", "plato-classic-notification-item");
      row.classList.toggle("is-read", item.read === true);
      row.append(element("span", "plato-classic-notification-dot"));
      const copy = element("span", "plato-classic-notification-copy");
      if (item.source || item.date) {
        const meta = element("span", "plato-classic-notification-meta");
        if (item.source) meta.append(element("span", "plato-classic-notification-source", item.source));
        if (item.date) meta.append(element("span", "plato-classic-notification-date", item.date));
        copy.append(meta);
      }
      copy.append(element("span", "plato-classic-notification-title", item.title));
      row.append(copy);
      notificationList.append(row);
    });
  };

  let notificationItems = [];
  let notificationTotal = 0;
  let notificationFetchedAt = 0;
  let notificationAttemptedAt = 0;
  let notificationRequest = null;
  const requestNotifications = async () => {
    const sesskey = readSesskey();
    if (!sesskey) throw new Error("Moodle session key is unavailable");

    const body = new FormData();
    body.append("coursemostype", "lists");
    body.append("courseid", "0");
    body.append("page", "1");
    body.append("sesskey", sesskey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let response;
    try {
      response = await fetch(new URL(NOTIFICATION_ENDPOINT, location.origin), {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Notification request failed: ${response.status}`);
    const result = await response.json();
    const payload = result?.data && typeof result.data === "object" ? result.data : result;
    const code = Number(result?.code ?? payload?.code);
    if (code !== 100) throw new Error(`Notification response code: ${code}`);

    const html = typeof payload?.html === "string" ? payload.html : "";
    const parsed = new DOMParser().parseFromString(`<main>${html}</main>`, "text/html");
    const items = readNotifications(parsed);
    const countCandidate = payload?.count ?? payload?.totalcount ?? payload?.totalCount;
    const parsedCount = Number.parseInt(String(countCandidate ?? ""), 10);
    return {
      items,
      total: Number.isFinite(parsedCount) ? parsedCount : items.length
    };
  };
  const refreshNotifications = ({ force = false } = {}) => {
    if (!force) {
      const localItems = readNotifications(document);
      if (localItems.length) {
        notificationItems = localItems;
        notificationTotal = localItems.length;
        renderNotifications(localItems, localItems.length);
        return Promise.resolve();
      }
      if (notificationFetchedAt && Date.now() - notificationFetchedAt < NOTIFICATION_CACHE_MS) {
        renderNotifications(notificationItems, notificationTotal);
        return Promise.resolve();
      }
      if (notificationAttemptedAt && Date.now() - notificationAttemptedAt < NOTIFICATION_RETRY_MS) {
        return Promise.resolve();
      }
    }
    if (notificationRequest) return notificationRequest;
    notificationAttemptedAt = Date.now();
    notificationPane.setAttribute("aria-busy", "true");
    renderNotificationState("알림을 불러오는 중입니다.", "PLATO에서 최신 알림을 확인하고 있습니다.");
    notificationRequest = requestNotifications()
      .then(({ items, total }) => {
        notificationItems = items;
        notificationTotal = total;
        notificationFetchedAt = Date.now();
        renderNotifications(items, total);
      })
      .catch(() => {
        const localItems = readNotifications(document);
        if (localItems.length) {
          notificationItems = localItems;
          notificationTotal = localItems.length;
          renderNotifications(localItems, localItems.length);
        } else {
          updateNotificationCount(0);
          renderNotificationState("알림을 불러오지 못했습니다.", "잠시 후 새로고침하거나 알림 센터에서 확인해 주세요.");
        }
      })
      .finally(() => {
        notificationPane.removeAttribute("aria-busy");
        notificationRequest = null;
      });
    return notificationRequest;
  };

  const syncIdentity = () => {
    identityName.textContent = normalize(header.querySelector(".fullname")?.textContent) || "PLATO 사용자";
    const currentPicture = header.querySelector(".picture-badge img");
    if (currentPicture?.src) {
      identityPicture.src = currentPicture.src;
      identityPicture.alt = currentPicture.alt || "사용자 기본 이미지";
    }
  };
  let profileMetaRequested = false;
  const syncProfileMeta = () => {
    if (profileMetaRequested) return;
    profileMetaRequested = true;
    requestProfileMeta().then((value) => {
      if (!value) return;
      identityMeta.textContent = value;
      identityMeta.hidden = false;
    });
  };
  const selectTab = (type) => {
    const notificationSelected = type === "notification";
    myTab.classList.toggle("active", !notificationSelected);
    notificationTab.classList.toggle("active", notificationSelected);
    myTab.setAttribute("aria-selected", String(!notificationSelected));
    notificationTab.setAttribute("aria-selected", String(notificationSelected));
    myTab.tabIndex = notificationSelected ? -1 : 0;
    notificationTab.tabIndex = notificationSelected ? 0 : -1;
    myPane.hidden = notificationSelected;
    notificationPane.hidden = !notificationSelected;
    if (notificationSelected) refreshNotifications();
  };
  const setOpen = (open) => {
    panel.hidden = !open;
    backdrop.hidden = !open;
    userButton.setAttribute("aria-expanded", String(open));
    if (open) {
      syncIdentity();
      syncProfileMeta();
      selectTab("my");
    }
  };
  const closeAndRestoreFocus = () => {
    setOpen(false);
    userButton.focus();
  };

  userButton.addEventListener("click", () => setOpen(panel.hidden));
  myTab.addEventListener("click", () => selectTab("my"));
  notificationTab.addEventListener("click", () => selectTab("notification"));
  tabList.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabButtons = [myTab, notificationTab];
    const currentIndex = Math.max(0, tabButtons.indexOf(root.activeElement || document.activeElement));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabButtons.length - 1
        : (currentIndex + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + tabButtons.length) % tabButtons.length;
    const nextTab = tabButtons[nextIndex];
    selectTab(nextTab === notificationTab ? "notification" : "my");
    nextTab.focus();
  });
  refreshButton.addEventListener("click", () => refreshNotifications({ force: true }));
  panel.addEventListener("wheel", (event) => {
    if (panel.hidden) return;
    event.stopPropagation();
    if (!content.contains(event.target)) {
      event.preventDefault();
      return;
    }

    const atTop = content.scrollTop <= 0;
    const atBottom = Math.ceil(content.scrollTop + content.clientHeight) >= content.scrollHeight;
    if (content.scrollHeight <= content.clientHeight ||
        atTop && event.deltaY < 0 ||
        atBottom && event.deltaY > 0) {
      event.preventDefault();
    }
  }, { passive: false });
  backdrop.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
  close.addEventListener("click", closeAndRestoreFocus);
  backdrop.addEventListener("click", closeAndRestoreFocus);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeAndRestoreFocus();
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.classicEnabled?.newValue === false || changes.dashboardEnabled?.newValue === false) {
      setOpen(false);
    }
  });
})();
