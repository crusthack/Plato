(() => {
  "use strict";

  const HOST_ID = "plato-classic-dashboard-host";
  const SHELL_ID = "plato-classic-dashboard";
  const SOURCE_CLASS = "plato-classic-dashboard-source";
  const ACTIVE_CLASS = "plato-classic-dashboard-active";
  const VIEW_PARAM = "plato_classic_view";
  const PAST_COURSES_VIEW = "past-courses";
  const MIN_LEGACY_YEAR = 2014;
  const LEGACY_CUTOVER_YEAR = 2026;
  const SEMESTER_LABELS = {
    "10": "1학기",
    "11": "여름계절수업",
    "12": "여름도약수업",
    "20": "2학기",
    "21": "겨울계절수업",
    "22": "겨울도약수업"
  };

  const isDashboardPath =
    /^\/my(?:\/|$)/.test(location.pathname) ||
    location.pathname === "/" ||
    location.pathname === "/index.php";
  if (!isDashboardPath || document.body.classList.contains("notloggedin")) return;

  const normalize = (value = "") => value.replace(/\s+/g, " ").trim();
  const formatNoticeDate = (value = "") => {
    const normalized = normalize(value);
    const match = normalized.match(/((?:19|20)\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})일?/);
    return match
      ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`
      : normalized;
  };
  const cleanProfessorName = (value = "") => {
    const parts = normalize(value).split(" ").filter(Boolean);
    return parts.filter((part, index) => !(
      /^[가-힣]$/.test(part) && parts[index + 1]?.startsWith(part)
    )).join(" ");
  };
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  let classicRoot = document;

  const uniqueBy = (items, key) => {
    const seen = new Set();
    return items.filter((item) => {
      const value = key(item);
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  const safeCurrentCourseHref = (value = "") => {
    try {
      const url = new URL(value, location.origin);
      const courseId = url.searchParams.get("id") || "";
      return url.origin === location.origin && url.protocol === "https:" &&
        url.pathname === "/course/view.php" && /^\d+$/.test(courseId)
        ? url.href
        : "";
    } catch {
      return "";
    }
  };

  const safeShowcaseHref = (value = "", base = "https://plato.pusan.ac.kr/") => {
    try {
      const url = new URL(value, base);
      const allowedOrigin = url.origin === "https://plato.pusan.ac.kr" ||
        url.origin === "https://dev-plato.pusan.ac.kr";
      const allowedPath = /^\/local\/(?:ubteaching|ubonline|ubeclass|opencontent)\/(?:view\.php)?$/i.test(url.pathname) ||
        url.pathname === "/course/view.php";
      const unsafeQuery = ["sesskey", "confirm", "delete", "action"].some((name) => url.searchParams.has(name));
      return url.protocol === "https:" && allowedOrigin && allowedPath && !unsafeQuery ? url.href : "";
    } catch {
      return "";
    }
  };

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

  const defaultPastTerm = () => {
    const currentYear = new Date().getFullYear();
    return currentYear >= LEGACY_CUTOVER_YEAR
      ? { year: LEGACY_CUTOVER_YEAR, semester: "10" }
      : { year: Math.max(MIN_LEGACY_YEAR, currentYear - 1), semester: "20" };
  };

  const pastTermFromLocation = () => {
    const params = new URLSearchParams(location.search);
    const defaultTerm = defaultPastTerm();
    const year = Number(params.get("year"));
    const semester = params.get("semester") || "";
    const validYear = Number.isInteger(year) && year >= MIN_LEGACY_YEAR &&
      year <= Math.min(new Date().getFullYear(), LEGACY_CUTOVER_YEAR);
    const validSemester = Object.hasOwn(SEMESTER_LABELS, semester);
    return validYear && validSemester ? { year, semester } : defaultTerm;
  };

  const currentTermPageUrl = (year, semester) => {
    const url = new URL("https://plato.pusan.ac.kr/local/ubion/allcourse/regular/index.php");
    const language = new URL(location.href).searchParams.get("lang");
    if (language) url.searchParams.set("lang", language);
    url.searchParams.set("year", String(year));
    url.searchParams.set("semester", String(semester));
    return url;
  };

  const allCoursesPageUrl = () =>
    new URL("https://plato.pusan.ac.kr/local/ubion/allcourse/regular/index.php");

  if (/^\/my(?:\/|$)/.test(location.pathname) &&
    new URLSearchParams(location.search).get(VIEW_PARAM) === PAST_COURSES_VIEW) {
    const term = pastTermFromLocation();
    location.replace(currentTermPageUrl(term.year, term.semester).href);
    return;
  }

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

  const makeGearIcon = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<circle cx="12" cy="12" r="3"/>' +
      '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.57V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.04-1.57 1.7 1.7 0 0 0-1.87.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.57-1.04H3a2 2 0 1 1 0-4h.03A1.7 1.7 0 0 0 4.6 8.92a1.7 1.7 0 0 0-.34-1.87l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.87.34A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.03a1.7 1.7 0 0 0 1.04 1.57 1.7 1.7 0 0 0 1.87-.34l.05-.05A2 2 0 1 1 19.79 7l-.05.05a1.7 1.7 0 0 0-.34 1.87A1.7 1.7 0 0 0 21 9.96h.03a2 2 0 1 1 0 4H21A1.7 1.7 0 0 0 19.4 15Z"/>';
    return svg;
  };

  const currentSource = () =>
    document.querySelector(`.${SOURCE_CLASS}`) ||
    document.querySelector("#page-wrapper") ||
    document.querySelector("#page");

  const findText = (selectors, root = currentSource() || document) => {
    for (const selector of selectors) {
      const value = normalize(root?.querySelector(selector)?.textContent);
      if (value) return value;
    }
    return "";
  };

  const findHref = (selectors, fallback, root = currentSource() || document) => {
    for (const selector of selectors) {
      const value = root?.querySelector(selector)?.href;
      if (value) return value;
    }
    return fallback;
  };

  const courseContainers = (root) => {
    const selectors = [
      "[data-region='course-content']",
      ".course-summaryitem",
      ".course-listitem",
      ".dashboard-card-deck .card",
      ".block_myoverview .card",
      ".course-card"
    ];

    const preferred = selectors.flatMap((selector) => all(selector, root));
    if (preferred.length) return preferred;

    return all("a[href*='/course/view.php']", root).map(
      (link) => link.closest("li, article, .card, .row") || link
    );
  };

  const readCourseContext = (container) => {
    const semester = container.querySelector(".course-semester");
    const lines = semester
      ? all("p", semester).map((node) => normalize(node.textContent)).filter(Boolean)
      : [];
    const primary = lines[0] || findText(
      [".semester-name", ".course-semester", "[data-region='course-info']"],
      container
    );
    const year = primary.match(/(?:19|20)\d{2}년?/)?.[0] || "";
    const term = primary.match(/(?:1|2)학기|여름계절수업|겨울계절수업|여름도약수업|겨울도약수업/)?.[0] || "";
    const courseType = primary.match(/교과과정|자율강좌|지정강좌|교수[·ㆍ\s]?학습/)?.[0] || "";
    const level = lines[1] || "";
    return {
      term: [year, term].filter(Boolean).join(" · ") || primary,
      courseType,
      level
    };
  };

  const readCourses = () => {
    const root = currentSource();
    if (!root) return [];

    const courseRoot = root.querySelector(".ongoing-courses, [data-region='myoverview'], .block_myoverview") || root;

    const entries = courseContainers(courseRoot).map((container) => {
      const link = container.matches?.("a[href]")
        ? container
        : container.querySelector("a[href*='/course/view.php']");
      if (!link) return null;
      const href = safeCurrentCourseHref(link.href);
      if (!href) return null;

      const titleNode = container.querySelector(
        "[data-region='course-name'], .coursename, .course-title, h3, h4, h5"
      );
      const title = normalize(titleNode?.textContent || link.textContent);
      if (!title) return null;

      const professor = cleanProfessorName(findText(
        [
          ".professors .text-truncate",
          ".professors [class*='name']",
          ".professors",
          ".prof",
          ".teacher",
          "[data-region='course-teacher']",
          ".text-muted"
        ],
        container
      ));
      const context = readCourseContext(container);
      const thumbnail = container.querySelector(".course-thumbnail, img");
      const thumbnailBackground = thumbnail?.style?.backgroundImage
        ?.match(/url\(["']?(.*?)["']?\)/)?.[1] || "";
      let courseId = "";
      try {
        courseId = new URL(link.href).searchParams.get("id") || "";
      } catch (_) {
        // Keep the course usable even if a theme emits a non-standard URL.
      }

      return {
        href,
        title,
        professor,
        ...context,
        courseId,
        thumbnail: thumbnail?.currentSrc || thumbnail?.src || thumbnailBackground
      };
    }).filter(Boolean);

    return uniqueBy(entries, (entry) => entry.href).slice(0, 60);
  };

  const readBoardItems = (selector) => {
    const root = currentSource();
    if (!root) return [];

    const region = root.querySelector(selector);
    if (!region) return [];
    const links = all("a[href*='/mod/ubboard/article.php']", region).map((link) => {
      const container = link.closest("li, tr, article, .row, .card") || link.parentElement;
      const explicitDate = findText([
        ".csms-board-item-date",
        ".notice-date",
        ".date",
        "[data-region='date']",
        "time"
      ], container);
      const fallbackDate = normalize(container?.textContent).match(/(?:19|20)\d{2}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}일?/)?.[0] || "";
      const date = formatNoticeDate(explicitDate || fallbackDate);
      return { href: link.href, title: normalize(link.textContent), date };
    }).filter((item) => item.title);

    return uniqueBy(links, (item) => item.href).slice(0, 5);
  };

  const readNotices = () => readBoardItems(".announcement-item-site, .open-notice-card, [data-region='site-notices']");
  const readClassroomNews = () => readBoardItems(".announcement-item-course, [data-region='course-notices']");

  const readUpcoming = () => {
    const root = currentSource();
    if (!root) return [];

    const preferred = all(".current-activity .accordion-collapse[data-courseid] a[href]", root);
    const selectors = [
      ".current-activity .activity-item a[href]",
      "[data-region='event-list-content'] a[href]",
      ".block_calendar_upcoming a[href]",
      ".upcoming-events a[href]"
    ];
    const links = preferred.length ? preferred : selectors.flatMap((selector) => all(selector, root));
    return uniqueBy(
      links.map((link) => {
        if (link.matches("[data-toggle], [data-bs-toggle], .btn-collapse, .btn-collapse-accordion")) return null;
        const row = link.closest("li, article, .activity-item, .media, .row") || link.parentElement;
        const title = normalize(
          row?.querySelector(".activity-name, .event-name, [data-region='event-name']")?.textContent || link.textContent
        );
        const period = findText([".period", ".activity-dates", "time", "[data-region='event-time']"], row);
        const course = findText([".course-name", ".coursename", "[data-region='course-name']"], row);
        let href = "";
        try {
          const url = new URL(link.href, location.origin);
          const unsafeQuery = ["sesskey", "confirm", "delete", "action"].some((name) => url.searchParams.has(name));
          if (url.origin === location.origin && url.protocol === "https:" && !unsafeQuery &&
            !/\/(?:action|logout)\.php$/i.test(url.pathname)) href = url.href;
        } catch {
          // Ignore controls and malformed navigation targets.
        }
        return href && title ? { href, title, period, course } : null;
      }).filter(Boolean),
      (item) => item.href
    ).slice(0, 5);
  };

  const readUserIdentity = (root = document) => {
    const text = (selector) => normalize(root.querySelector(selector)?.textContent);
    const time = text(".user-lastaccess .ul-item:first-child span");
    const ip = text(".user-lastaccess .ul-item:nth-child(2) span");
    const prompt = text(".prompt-text[data-aihub='keyword']");
    const promptName = prompt.match(/안녕하세요,\s*(.+?)님/)?.[1] || "";
    const name = text("[data-region='user-menu'] .usertext") ||
      text(".usermenu .usertext") ||
      text(".userbutton .usertext") ||
      promptName;
    const initial = text(".btn-user-setting .csms-avata-picture") || name.slice(0, 1);
    const picture = root.querySelector(".btn-user-setting img, [data-region='user-menu'] img.userpicture")?.src || "";
    return { time, ip, name, initial, picture };
  };

  const applyUserIdentity = (header, identity) => {
    if (!header || !identity) return;
    const access = header.querySelector(".nav-item-userinfo-iptime");
    if (access && (identity.time || identity.ip)) {
      access.textContent = [
        identity.time && `최종 접속시간 : ${identity.time}`,
        identity.ip && `최종 접속IP : ${identity.ip}`
      ].filter(Boolean).join(" / ");
      access.hidden = false;
    }
    const fullname = header.querySelector(".fullname");
    if (fullname && identity.name) {
      fullname.textContent = identity.name;
      fullname.title = identity.name;
    }
    const badge = header.querySelector(".picture-badge");
    if (badge) {
      if (identity.picture) {
        const image = document.createElement("img");
        image.src = identity.picture;
        image.alt = identity.name ? `${identity.name} 사진` : "사용자 사진";
        image.className = "userpicture";
        badge.replaceChildren(image);
    } else {
      const image = document.createElement("img");
      image.src = chrome.runtime.getURL("assets/icons/default-user.svg");
      image.alt = "기본 사용자 사진";
      image.className = "userpicture userpicture-default";
      badge.replaceChildren(image);
      }
    }
  };

  const hydrateUserIdentity = async (header, root) => {
    let identity = readUserIdentity(root);
    applyUserIdentity(header, identity);
    if (identity.time && identity.ip && identity.name) return;
    try {
      const response = await fetch("https://plato.pusan.ac.kr/", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      identity = { ...identity, ...Object.fromEntries(
        Object.entries(readUserIdentity(page)).filter(([, value]) => value)
      ) };
      applyUserIdentity(header, identity);
    } catch (_) {
      // The visible page remains usable when the optional identity refresh fails.
    }
  };

  const makeFrontHeader = (title, actions = []) => {
    const header = element("div", "front-box-header");
    header.append(element("h4", "title", title));
    if (actions.length) {
      const action = element("div", "action");
      actions.forEach((item) => action.append(
        item instanceof Node
          ? item
          : anchor(item.label, item.href, item.className || "btn btn-default")
      ));
      header.append(action);
    }
    return header;
  };

  const makePageHeader = () => {
    const header = element("header", "headroom fixed-top");
    header.id = "plato-classic-page-header";

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

    const usermenu = element("div", "usermenu");
    const usernav = element("ul", "nav nav-pills nav-user");
    usernav.setAttribute("role", "list");
    const identity = readUserIdentity(currentSource() || document);
    const accessItem = element("li", "nav-item nav-item-userinfo nav-item-userinfo-iptime");
    accessItem.hidden = !(identity.time || identity.ip);
    const userItem = element("li", "nav-item nav-item-userinfo");
    const userButton = element("button", "btn-nobtn btn-userinfo");
    userButton.type = "button";
    userButton.setAttribute("aria-haspopup", "dialog");
    userButton.setAttribute("aria-expanded", "false");
    const pictureBadge = element("span", "picture-badge");
    userButton.append(
      element("span", "fullname", identity.name || "PLATO 사용자"),
      pictureBadge
    );
    userItem.append(userButton);
    usernav.append(accessItem, userItem);
    applyUserIdentity(header, identity);

    const logoutHref = findHref(
      ["a[href*='/login/logout.php']"],
      "https://plato.pusan.ac.kr/login/logout.php"
    );
    const logoutItem = element("li", "nav-item nav-item-loginout");
    logoutItem.append(anchor("로그아웃", logoutHref, "btn btn-sm btn-loginout"));
    usernav.append(logoutItem);
    usermenu.append(usernav);
    utility.append(family, usermenu);

    const pageMenu = element("div", "page-menu navbar navbar-dark");
    const logo = anchor("", "https://plato.pusan.ac.kr/", "logo-link");
    logo.setAttribute("aria-label", "부산대학교 스마트 교육플랫폼 PLATO");
    const logoImage = document.createElement("img");
    logoImage.src = chrome.runtime.getURL("assets/icons/plato-logo.png");
    logoImage.alt = "부산대학교 스마트 교육플랫폼 PLATO";
    logo.append(logoImage);
    const logoBox = element("div", "logo");
    logoBox.append(logo);

    const menuBox = element("div", "site-menus");
    const menuList = element("ul", "menu-list");
    [
      ["교과과정", "https://plato.pusan.ac.kr/local/ubion/allcourse/regular/index.php", "curriculum"],
      ["자율강좌", "https://plato.pusan.ac.kr/local/ubeclass/my.php", "community"],
      ["지정강좌", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=1", "designated"],
      ["교수·학습", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=2", "teaching"],
      ["메시지", "https://plato.pusan.ac.kr/local/talk/index.php", "message"]
    ].forEach(([label, href, iconType]) => {
      const item = element("li", "menu-item");
      if (iconType === "message") item.classList.add("menu-item-message");
      item.title = label;
      const menuLink = anchor("", href, "site-menu-link nosubmenu");
      menuLink.append(makeMenuIcon(iconType), element("span", "menu-name", label));
      item.append(menuLink);
      menuList.append(item);
    });
    menuBox.append(menuList);

    pageMenu.append(logoBox, menuBox);
    header.append(utility, pageMenu);
    return header;
  };

  const makeCourseBox = () => {
    const box = element("section", "front-box front-box-course");
    box.dataset.classicRegion = "courses";
    const pastCoursesLink = anchor(
      "과거강좌조회",
      allCoursesPageUrl().href,
      "btn btn-default classic-past-courses-link"
    );
    const courseSettingsLink = anchor(
      "",
      "https://plato.pusan.ac.kr/local/ubion/user/mycourse_setting.php",
      "btn btn-default classic-course-settings"
    );
    courseSettingsLink.title = "강좌 순서 조정";
    courseSettingsLink.setAttribute("aria-label", "강좌 순서 조정");
    courseSettingsLink.append(makeGearIcon());
    box.append(makeFrontHeader("나의 강좌", [
      pastCoursesLink,
      {
        label: "조교/청강신청",
        href: "https://plato.pusan.ac.kr/local/ubassistant/index.php",
        className: "btn btn-default"
      },
      courseSettingsLink
    ]));
    const body = element("div", "front-box-body course_lists");
    body.append(element("ul", "my-course-lists coursemos-layout-0"));
    box.append(body);
    return box;
  };

  const makeCourseNoticeBox = () => {
    const box = element("section", "front-box front-box-notice");
    box.dataset.classicRegion = "course-notices";
    box.append(makeFrontHeader("교과목 공지"));
    const body = element("div", "front-box-body");
    body.append(element("ul", "notices"));
    box.append(body);
    return box;
  };

  const showcaseDefinitions = [
    {
      key: "teaching",
      title: "교수·학습",
      selector: ".front-box-teaching",
      href: "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=2",
      currentType: "teaching",
      legacyPath: "/local/ubteaching/",
      legacyLabels: ["교수학습", "teachinglearning"]
    },
    {
      key: "pmooc",
      title: "지정강좌",
      selector: ".front-box-pmooc",
      href: "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=1",
      currentType: "designated",
      legacyPath: "/local/ubonline/",
      legacyLabels: ["지정강좌", "noncurriculum"]
    },
    {
      key: "eclass",
      title: "자율강좌",
      selector: ".front-box-eclass",
      href: "https://plato.pusan.ac.kr/local/ubeclass/my.php",
      legacyPath: "/local/ubeclass/",
      legacyLabels: ["자율강좌", "eclass"]
    }
  ];

  const makeShowcaseSection = ({ key, title, href }) => {
    const box = element("section", `front-box front-box-latest front-box-${key}`);
    box.dataset.classicRegion = `latest-${key}`;
    const previous = element("button", "btn btn-default btn-action btn-action-lt", "‹");
    previous.type = "button";
    previous.setAttribute("aria-label", `${title} 이전 강좌`);
    const next = element("button", "btn btn-default btn-action btn-action-gt", "›");
    next.type = "button";
    next.setAttribute("aria-label", `${title} 다음 강좌`);
    const more = {
      label: "+",
      href,
      className: "btn btn-default btn-action btn-action-more"
    };
    box.append(makeFrontHeader(title, [previous, next, more]));
    const body = element("div", "front-box-body");
    const strip = element("div", "course-latest classic-course-strip");
    strip.setAttribute("aria-live", "polite");
    strip.setAttribute("aria-busy", "true");
    strip.append(element("div", "classic-latest-empty", "강좌 정보를 불러오는 중입니다."));
    body.append(strip);
    box.append(body);
    previous.addEventListener("click", () => strip.scrollBy({ left: -strip.clientWidth, behavior: "smooth" }));
    next.addEventListener("click", () => strip.scrollBy({ left: strip.clientWidth, behavior: "smooth" }));
    return box;
  };

  const readLegacyShowcase = (legacyDocument, definition) => {
    const section = all(".course-latest", legacyDocument).find((candidate) => {
      const title = normalize(candidate.querySelector(".latest-title, h3")?.textContent)
        .toLowerCase().replace(/[\s·ㆍ-]/g, "");
      const rawHref = candidate.querySelector(".latest-title a[href]")?.getAttribute("href") || "";
      let path = "";
      try {
        path = new URL(rawHref, "https://dev-plato.pusan.ac.kr/").pathname;
      } catch {
        // Fall back to the localized section title.
      }
      return path.startsWith(definition.legacyPath) ||
        definition.legacyLabels.some((label) => title.includes(label));
    });
    if (!section) return [];
    return uniqueBy(
    all(".swiper-slide-course a[href]", section).map((link) => {
      const categories = all(".course-category", link)
        .map((node) => normalize(node.textContent))
        .filter(Boolean);
      const image = link.querySelector(".course-image img, img");
      const rawImage = image?.getAttribute("src") || "";
      return {
        href: safeShowcaseHref(link.getAttribute("href") || "", "https://dev-plato.pusan.ac.kr/"),
        title: normalize(link.querySelector(".course-name")?.textContent || link.textContent),
        image: rawImage ? new URL(rawImage, "https://dev-plato.pusan.ac.kr/").href : "",
        categories,
        classify: normalize(link.querySelector(".course-classify")?.textContent),
        periodLabel: normalize(link.querySelector(".course-period-label")?.textContent),
        period: normalize(link.querySelector(".course-period")?.textContent)
      };
    }).filter((course) => course.href && course.title),
    (course) => course.href
    ).slice(0, 12);
  };

  const readCurrentShowcase = (currentDocument, definition) => {
    if (!currentDocument || !definition.currentType) return [];
    return uniqueBy(
      all(".open-course-list a.course-card[href]", currentDocument).map((link) => {
        const typeText = normalize(link.querySelector(".course-info-tags")?.textContent)
          .toLowerCase().replace(/[\s·ㆍ-]/g, "");
        const isTeaching = /교수학습|teachinglearning/.test(typeText);
        const isDesignated = /지정강좌|noncurriculum|designated/.test(typeText);
        if ((definition.currentType === "teaching" && !isTeaching) ||
          (definition.currentType === "designated" && !isDesignated)) return null;

        const thumbnail = link.querySelector(".course-thumbnail, img");
        const background = thumbnail?.style?.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1];
        const rawImage = thumbnail?.getAttribute("src") || background || "";
        const categories = [
          normalize(link.querySelector(".course-semester")?.textContent),
          normalize(link.querySelector(".course-info-tags")?.textContent)
        ].filter(Boolean);
        const metrics = all(".course-info-section-item", link)
          .map((node) => normalize(node.textContent))
          .filter(Boolean);
        return {
          href: safeShowcaseHref(link.getAttribute("href") || "", "https://plato.pusan.ac.kr/"),
          title: normalize(link.querySelector("h4, h5, .course-name")?.textContent || link.textContent),
          image: rawImage ? new URL(rawImage, "https://plato.pusan.ac.kr/").href : "",
          categories,
          classify: normalize(link.querySelector(".course-status")?.textContent),
          periodLabel: metrics[0] || "",
          period: metrics.slice(1).join(" · ")
        };
      }).filter((course) => course?.href && course.title),
      (course) => course.href
    ).slice(0, 12);
  };

  const renderShowcase = (key, courses) => {
    const strip = classicRoot.querySelector(
      `#${SHELL_ID} [data-classic-region='latest-${key}'] .classic-course-strip`
    );
    if (!strip) return;
    strip.setAttribute("aria-busy", "false");
    strip.replaceChildren();
    if (!courses.length) {
      strip.append(element("div", "classic-latest-empty", "등록된 강좌를 불러오지 못했습니다."));
      return;
    }
    courses.forEach((course) => {
      const item = element("article", "swiper-slide-course classic-latest-course");
      const link = anchor("", course.href);
      const imageBox = element("div", "course-image");
      if (course.image) {
        const image = document.createElement("img");
        image.src = course.image;
        image.alt = "";
        image.loading = "lazy";
        imageBox.append(image);
      } else {
        imageBox.append(element("span", "course-image-placeholder", "PLATO"));
      }
      const body = element("div", "course-body");
      const category = element("div", "course-categories");
      course.categories.slice(0, 2).forEach((text) => category.append(element("span", "course-category", text)));
      body.append(category, element("div", "course-name", course.title));
      if (course.classify) body.append(element("div", "course-classify", course.classify));
      const footer = element("div", "course-footer");
      if (course.periodLabel) footer.append(element("span", "course-period-label", course.periodLabel));
      if (course.period) footer.append(element("span", "course-period", course.period));
      link.append(imageBox, body);
      if (footer.childElementCount) link.append(footer);
      item.append(link);
      strip.append(item);
    });
  };

  const requestLegacyShowcaseDocument = () => new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "platoClassic.fetchLegacyCourses" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok || !response.html) {
        resolve(null);
        return;
      }
      resolve(new DOMParser().parseFromString(response.html, "text/html"));
    });
  });

  const requestCurrentPublicHome = async () => {
    try {
      const response = await fetch("https://plato.pusan.ac.kr/", {
        method: "GET",
        credentials: "omit",
        cache: "no-store"
      });
      if (!response.ok) return null;
      return new DOMParser().parseFromString(await response.text(), "text/html");
    } catch {
      return null;
    }
  };

  const hydrateLegacyShowcases = async () => {
    const [currentDocument, legacyDocument] = await Promise.all([
      requestCurrentPublicHome(),
      requestLegacyShowcaseDocument()
    ]);
    showcaseDefinitions.forEach((definition) => {
      const currentCourses = readCurrentShowcase(currentDocument, definition);
      const legacyCourses = legacyDocument ? readLegacyShowcase(legacyDocument, definition) : [];
      const merged = uniqueBy(
        [...currentCourses, ...legacyCourses],
        (course) => normalize(course.title).toLowerCase()
      ).slice(0, 12);
      renderShowcase(definition.key, merged);
    });
  };

  const makeServices = () => {
    const box = element("section", "front-box front-box-services");
    box.append(makeFrontHeader("PLATO 서비스"));
    const row = element("div", "row-card");
    const serviceIcons = {
      "card-list-pnuon": "community",
      "card-list-video": "teaching",
      "card-list-translation": "community",
      "card-list-seri": "designated",
      "card-list-kmooc": "curriculum",
      "card-list-ppt": "teaching"
    };
    [
      ["PNU ON", "https://plato.pusan.ac.kr/local/opencontent/index.php", "card-list-pnuon"],
      ["실시간 화상강의", "https://zoom.us/test", "card-list-video"],
      ["실시간 통번역", "https://sconchat.sconai.com/admin/login/customer", "card-list-translation"],
      ["KOCW", "https://www.kocw.net/home/index.do", "card-list-seri"],
      ["K-MOOC", "https://www.kmooc.kr/view/course/institution/pnuk", "card-list-kmooc"],
      ["AI코스웨어", "https://plato.pusan.ac.kr/pulleycampus.php", "card-list-ppt"]
    ].forEach(([label, href, type]) => {
      const item = element("div", "service-column");
      const service = anchor("", href, `card-list ${type}`);
      service.target = "_blank";
      service.rel = "noopener noreferrer";
      const icon = makeMenuIcon(serviceIcons[type]);
      icon.classList.add("service-icon");
      service.append(icon, element("span", "text", label));
      item.append(service);
      row.append(item);
    });
    box.append(row);
    return box;
  };

  const makeSidebar = () => {
    const aside = element("aside", "col-block");

    const upcoming = element("section", "front-box");
    upcoming.dataset.classicRegion = "upcoming";
    upcoming.append(makeFrontHeader("예정된 할일"));
    const upcomingBody = element("div", "front-box-body");
    upcomingBody.append(element("ul", "upcommings"));
    upcoming.append(upcomingBody);

    const notice = element("section", "front-box");
    notice.dataset.classicRegion = "site-notices";
    notice.append(makeFrontHeader("공지사항", [{
      label: "+",
      href: "https://plato.pusan.ac.kr/mod/ubboard/view.php?id=2624",
      className: "btn btn-action btn-action-more"
    }]));
    const noticeBody = element("div", "front-box-body");
    noticeBody.append(element("ul", "notices"));
    notice.append(noticeBody);

    const manual = element("section", "site-manual");
    const manualLink = anchor("", "https://plato.pusan.ac.kr/local/ubmanual/");
    manualLink.append(
      element("h6", "", "PLATO 이용 매뉴얼"),
      element("p", "", "PLATO 사용자를 위한 가이드 및 다양한 매뉴얼을 제공합니다.")
    );
    manual.append(manualLink);

    const help = element("section", "itl-info");
    help.append(
      element("h5", "title", "PLATO 사용문의"),
      element("div", "tell", "051-510-2000"),
      element("div", "name", "헬프데스크"),
      anchor("plato@pusan.ac.kr", "mailto:plato@pusan.ac.kr", "itl-info-email")
    );

    const kocw = element("section", "site-kocw");
    const kocwLink = anchor("", "https://www.kocw.net/home/index.do");
    kocwLink.target = "_blank";
    kocwLink.rel = "noopener noreferrer";
    kocwLink.append(
      element("h5", "title", "KOCW (Korea OpenCourseWare)"),
      element("div", "site-kocw-desc", "KOCW는 국내외 대학 및 기관에서 자발적으로 공개한 강의 동영상과 강의자료를 무료로 제공하는 서비스 플랫폼입니다.")
    );
    const kocwContact = element("div", "site-kocw-contact");
    const phone = element("p", "");
    phone.append(element("strong", "", "사용문의"), document.createTextNode("051-510-3843"));
    const email = element("p", "");
    email.append(
      element("strong", "", "에듀테크센터"),
      anchor("pnucde@pusan.ac.kr", "mailto:pnucde@pusan.ac.kr")
    );
    kocwContact.append(phone, email);
    kocw.append(kocwLink, kocwContact);

    const aiHub = element("section", "site-ai");
    const aiHubLink = anchor("", "https://plato.pusan.ac.kr/local/aihub/index.php");
    aiHubLink.append(
      element("h5", "title", "PLATO 서비스"),
      element("p", "", "산지니 AI 서비스를 이용할 수 있습니다.")
    );
    aiHub.append(aiHubLink);

    aside.append(upcoming, notice, manual, help, kocw, aiHub);
    return aside;
  };

  const makeFooter = () => {
    const footer = element("footer", "");
    footer.id = "plato-classic-page-footer";
    const container = element("div", "footer-container");
    const flex = element("div", "footer-flex");
    const privacy = element("div", "privacy-address");
    privacy.append(
      anchor(
        "개인정보처리방침",
        "https://www.pusan.ac.kr/kor/CMS/Board/Board.do?mCode=MN186",
        "strong"
      ),
      element("div", "address", "(46241) 부산광역시 금정구 부산대학로63번길 2 (장전동) 부산대학교 · Tel 051-510-2000"),
      element("div", "copyright", "COPYRIGHTⒸ Pusan National University")
    );
    flex.append(privacy);
    container.append(flex);
    footer.append(container);
    return footer;
  };

  const renderCourses = (courses) => {
    const list = classicRoot.querySelector(`#${SHELL_ID} [data-classic-region='courses'] .my-course-lists`);
    if (!list) return;
    list.replaceChildren();

    if (!courses.length) {
      list.append(element("li", "nocourse", "참여중인 강좌가 없습니다."));
      return;
    }

    courses.forEach((course) => {
      const item = element("li", "course-item");
      const courseBox = element("div", "course-box");
      const courseLink = anchor("", course.href, "course-link");
      const courseName = element("div", "course-name");
      const label = element("div", "course-label");
      const badge = element("span", "badge-course");
      const courseTypeLabels = {
        "교과과정": "교과",
        "자율강좌": "자율",
        "지정강좌": "지정",
        "교수·학습": "교수학습",
        "교수학습": "교수학습"
      };
      badge.append(
        element("span", "badge-course-primary", courseTypeLabels[course.courseType] || course.courseType || "교과"),
        element("span", "badge-course-secondary", course.level || "구분 없음")
      );
      label.append(badge);
      const title = element("div", "course-title");
      title.append(element("h3", "", course.title));
      if (course.professor) {
        const professor = element("span", "professor-name", course.professor);
        professor.title = `교수 ${course.professor}`;
        title.append(professor);
      }
      courseName.append(label, title);
      courseLink.append(courseName);
      courseBox.append(courseLink);
      item.append(courseBox);
      list.append(item);
    });
  };

  const renderNoticeList = (selector, notices, emptyText) => {
    const list = classicRoot.querySelector(`#${SHELL_ID} ${selector}`);
    if (!list) return;
    list.replaceChildren();
    if (!notices.length) {
      list.append(element("li", "notice-item notice-noitem", emptyText));
      return;
    }
    notices.forEach((notice) => {
      const item = element("li", "notice-item");
      const noticeLink = anchor("", notice.href);
      noticeLink.append(element("div", "subject", notice.title));
      if (notice.date) noticeLink.append(element("span", "date", notice.date));
      item.append(noticeLink);
      list.append(item);
    });
  };

  const renderUpcoming = (items) => {
    const list = classicRoot.querySelector(`#${SHELL_ID} [data-classic-region='upcoming'] .upcommings`);
    if (!list) return;
    list.replaceChildren();
    if (!items.length) {
      list.append(element("li", "", "이번 주 예정된 학습활동이 없습니다."));
      return;
    }
    items.forEach((item) => {
      const listItem = element("li", "upcomming-item");
      const link = anchor("", item.href, "upcomming-link");
      const icon = element("span", "icon");
      icon.setAttribute("aria-hidden", "true");
      const body = element("span", "media-body");
      body.append(element("span", "activity-name", item.title));
      if (item.period) body.append(element("span", "period", item.period));
      if (item.course && item.course !== item.title) body.append(element("span", "course-name", item.course));
      link.append(icon, body);
      listItem.append(link);
      list.append(listItem);
    });
  };

  let previousSignature = "";
  const refresh = () => {
    const courses = readCourses();
    const notices = readNotices();
    const classroomNews = readClassroomNews();
    const upcoming = readUpcoming();
    const signature = JSON.stringify({ courses, notices, classroomNews, upcoming });
    if (signature === previousSignature) return;
    previousSignature = signature;

    chrome.runtime.sendMessage({
      type: "platoClassic.setCourseCache",
      cache: {
        updatedAt: Date.now(),
        courses: courses.map(({ courseId, href, title, professor, term, courseType, level }) => ({
          courseId,
          href,
          title,
          professor,
          term,
          courseType,
          level
        }))
      }
    }, () => void chrome.runtime.lastError);

    renderCourses(courses);
    renderNoticeList("[data-classic-region='course-notices'] .notices", classroomNews, "등록된 교과목 공지가 없습니다.");
    renderNoticeList("[data-classic-region='site-notices'] .notices", notices, "등록된 게시글이 없습니다.");
    renderUpcoming(upcoming);
  };

  const install = () => {
    if (document.getElementById(HOST_ID)) return;
    const source = currentSource();
    if (!source) return;
    source.classList.add(SOURCE_CLASS);

    const host = element("div", "");
    host.id = HOST_ID;
    host.hidden = true;
    const shadow = host.attachShadow({ mode: "open" });
    classicRoot = shadow;

    const stylesheetReady = ["styles/dashboard.css", "styles/auth-shell.css"].map((path) => {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = chrome.runtime.getURL(path);
      const ready = new Promise((resolve) => {
        stylesheet.addEventListener("load", resolve, { once: true });
        stylesheet.addEventListener("error", resolve, { once: true });
      });
      shadow.append(stylesheet);
      return ready;
    });

    const shell = element("div", "");
    shell.id = SHELL_ID;
    const page = element("div", "");
    page.id = "plato-classic-page";
    const pageHeader = makePageHeader();
    page.append(pageHeader);

    const container = element("div", "row no-gutters");
    container.id = "plato-classic-page-container";
    const content = element("main", "col-content");
    content.id = "plato-classic-page-content";
    const homeView = element("div", "classic-dashboard-home-view");
    homeView.dataset.classicView = "home";
    homeView.append(
      makeCourseBox(),
      makeCourseNoticeBox(),
      ...showcaseDefinitions.map(makeShowcaseSection),
      makeServices()
    );
    const sidebar = makeSidebar();
    content.append(homeView);
    container.append(content, sidebar);
    page.append(container, makeFooter());
    shell.append(page);
    shadow.append(shell);
    source.before(host);
    refresh();

    let requestedEnabled = false;
    let hydrationStarted = false;
    const applySettings = (settings) => {
      const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
      requestedEnabled = enabled;
      if (!enabled) {
        host.hidden = true;
        document.documentElement.classList.remove(ACTIVE_CLASS);
        document.dispatchEvent(new CustomEvent("plato-classic-ready"));
        return;
      }
      if (!hydrationStarted) {
        hydrationStarted = true;
        hydrateUserIdentity(pageHeader, source);
        hydrateLegacyShowcases();
      }
      Promise.all(stylesheetReady).then(() => {
        if (!requestedEnabled) return;
        host.hidden = false;
        document.documentElement.classList.add(ACTIVE_CLASS);
        document.dispatchEvent(new CustomEvent("plato-classic-ready"));
      });
    };

    const settingDefaults = { classicEnabled: true, dashboardEnabled: true };
    chrome.storage.local.get(settingDefaults, applySettings);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes.classicEnabled && !changes.dashboardEnabled) return;
      chrome.storage.local.get(settingDefaults, applySettings);
    });

    let timer;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150);
    });
    observer.observe(source, { childList: true, subtree: true, characterData: true });
  };

  install();
})();
