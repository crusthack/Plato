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
    )].filter((link) => !link.closest(".plato-classic-course-overview"));

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
      syncTimer = window.setTimeout(renderOverview, 50);
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

    let acceptedScrollTop = scroller.scrollTop;
    let userGesture = false;
    let pointerActive = false;
    let restoring = false;
    let captureFrame = 0;
    let releaseFrame = 0;
    let restoreFrame = 0;
    let restoreTimer = 0;

    const captureUserScroll = () => {
      userGesture = true;
      cancelAnimationFrame(captureFrame);
      cancelAnimationFrame(releaseFrame);
      captureFrame = requestAnimationFrame(() => {
        acceptedScrollTop = scroller.scrollTop;
        releaseFrame = requestAnimationFrame(() => {
          if (!pointerActive) userGesture = false;
        });
      });
    };

    const restoreAcceptedScroll = () => {
      if (pointerActive || userGesture) return;
      cancelAnimationFrame(restoreFrame);
      restoreFrame = requestAnimationFrame(() => {
        if (pointerActive || userGesture) return;
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
      userGesture = true;
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
      requestAnimationFrame(() => {
        userGesture = false;
      });
    };
    window.addEventListener("pointerup", finishPointerGesture, true);
    window.addEventListener("pointercancel", finishPointerGesture, true);
    window.addEventListener("blur", finishPointerGesture);

    scroller.addEventListener("scroll", () => {
      if (restoring) return;
      if (pointerActive || userGesture) {
        acceptedScrollTop = scroller.scrollTop;
        return;
      }
      restoreAcceptedScroll();
    }, { passive: true });

    window.addEventListener("scroll", (event) => {
      if (event.target === scroller || pointerActive || userGesture) return;
      restoreAcceptedScroll();
      clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(restoreAcceptedScroll, 80);
    }, { capture: true, passive: true });
  };

  renderOverview();
  installShortcutObserver();
  normalizeDashboardProfessorName();
  organizeWeeks();
  installSidebarScrollGuard();
  window.setTimeout(() => {
    renderOverview();
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
