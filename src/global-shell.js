(() => {
  "use strict";

  const ACTIVE_CLASS = "plato-classic-global-active";
  const HEADER_ID = "plato-classic-auth-header";
  const excludedPath =
    location.pathname === "/" ||
    location.pathname === "/index.php" ||
    /^\/my(?:\/|$)/.test(location.pathname) ||
    location.pathname.startsWith("/local/ubion/allcourse/regular/");
  if (excludedPath || document.body.classList.contains("notloggedin") || document.getElementById(HEADER_ID)) return;

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
  const makeMenuIcon = (type) => {
    const icon = element("span", "site-menu-icon");
    icon.setAttribute("aria-hidden", "true");
    const shapes = {
      curriculum: '<path d="M2 7 12 3l10 4-10 4L2 7Z"/><path d="M6 10v5c3 2 9 2 12 0v-5"/><path d="M21 8v6"/>',
      community: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.5-4 2.5-6 6-6s5.5 2 6 6"/><path d="M14 14c4-1 6 1 7 4"/>',
      designated: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z"/>',
      teaching: '<path d="M3 5c4-1 7 0 9 2v13c-2-2-5-3-9-2V5Z"/><path d="M21 5c-4-1-7 0-9 2v13c2-2 5-3 9-2V5Z"/>',
      message: '<path d="M22 2 9.7 14.3"/><path d="M22 2 14.2 22 9.7 14.3 2 9.8 22 2Z"/>'
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = shapes[type] || shapes.designated;
    icon.append(svg);
    return icon;
  };

  const readIdentity = (root = document) => {
    const text = (selector) => normalize(root.querySelector(selector)?.textContent);
    const prompt = text(".prompt-text[data-aihub='keyword']");
    const name = text("[data-region='user-menu'] .usertext") ||
      text(".usermenu .usertext") ||
      text(".userbutton .usertext") ||
      prompt.match(/안녕하세요,\s*(.+?)님/)?.[1] || "";
    return {
      time: text(".user-lastaccess .ul-item:first-child span"),
      ip: text(".user-lastaccess .ul-item:nth-child(2) span"),
      name,
      initial: text(".btn-user-setting .csms-avata-picture") || name.slice(0, 1),
      picture: root.querySelector(".btn-user-setting img, [data-region='user-menu'] img.userpicture")?.src || ""
    };
  };

  const applyIdentity = (header, identity) => {
    const access = header.querySelector(".nav-item-userinfo-iptime");
    if (identity.time || identity.ip) {
      access.textContent = [
        identity.time && `최종 접속시간 : ${identity.time}`,
        identity.ip && `최종 접속IP : ${identity.ip}`
      ].filter(Boolean).join(" / ");
      access.hidden = false;
    }
    const fullname = header.querySelector(".fullname");
    if (identity.name) fullname.textContent = identity.name;
    const badge = header.querySelector(".picture-badge");
    if (identity.picture) {
      const image = document.createElement("img");
      image.src = identity.picture;
      image.alt = "";
      image.className = "userpicture";
      badge.replaceChildren(image);
    } else {
      const image = document.createElement("img");
      image.src = chrome.runtime.getURL("assets/icons/default-user.svg");
      image.alt = "기본 사용자 사진";
      image.className = "userpicture userpicture-default";
      badge.replaceChildren(image);
    }
  };

  const makeHeader = () => {
    const header = element("header", "headroom fixed-top");
    header.id = HEADER_ID;
    const utility = element("div", "page-util");
    const family = element("div", "family-sites");
    const sites = element("ul", "site");
    [
      ["부산대학교", "https://www.pusan.ac.kr"],
      ["교수학습지원센터", "https://ctl.pusan.ac.kr"],
      ["학생지원시스템", "https://onestop.pusan.ac.kr"],
      ["교육정보시스템", "https://one.pusan.ac.kr"],
      ["도서관", "https://lib.pusan.ac.kr"]
    ].forEach(([label, href]) => {
      const item = element("li", "site-item");
      item.append(anchor(label, href));
      sites.append(item);
    });
    family.append(sites);

    const identity = readIdentity();
    const usermenu = element("div", "usermenu");
    const usernav = element("ul", "nav-user");
    const access = element("li", "nav-item nav-item-userinfo nav-item-userinfo-iptime");
    access.hidden = true;
    const user = element("li", "nav-item nav-item-userinfo");
    const userButton = element("button", "btn-userinfo");
    userButton.type = "button";
    userButton.setAttribute("aria-haspopup", "dialog");
    userButton.setAttribute("aria-expanded", "false");
    userButton.append(element("span", "fullname", identity.name || "PLATO 사용자"), element("span", "picture-badge"));
    user.append(userButton);
    const logout = element("li", "nav-item nav-item-loginout");
    logout.append(anchor("로그아웃", document.querySelector("a[href*='/login/logout.php']")?.href || "https://plato.pusan.ac.kr/login/logout.php", "btn-loginout"));
    usernav.append(access, user, logout);
    usermenu.append(usernav);
    utility.append(family, usermenu);

    const pageMenu = element("div", "page-menu");
    const logoBox = element("div", "logo");
    const logoLink = anchor("", "https://plato.pusan.ac.kr/", "logo-link");
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("assets/icons/plato-logo.png");
    logo.alt = "부산대학교 스마트 교육플랫폼 PLATO";
    logoLink.append(logo);
    logoBox.append(logoLink);
    const menuBox = element("div", "site-menus");
    const menuList = element("ul", "menu-list");
    const encryptedTarget = (() => {
      if (!location.pathname.startsWith("/local/coursemos/lxp/")) return "";
      const encoded = new URL(location.href).searchParams.get("url");
      if (!encoded) return "";
      try {
        const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
        return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
      } catch {
        return "";
      }
    })();
    const effectiveMenuPath = encryptedTarget || location.pathname;
    const currentGroup = new URL(location.href).searchParams.get("cgroup") || "";
    [
      ["교과과정", "https://plato.pusan.ac.kr/local/ubion/allcourse/regular/index.php", "curriculum", () => /^\/local\/ubion\/allcourse\/regular\//.test(effectiveMenuPath)],
      ["자율강좌", "https://plato.pusan.ac.kr/local/ubeclass/my.php", "community", () => /^\/local\/ubeclass\//.test(effectiveMenuPath)],
      ["지정강좌", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=1", "designated", () => /^\/local\/ubonline\//.test(effectiveMenuPath) && currentGroup !== "2"],
      ["교수·학습", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=2", "teaching", () => /^\/local\/ubteaching\//.test(effectiveMenuPath) || (/^\/local\/ubonline\//.test(effectiveMenuPath) && currentGroup === "2")],
      ["메시지", "https://plato.pusan.ac.kr/local/talk/index.php", "message", () => /^\/local\/talk\//.test(effectiveMenuPath)]
    ].forEach(([label, href, iconType, isCurrent]) => {
      const item = element("li", "menu-item");
      if (iconType === "message") item.classList.add("menu-item-message");
      const link = anchor("", href, "site-menu-link nosubmenu");
      if (isCurrent()) link.setAttribute("aria-current", "page");
      link.append(makeMenuIcon(iconType), element("span", "menu-name", label));
      item.append(link);
      menuList.append(item);
    });
    menuBox.append(menuList);
    pageMenu.append(logoBox, menuBox);
    header.append(utility, pageMenu);
    applyIdentity(header, identity);
    return header;
  };

  const header = makeHeader();
  header.hidden = true;
  document.body.prepend(header);
  const defaults = { classicEnabled: true, dashboardEnabled: true };
  const applySettings = (settings) => {
    const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
    header.hidden = !enabled;
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
    document.dispatchEvent(new CustomEvent("plato-classic-ready"));
  };
  chrome.storage.local.get(defaults, applySettings);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || (!changes.classicEnabled && !changes.dashboardEnabled)) return;
    chrome.storage.local.get(defaults, applySettings);
  });

  const pageIdentity = readIdentity();
  if (!pageIdentity.time || !pageIdentity.ip || !pageIdentity.name) {
    fetch("https://plato.pusan.ac.kr/", { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.text() : "")
      .then((html) => {
        if (!html) return;
        const page = new DOMParser().parseFromString(html, "text/html");
        applyIdentity(header, { ...pageIdentity, ...Object.fromEntries(
          Object.entries(readIdentity(page)).filter(([, value]) => value)
        ) });
      })
      .catch(() => {});
  }
})();
