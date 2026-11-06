(() => {
  "use strict";

  if (!document.body?.matches("#page-course-view-ubsweeks")) return;

  const ACTIVE_CLASS = "plato-classic-course-active";
  const start = () => {

  const normalize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("ko");

  const pageUrl = new URL(location.href);
  const courseId = pageUrl.searchParams.get("id");
  const isDashboard = pageUrl.searchParams.get("mode") === "dashboard";

  const icon = (name) => {
    const icons = {
      notice: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 10.25v3.5h3l7 3.5V6.75l-7 3.5zM14.5 9h2.25a2.25 2.25 0 0 1 0 4.5H14.5M7.25 13.75l1.25 4.5h3" />
        </svg>`,
      qna: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.25 5.25h15.5v11.5H10l-4.25 3v-3h-1.5z" />
          <path d="M9.25 9.25a2.75 2.75 0 0 1 5.2 1.25c0 1.75-2.45 1.9-2.45 3.25M12 15.3v.2" />
        </svg>`,
      board: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4.75h14v14.5H5zM8.5 8h7.5M8.5 11.5h7.5M8.5 15h5.5" />
          <path d="M7.25 8h.01M7.25 11.5h.01M7.25 15h.01" />
        </svg>`,
      resources: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 6.5h6l1.5 2h7.5v9.75H4.5z" />
          <path d="M4.5 8.5V5.25h6l1.5 1.25" />
        </svg>`,
      attendance: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3.75v3M17 3.75v3M4.5 8.25h15M5.5 5.25h13a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6.25a1 1 0 0 1 1-1z" />
          <path d="m8.5 14 2.25 2.25 4.75-5" />
        </svg>`
    };
    return icons[name] || "";
  };

  const definitions = [
    {
      key: "resources",
      label: "자료실",
      aliases: ["자료실", "강의자료", "학습자료"]
    },
    {
      key: "attendance",
      label: "출석",
      aliases: ["출석현황", "출석 현황", "출석"]
    }
  ];

  const boardPattern = /\/mod\/(?:ubboard|forum|board)\/view\.php$/i;
  const discoverBoardDefinitions = () => {
    const seen = new Set();
    const links = document.querySelectorAll([
      "#pw-nav-menu a[href]",
      "#section-0 .activity.modtype_ubboard a[href]",
      "#section-0 a[href*='/mod/ubboard/view.php']",
      "#section-0 a[href*='/mod/forum/view.php']",
      "#section-0 a[href*='/mod/board/view.php']"
    ].join(","));
    return [...links].flatMap((link) => {
      let url;
      try {
        url = new URL(link.getAttribute("href"), location.origin);
      } catch {
        return [];
      }
      if (url.origin !== location.origin || !boardPattern.test(url.pathname) || seen.has(url.href)) return [];

      const activity = link.closest(".activity[data-for='cmitem'], .activity-wrapper, [data-region='activity-card']");
      const originalLabel = String(
        activity?.querySelector(".activityname")?.textContent ||
        activity?.querySelector("[data-activityname]")?.getAttribute("data-activityname") ||
        activity?.getAttribute("data-activityname") ||
        link.querySelector(".menu-name")?.textContent ||
        link.getAttribute("title") ||
        link.getAttribute("aria-label") ||
        link.textContent ||
        "게시판"
      ).replace(/\s+/g, " ").trim();
      if (!originalLabel) return [];
      seen.add(url.href);

      const normalizedLabel = normalize(originalLabel);
      if (/공지|notice|announcement/.test(normalizedLabel)) {
        return [{ key: "notice", label: "공지사항", source: link }];
      }
      if (/q\s*&\s*a|\bqna\b|질의\s*응답|질문\s*답변/.test(normalizedLabel)) {
        return [{ key: "qna", label: "Q&A", source: link }];
      }
      return [{ key: "board", label: originalLabel, source: link }];
    });
  };

  const findCourseLink = (aliases) => {
    const links = [...document.querySelectorAll(
      "#region-main a[href], #pw-nav-menu a[href]"
    )].filter((link) => !link.closest(
      ".plato-classic-course-overview, .plato-classic-course-notices, .plato-classic-course-switcher-menu, .plato-classic-course-switcher"
    ));

    const exact = links.find((link) => {
      const values = [link.textContent, link.title, link.getAttribute("aria-label")].map(normalize);
      return aliases.some((alias) => values.includes(normalize(alias)));
    });
    if (exact) return exact;

    return links.find((link) => {
      const value = normalize(`${link.textContent} ${link.title} ${link.getAttribute("aria-label")}`);
      return aliases.some((alias) => value.includes(normalize(alias)));
    }) || null;
  };

  const fallbackHref = (key) => {
    if (!courseId) return "";
    if (key === "resources") {
      return `/local/ubion/course/activities.php?id=${encodeURIComponent(courseId)}`;
    }
    if (key === "attendance") {
      return `/local/ubattend/my.php?id=${encodeURIComponent(courseId)}`;
    }
    if (!isDashboard) {
      return `/course/view.php?id=${encodeURIComponent(courseId)}&mode=dashboard`;
    }
    return "";
  };

  const createShortcut = (definition) => {
    // Attendance always targets the official page for the current course ID.
    const source = definition.source || (definition.key === "attendance"
      ? null
      : findCourseLink(definition.aliases));
    const href = source?.href || fallbackHref(definition.key);
    const item = document.createElement("li");
    item.className = `plato-classic-course-shortcut is-${definition.key}`;

    const control = document.createElement(href ? "a" : "span");
    control.className = "plato-classic-course-shortcut-link";
    if (href) control.href = href;
    if (source?.target) control.target = source.target;
    if (source?.rel) control.rel = source.rel;
    if (!source && href) {
      control.dataset.fallback = "dashboard";
      const fallbackTitles = {
        resources: "학습활동 모아보기에서 강의자료를 확인합니다.",
        attendance: "이 강좌의 출석현황을 확인합니다."
      };
      control.title = fallbackTitles[definition.key]
        || "강좌 대시보드에서 해당 메뉴를 확인합니다.";
    }
    if (!href) {
      control.classList.add("is-unavailable");
      control.setAttribute("aria-disabled", "true");
      control.title = "이 강좌에서 제공되는 메뉴를 찾지 못했습니다.";
    }

    const symbol = document.createElement("span");
    symbol.className = "plato-classic-course-shortcut-icon";
    symbol.innerHTML = icon(definition.key);

    const label = document.createElement("strong");
    label.className = "plato-classic-course-shortcut-label";
    label.textContent = definition.label;

    control.append(symbol, label);
    item.append(control);
    return item;
  };

  const renderOverview = () => {
    const dashboard = document.querySelector(".coursemos-course-dashboard");
    if (!dashboard) return;

    let overview = document.querySelector(".plato-classic-course-overview");
    if (!overview) {
      overview = document.createElement("section");
      overview.className = "plato-classic-course-overview";
      overview.setAttribute("aria-labelledby", "plato-classic-course-overview-title");

      const heading = document.createElement("h2");
      heading.id = "plato-classic-course-overview-title";
      heading.textContent = "강의 개요";

      const shortcuts = document.createElement("ul");
      shortcuts.className = "plato-classic-course-shortcuts";
      overview.append(heading, shortcuts);
      dashboard.insertAdjacentElement("afterend", overview);
    }

    const shortcuts = overview.querySelector(".plato-classic-course-shortcuts");
    if (!shortcuts) return;
    const shortcutDefinitions = [...discoverBoardDefinitions(), ...definitions];
    const signature = shortcutDefinitions.map((definition) =>
      `${definition.key}|${definition.label}|${definition.source?.href || fallbackHref(definition.key)}`
    ).join("\n");
    if (shortcuts.dataset.signature === signature) return;
    shortcuts.dataset.signature = signature;
    shortcuts.replaceChildren(...shortcutDefinitions.map(createShortcut));
  };

  // ---- 과목공지 (old PLATO style) -------------------------------------------
  const NOTICE_LIMIT = 5;
  const NOTICE_CLASS = "plato-classic-course-notices";
  let noticeState = { boardHref: "", items: null, loading: false, failed: false };

  const sameOriginUrl = (href) => {
    try {
      const url = new URL(href, location.origin);
      return url.origin === location.origin ? url : null;
    } catch {
      return null;
    }
  };

  const findNoticeBoardHref = () => {
    const more = document.querySelector(
      ".csms-box-announcement .button-container a[href*='/mod/ubboard/view.php']"
    );
    const candidate = more?.getAttribute("href")
      || discoverBoardDefinitions().find((definition) => definition.key === "notice")?.source?.getAttribute("href")
      || "";
    const url = sameOriginUrl(candidate);
    return url && /\/mod\/ubboard\/view\.php$/i.test(url.pathname) ? url.href : "";
  };

  const parseNoticeDate = (text) => {
    const match = String(text || "").match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/);
    if (!match) return { time: 0, label: String(text || "").trim() };
    const [, y, m, d, hh, mm] = match;
    const pad = (value) => String(value).padStart(2, "0");
    const time = new Date(Number(y), Number(m) - 1, Number(d), Number(hh || 0), Number(mm || 0)).getTime();
    const label = `${y}/${pad(m)}/${pad(d)}${hh ? ` ${pad(hh)}:${mm}` : ""}`;
    return { time, label };
  };

  const noticeKey = (href) => {
    const url = sameOriginUrl(href);
    return url?.searchParams.get("bwid") || url?.href || href;
  };

  const toNotice = (link, dateText) => {
    const url = sameOriginUrl(link?.getAttribute("href"));
    if (!url || !/\/mod\/ubboard\/article\.php$/i.test(url.pathname)) return null;
    const subject = String(link.getAttribute("title") || link.textContent || "").replace(/\s+/g, " ").trim();
    if (!subject) return null;
    return { href: url.href, subject, ...parseNoticeDate(dateText) };
  };

  // Items already rendered by PLATO's "강의실 소식" box (usually only 2).
  const readInlineNotices = () => [...document.querySelectorAll(
    ".csms-box-announcement .csms-board-item"
  )].map((item) => toNotice(
    item.querySelector("a[href*='article.php']"),
    item.querySelector(".csms-board-item-date")?.textContent
  )).filter(Boolean);

  // Items parsed from the notice board list page (/mod/ubboard/view.php?id=…).
  const parseBoardNotices = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rows = [...doc.querySelectorAll(
      "#ubboard-list-form .grid-row:not(.grid-row-nodata), .ubboard_container table tbody tr"
    )];
    return rows.map((row) => {
      const link = row.querySelector(".grid-cell-subject a[href*='article.php'], a[href*='article.php']");
      const date = row.querySelector(".grid-cell-date, td.date, .date")?.textContent;
      return toNotice(link, date);
    }).filter(Boolean);
  };

  const pickNotices = (items) => {
    const seen = new Set();
    return items
      .filter((item) => {
        const key = noticeKey(item.href);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.time - a.time)
      .slice(0, NOTICE_LIMIT);
  };

  const loadBoardNotices = async (boardHref) => {
    noticeState.loading = true;
    try {
      const response = await fetch(boardHref, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok || /\/login\//.test(new URL(response.url).pathname)) throw new Error("notice board unavailable");
      const items = parseBoardNotices(await response.text());
      noticeState.items = pickNotices([...items, ...readInlineNotices()]);
    } catch {
      noticeState.failed = true;
    } finally {
      noticeState.loading = false;
      renderNotices();
    }
  };

  // Same markup as the old PLATO course page ("과목공지").
  const buildNoticeBlock = () => {
    const block = document.createElement("div");
    block.className = `${NOTICE_CLASS} course-article row no-gutters`;
    block.innerHTML = `
      <div class="col-12 col-article">
        <div class="course-article-header">
          <h5>과목공지</h5>
          <div class="actions">
            <a class="btn btn-default btn-more" title="과목공지 더보기" aria-label="과목공지 더보기">
              <svg class="fa fa-plus" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1v8M1 5h8" /></svg>
            </a>
          </div>
        </div>
        <div class="course-article-body"><ul class="article-list"></ul></div>
      </div>`;
    return block;
  };

  const renderNotices = () => {
    const overview = document.querySelector(".plato-classic-course-overview");
    if (!overview) return;

    const boardHref = findNoticeBoardHref();
    if (boardHref && boardHref !== noticeState.boardHref) {
      noticeState = { boardHref, items: null, loading: false, failed: false };
    }

    let block = document.querySelector(`.${NOTICE_CLASS}`);
    if (!block) block = buildNoticeBlock();
    if (block.nextElementSibling !== overview) overview.insertAdjacentElement("beforebegin", block);

    const more = block.querySelector(".btn-more");
    if (boardHref) {
      if (more.getAttribute("href") !== boardHref) more.href = boardHref;
    } else {
      more.removeAttribute("href");
    }
    more.hidden = !boardHref;

    if (boardHref && !noticeState.items && !noticeState.loading && !noticeState.failed) {
      loadBoardNotices(boardHref);
    }

    const items = noticeState.items || pickNotices(readInlineNotices());
    const signature = `${noticeState.loading}|${items.map((item) => `${item.href}|${item.subject}|${item.label}`).join("\n")}`;
    const list = block.querySelector(".article-list");
    if (list.dataset.signature === signature) return;
    list.dataset.signature = signature;

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "article-list-item is-empty";
      empty.textContent = noticeState.loading ? "공지사항을 불러오는 중입니다." : "등록된 공지사항이 없습니다.";
      list.replaceChildren(empty);
    } else {
      list.replaceChildren(...items.map((item) => {
        const li = document.createElement("li");
        li.className = "article-list-item";
        const link = document.createElement("a");
        link.href = item.href;
        const subject = document.createElement("div");
        subject.className = "article-subject";
        subject.title = item.subject;
        subject.textContent = item.subject;
        const date = document.createElement("div");
        date.className = "article-date";
        date.textContent = item.label;
        link.append(subject, date);
        li.append(link);
        return li;
      }));
    }
    document.documentElement.classList.add("plato-classic-course-notices-ready");
  };

  const renderAll = () => {
    renderOverview();
    renderNotices();
  };

  let shortcutObserver = null;
  const installShortcutObserver = () => {
    if (shortcutObserver) return;
    const roots = [
      document.querySelector("#pw-nav-menu"),
      document.querySelector("#section-0"),
      document.querySelector("#region-main")
    ].filter((root, index, all) => root && all.indexOf(root) === index);
    if (!roots.length) return;
    let syncTimer = 0;
    shortcutObserver = new MutationObserver(() => {
      clearTimeout(syncTimer);
      syncTimer = window.setTimeout(renderAll, 50);
    });
    roots.forEach((root) => shortcutObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "data-activityname"]
    }));
  };

  const normalizeDashboardProfessorName = () => {
    document.querySelectorAll(".dashboard-header .honor-info").forEach((honor) => {
      const walker = document.createTreeWalker(honor, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        if (!textNode.parentElement?.closest("button, [aria-hidden='true']")) {
          textNode.nodeValue = textNode.nodeValue.replace(/\s*교수님(?=\s|$)/g, "");
        }
        textNode = walker.nextNode();
      }
    });
  };

  const organizeWeeks = () => {
    document.querySelectorAll(".ubsweeks > .course-section").forEach((section) => {
      const activities = section.querySelectorAll(".activity.activity-wrapper");
      const sectionNumber = Number(section.dataset.sectionid || section.dataset.number || 0);
      const title = section.querySelector(".course-section-header .sectionname");
      const period = section.querySelector(".course-section-header .section-period-text");

      section.classList.toggle("is-classic-empty-week", sectionNumber > 0 && activities.length === 0);
      section.classList.toggle("has-classic-activities", activities.length > 0);

      if (title && period && !period.dataset.classicPeriodCleaned) {
        const titleText = title.textContent.replace(/\s+/g, " ").trim();
        const periodText = period.textContent.replace(/\s+/g, " ").trim();
        const cleanedPeriod = periodText.startsWith(titleText)
          ? periodText.slice(titleText.length).trim()
          : periodText;
        period.textContent = cleanedPeriod ? `[${cleanedPeriod}]` : "";
        period.dataset.classicPeriodCleaned = "true";
      }
    });
  };

  const installSidebarScrollGuard = () => {
    const scroller = document.querySelector("#pw-nav-menu .menu-container");
    if (!scroller || scroller.dataset.classicScrollGuard === "true") return;
    scroller.dataset.classicScrollGuard = "true";

    // A wheel tick starts a smooth-scroll animation that keeps firing scroll
    // events for a few hundred ms. Those tail events belong to the user, so the
    // gesture window stays open while they keep arriving.
    const USER_SCROLL_WINDOW = 400;
    const USER_SCROLL_TAIL = 150;

    let acceptedScrollTop = scroller.scrollTop;
    let userScrollUntil = 0;
    let pointerActive = false;
    let restoring = false;
    let restoreFrame = 0;
    let restoreTimer = 0;

    const userScrolling = () => pointerActive || performance.now() < userScrollUntil;

    const captureUserScroll = () => {
      userScrollUntil = performance.now() + USER_SCROLL_WINDOW;
    };

    const restoreAcceptedScroll = () => {
      if (userScrolling()) return;
      cancelAnimationFrame(restoreFrame);
      restoreFrame = requestAnimationFrame(() => {
        if (userScrolling()) return;
        if (Math.abs(scroller.scrollTop - acceptedScrollTop) < 1) return;
        restoring = true;
        scroller.scrollTo({ top: acceptedScrollTop, behavior: "auto" });
        requestAnimationFrame(() => {
          restoring = false;
        });
      });
    };

    scroller.addEventListener("wheel", captureUserScroll, {
      capture: true,
      passive: true
    });
    scroller.addEventListener("touchstart", captureUserScroll, {
      capture: true,
      passive: true
    });
    scroller.addEventListener("touchmove", captureUserScroll, {
      capture: true,
      passive: true
    });
    scroller.addEventListener("pointerdown", () => {
      pointerActive = true;
    }, true);
    scroller.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        return;
      }
      captureUserScroll();
    }, true);

    const finishPointerGesture = () => {
      if (!pointerActive) return;
      acceptedScrollTop = scroller.scrollTop;
      pointerActive = false;
      captureUserScroll();
    };
    window.addEventListener("pointerup", finishPointerGesture, true);
    window.addEventListener("pointercancel", finishPointerGesture, true);
    window.addEventListener("blur", finishPointerGesture);

    scroller.addEventListener("scroll", () => {
      if (restoring) return;
      if (userScrolling()) {
        acceptedScrollTop = scroller.scrollTop;
        userScrollUntil = Math.max(userScrollUntil, performance.now() + USER_SCROLL_TAIL);
        return;
      }
      restoreAcceptedScroll();
    }, { passive: true });

    window.addEventListener("scroll", (event) => {
      if (event.target === scroller || userScrolling()) return;
      restoreAcceptedScroll();
      clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(restoreAcceptedScroll, 80);
    }, { capture: true, passive: true });
  };

  renderAll();
  installShortcutObserver();
  normalizeDashboardProfessorName();
  organizeWeeks();
  installSidebarScrollGuard();
  window.setTimeout(() => {
    renderAll();
    installShortcutObserver();
    normalizeDashboardProfessorName();
    organizeWeeks();
    installSidebarScrollGuard();
  }, 800);
  };

  chrome.storage.local.get({ classicEnabled: true, dashboardEnabled: true }, (settings) => {
    const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
    if (enabled) start();
  });
})();
