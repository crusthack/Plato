(() => {
  "use strict";

  // Course switcher and course-name link for every in-course page
  // (course main, overview, boards, attendance, grades, ...).
  const ACTIVE_CLASS = "plato-classic-course-nav-active";
  const courseCacheMaxAge = 30 * 60 * 1000;

  const cleanText = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^강좌\s*[:：]?\s*/i, "")
    .trim();

  const courseIdFromHref = (href) => {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin || url.pathname !== "/course/view.php") return "";
      const id = url.searchParams.get("id") || "";
      return /^\d+$/.test(id) ? id : "";
    } catch (_) {
      return "";
    }
  };

  const courseIdFromBody = () => {
    const match = [...document.body.classList]
      .map((name) => /^course-(\d+)$/.exec(name))
      .find(Boolean);
    return match && match[1] !== "1" ? match[1] : "";
  };

  const mainHref = (id) => `${location.origin}/course/view.php?id=${encodeURIComponent(id)}`;
  const overviewHref = (id) => `${mainHref(id)}&mode=sections`;

  const isOverviewPage = () => {
    const url = new URL(location.href);
    return url.pathname === "/course/view.php" && url.searchParams.get("mode") === "sections";
  };

  const collectCourses = (root) => {
    const found = new Map();
    const genericTitles = /^(강좌|대시보드|한국어|english|简体中文)$/i;
    const containers = [
      "[data-region='course-content']",
      ".course-summaryitem",
      ".course-listitem",
      ".dashboard-card-deck .card",
      ".block_myoverview .card",
      ".course-card",
      ".course-item"
    ].join(",");

    root.querySelectorAll("a[href*='/course/view.php']").forEach((link) => {
      const id = courseIdFromHref(link.getAttribute("href"));
      if (!id) return;
      const container = link.closest(containers);
      const titleNode = container?.querySelector(
        "[data-region='course-name'], .coursename, .course-title, h3, h4, h5"
      );
      const title = cleanText(titleNode?.textContent || link.textContent);
      if (!title || genericTitles.test(title)) return;
      const professorNode = container?.querySelector(
        ".professors .text-truncate, .professors, .prof, .teacher, [data-region='course-teacher']"
      );
      const professor = cleanText(professorNode?.textContent || "").replace(/\s*교수(?:님)?\s*$/, "");
      const contextNode = container?.querySelector(
        ".semester-name, .course-semester, [data-region='course-info']"
      );
      const term = cleanText(contextNode?.textContent || "");
      const candidate = { courseId: id, href: mainHref(id), title, professor, term };
      const previous = found.get(id);
      if (!previous || candidate.title.length > previous.title.length) found.set(id, candidate);
    });
    return [...found.values()];
  };

  const mergeCourses = (...groups) => {
    const merged = new Map();
    groups.flat().forEach((course) => {
      const id = String(course?.courseId || courseIdFromHref(course?.href));
      const title = cleanText(course?.title);
      if (!/^\d+$/.test(id) || !title) return;
      const candidate = {
        courseId: id,
        href: mainHref(id),
        title,
        professor: cleanText(course?.professor),
        term: cleanText(course?.term)
      };
      const previous = merged.get(id);
      if (!previous || candidate.title.length > previous.title.length) merged.set(id, candidate);
    });
    return [...merged.values()];
  };

  const sendRuntimeMessage = (message) => new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });

  const readCourseCache = async () => {
    const response = await sendRuntimeMessage({ type: "platoClassic.getCourseCache" });
    return response?.ok ? response.cache : null;
  };

  const writeCourseCache = (courses) => sendRuntimeMessage({
    type: "platoClassic.setCourseCache",
    cache: { updatedAt: Date.now(), courses }
  });

  const fetchDashboardCourses = async () => {
    try {
      const response = await fetch("/my/", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "text/html" },
        cache: "no-store"
      });
      if (!response.ok || response.redirected && new URL(response.url).pathname.startsWith("/login/")) {
        return [];
      }
      const html = await response.text();
      return collectCourses(new DOMParser().parseFromString(html, "text/html"));
    } catch (_) {
      return [];
    }
  };

  const loadAllCourses = async (currentId) => {
    const cache = await readCourseCache();
    const cachedCourses = Array.isArray(cache?.courses) ? cache.courses : [];
    let courses = mergeCourses(cachedCourses, collectCourses(document));
    const cacheIsFresh = Number.isFinite(cache?.updatedAt)
      && Date.now() - cache.updatedAt < courseCacheMaxAge;
    if (!cacheIsFresh || courses.filter((course) => course.courseId !== currentId).length === 0) {
      const fetchedCourses = await fetchDashboardCourses();
      courses = mergeCourses(courses, fetchedCourses);
      if (fetchedCourses.length) await writeCourseCache(courses);
    }
    return courses;
  };

  const renderCourseSwitcherItems = (list, courses) => {
    list.replaceChildren();
    if (!courses.length) {
      const empty = document.createElement("li");
      empty.className = "plato-classic-course-switcher-empty";
      empty.textContent = "다른 수강 강좌를 찾지 못했습니다.";
      list.append(empty);
      return;
    }
    courses.forEach((course) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = overviewHref(course.courseId);
      link.className = "plato-classic-course-switcher-link";
      const title = document.createElement("strong");
      title.textContent = course.title;
      link.append(title);
      const metaText = [course.professor, course.term].filter(Boolean).join(" · ");
      if (metaText) {
        const meta = document.createElement("small");
        meta.textContent = metaText;
        link.append(meta);
      }
      item.append(link);
      list.append(item);
    });
  };

  const dashboardProfessorName = () => {
    const source = document.querySelector(
      ".coursemos-course-dashboard .dashboard-header-honor .honor-info"
    );
    if (!source) return "";
    const copy = source.cloneNode(true);
    copy.querySelectorAll(".csms-avata, button, svg").forEach((node) => node.remove());
    return cleanText(copy.textContent).replace(/\s*교수(?:님)?\s*$/, "");
  };

  const setProfessor = (text, name) => {
    if (!name) return;
    let professor = text.querySelector(".plato-classic-current-professor");
    if (!professor) {
      professor = document.createElement("span");
      professor.className = "plato-classic-current-professor";
      text.append(professor);
    }
    professor.textContent = name;
  };

  const enhanceCurrentCourse = (host, courseId) => {
    const link = host.querySelector(".coursename-prof");
    const courseName = link?.querySelector(".coursename");
    if (!link || !courseName) return null;

    // Overview page -> course main page; every other course page -> overview page.
    const toMain = isOverviewPage();
    const label = toMain ? "현재 강좌 메인페이지로 이동" : "현재 강좌 강의 개요로 이동";
    link.href = toMain ? mainHref(courseId) : overviewHref(courseId);
    link.classList.add("is-current-course");
    link.setAttribute("aria-label", label);
    link.title = label;
    link.removeAttribute("target");
    link.querySelectorAll(":scope > .csms-avata").forEach((node) => node.remove());

    let text = link.querySelector(".plato-classic-current-course-text");
    if (!text) {
      text = document.createElement("span");
      text.className = "plato-classic-current-course-text";
      courseName.before(text);
      text.append(courseName);
    }
    setProfessor(text, dashboardProfessorName());
    return text;
  };

  const installCourseSwitcher = () => {
    const host = document.querySelector("#pw-nav-menu .my-courses");
    const sourceLink = host?.querySelector(".coursename-prof");
    if (!host || !sourceLink) return;
    const courseId = host.dataset.classicCourseId
      || courseIdFromHref(sourceLink.getAttribute("href"))
      || courseIdFromBody();
    if (!courseId) return;
    host.dataset.classicCourseId = courseId;

    const text = enhanceCurrentCourse(host, courseId);
    if (host.querySelector(".plato-classic-course-switcher-button")) return;
    host.classList.add("plato-classic-course-switcher-host");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "plato-classic-course-switcher-button";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "다른 강좌로 이동");
    button.title = "다른 강좌로 이동";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h14" />
      </svg>`;

    const menu = document.createElement("div");
    menu.id = "plato-classic-course-switcher-menu";
    menu.className = "plato-classic-course-switcher-menu";
    menu.hidden = true;
    button.setAttribute("aria-controls", menu.id);
    const heading = document.createElement("div");
    heading.className = "plato-classic-course-switcher-heading";
    heading.textContent = "나의 다른 강좌";
    const list = document.createElement("ul");
    list.className = "plato-classic-course-switcher-list";
    const loading = document.createElement("li");
    loading.className = "plato-classic-course-switcher-empty";
    loading.textContent = "강좌 목록을 불러오는 중…";
    list.append(loading);
    const allCourses = document.createElement("a");
    allCourses.className = "plato-classic-course-switcher-all";
    allCourses.href = "/my/";
    allCourses.textContent = "나의 강좌 전체보기";
    menu.append(heading, list, allCourses);
    host.append(button, menu);

    let coursesPromise = null;
    const getCourses = () => {
      coursesPromise = coursesPromise || loadAllCourses(courseId);
      return coursesPromise;
    };

    // Fill the professor name from the course cache on pages without the course dashboard.
    if (text && !text.querySelector(".plato-classic-current-professor")) {
      readCourseCache().then((cache) => {
        const current = (cache?.courses || []).find((course) => String(course.courseId) === courseId);
        setProfessor(text, cleanText(current?.professor));
      });
    }

    let loaded = false;
    let lastTrigger = button;
    const close = () => {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    };
    const open = async (trigger = button) => {
      lastTrigger = trigger;
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      if (loaded) return;
      loaded = true;
      const courses = (await getCourses())
        .filter((course) => course.courseId !== courseId)
        .sort((a, b) => a.title.localeCompare(b.title, "ko"));
      renderCourseSwitcherItems(list, courses);
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menu.hidden) open(button);
      else close();
    });
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("wheel", (event) => {
      event.stopPropagation();
      const scrollable = event.target instanceof Element
        ? event.target.closest(".plato-classic-course-switcher-list")
        : null;
      if (!scrollable) {
        event.preventDefault();
        return;
      }
      const atTop = scrollable.scrollTop <= 0;
      const atBottom = Math.ceil(scrollable.scrollTop + scrollable.clientHeight)
        >= scrollable.scrollHeight;
      if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
        event.preventDefault();
      }
    }, { passive: false });
    document.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menu.hidden) return;
      close();
      lastTrigger.focus();
    });
  };

  const start = () => {
    installCourseSwitcher();
    window.setTimeout(installCourseSwitcher, 800);
  };

  chrome.storage.local.get({ classicEnabled: true, dashboardEnabled: true }, (settings) => {
    const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
    if (enabled) start();
  });
})();
