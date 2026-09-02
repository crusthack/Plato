(() => {
  "use strict";

  const ACTIVE_CLASS = "plato-classic-authenticated-active";
  const HEADER_ID = "plato-classic-auth-header";
  const LEGACY_ACCESS_ID = "plato-classic-legacy-access";
  const MIN_LEGACY_YEAR = 2014;
  const LEGACY_CUTOVER_YEAR = 2026;
  if (!location.pathname.startsWith("/local/ubion/allcourse/regular/")) return;
  if (document.body.classList.contains("notloggedin")) return;
  if (document.getElementById(HEADER_ID)) return;

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
  const makeMessageIcon = () => {
    const icon = element("span", "site-menu-icon");
    icon.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = '<path d="M22 2 9.7 14.3"/><path d="M22 2 14.2 22 9.7 14.3 2 9.8 22 2Z"/>';
    icon.append(svg);
    return icon;
  };

  const readUserIdentity = (root = document) => {
    const text = (selector) => normalize(root.querySelector(selector)?.textContent);
    const time = text(".user-lastaccess .ul-item:first-child span");
    const ip = text(".user-lastaccess .ul-item:nth-child(2) span");
    const prompt = text(".prompt-text[data-aihub='keyword']");
    const name = text("[data-region='user-menu'] .usertext") ||
      text(".usermenu .usertext") ||
      text(".userbutton .usertext") ||
      prompt.match(/안녕하세요,\s*(.+?)님/)?.[1] || "";
    const initial = text(".btn-user-setting .csms-avata-picture") || name.slice(0, 1);
    const picture = root.querySelector(".btn-user-setting img, [data-region='user-menu'] img.userpicture")?.src || "";
    return { time, ip, name, initial, picture };
  };

  const applyUserIdentity = (header, identity) => {
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
    if (!badge) return;
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
  };

  const hydrateUserIdentity = async (header) => {
    let identity = readUserIdentity(document);
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
      // Keep the page functional if the optional identity refresh is unavailable.
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
      ["도서관", "https://lib.pusan.ac.kr"],
      ["구버전 플라토", "https://dev-plato.pusan.ac.kr/"]
    ].forEach(([label, href]) => {
      const item = element("li", "site-item");
      const link = anchor(label, href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
      sites.append(item);
    });
    family.append(sites);

    const usermenu = element("div", "usermenu");
    const usernav = element("ul", "nav-user");
    const identity = readUserIdentity(document);
    const accessItem = element("li", "nav-item nav-item-userinfo nav-item-userinfo-iptime");
    accessItem.hidden = !(identity.time || identity.ip);
    const userItem = element("li", "nav-item nav-item-userinfo");
    const userButton = element("button", "btn-userinfo");
    userButton.type = "button";
    userButton.setAttribute("aria-haspopup", "dialog");
    userButton.setAttribute("aria-expanded", "false");
    userButton.append(
      element("span", "fullname", identity.name || "PLATO 사용자"),
      element("span", "picture-badge")
    );
    userItem.append(userButton);
    const logoutItem = element("li", "nav-item nav-item-loginout");
    const logoutHref = document.querySelector("a[href*='/login/logout.php']")?.href || "https://plato.pusan.ac.kr/login/logout.php";
    logoutItem.append(anchor("로그아웃", logoutHref, "btn-loginout"));
    usernav.append(accessItem, userItem, logoutItem);
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
    [
      ["교과과정", "https://plato.pusan.ac.kr/local/ubion/allcourse/regular/index.php", "fa-graduation-cap"],
      ["자율강좌", "https://plato.pusan.ac.kr/local/ubeclass/my.php", "fa-users"],
      ["지정강좌", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=1", "fa-globe"],
      ["교수·학습", "https://plato.pusan.ac.kr/local/ubonline/my.php?cgroup=2", "fa-globe"],
      ["메시지", "https://plato.pusan.ac.kr/local/talk/index.php", "message"]
    ].forEach(([label, href, iconClass]) => {
      const item = element("li", "menu-item");
      if (iconClass === "message") item.classList.add("menu-item-message");
      const link = anchor("", href, "site-menu-link nosubmenu");
      if (label === "교과과정") link.setAttribute("aria-current", "page");
      const icon = iconClass === "message"
        ? makeMessageIcon()
        : element("i", `fa site-menu-icon ${iconClass}`);
      icon.setAttribute("aria-hidden", "true");
      link.append(icon, element("span", "menu-name", label));
      item.append(link);
      menuList.append(item);
    });
    menuBox.append(menuList);
    pageMenu.append(logoBox, menuBox);
    header.append(utility, pageMenu);
    applyUserIdentity(header, identity);
    return header;
  };

  const header = makeHeader();
  document.body.prepend(header);
  hydrateUserIdentity(header);

  const semesterLabels = {
    "10": "1학기",
    "11": "여름계절수업",
    "12": "여름도약수업",
    "20": "2학기",
    "21": "겨울계절수업",
    "22": "겨울도약수업"
  };
  const shouldUseLegacyTerm = (year, semester) => {
    const numericYear = Number(year);
    return numericYear < LEGACY_CUTOVER_YEAR ||
      (numericYear === LEGACY_CUTOVER_YEAR && ["10", "11", "12"].includes(String(semester)));
  };
  const defaultLegacyTerm = () => ({
    year: String(LEGACY_CUTOVER_YEAR),
    semester: "10",
    semesterLabel: semesterLabels["10"],
    key: `${LEGACY_CUTOVER_YEAR}-10`
  });

  const makeTerm = (year, semester, semesterLabel = "") => {
    const normalizedYear = normalize(year);
    const normalizedSemester = normalize(semester);
    const numericYear = Number(normalizedYear);
    if (!/^\d{4}$/.test(normalizedYear) || !Number.isInteger(numericYear) ||
      numericYear < MIN_LEGACY_YEAR || numericYear > new Date().getFullYear() ||
      !Object.hasOwn(semesterLabels, normalizedSemester)) {
      return null;
    }
    return {
      year: normalizedYear,
      semester: normalizedSemester,
      semesterLabel: semesterLabel || semesterLabels[normalizedSemester],
      key: `${normalizedYear}-${normalizedSemester}`
    };
  };

  const cleanProfessorName = (value = "") => {
    const normalized = normalize(value).replace(/^(?:담당\s*)?교수\s*[:：]?\s*/, "");
    const parts = normalized.split(" ").filter(Boolean);
    return parts.filter((part, index) => !(
      /^[가-힣]$/.test(part) && parts[index + 1]?.startsWith(part)
    )).join(" ");
  };

  const readProfessorName = (root) => {
    if (!root) return "";
    const precise = root.querySelector(
      ".professors .text-truncate, .professor-name, .course-professor, .professor, .teacher, " +
      "[data-field='professor'], [data-region='professor']"
    );
    if (precise) return cleanProfessorName(precise.textContent);

    const group = root.querySelector(".professors");
    if (!group) return "";
    const copy = group.cloneNode(true);
    copy.querySelectorAll(".csms-avata, .userinitials, img, svg").forEach((node) => node.remove());
    return cleanProfessorName(copy.textContent);
  };

  const inferVisibleCourseTerm = () => {
    const termTexts = [...document.querySelectorAll(
      ".ubion-allcourse-course-list .course-semester"
    )].map((node) => normalize(node.textContent)).filter(Boolean);
    for (const text of termTexts) {
      const year = text.match(/((?:19|20)\d{2})\s*년/)?.[1] || "";
      const semester = Object.entries(semesterLabels)
        .find(([, label]) => text.includes(label))?.[0] || "";
      const term = makeTerm(year, semester, semesterLabels[semester] || "");
      if (term) return term;
    }
    return null;
  };

  const selectedTerm = () => {
    const params = new URLSearchParams(location.search);
    const yearSelect = document.querySelector("select[name='year']");
    const semesterSelect = document.querySelector("select[name='semester']");
    const queryYear = normalize(params.get("year") || "");
    const querySemester = normalize(params.get("semester") || "");
    const selectedYear = normalize(yearSelect?.value || "");
    const selectedSemester = normalize(semesterSelect?.value || "");
    const selectedSemesterLabel = normalize(semesterSelect?.selectedOptions?.[0]?.textContent || "");
    const queryTerm = makeTerm(queryYear, querySemester);
    const controlTerm = makeTerm(selectedYear, selectedSemester, selectedSemesterLabel);
    const hasTermQuery = params.has("year") || params.has("semester");
    return (hasTermQuery ? queryTerm : (controlTerm || inferVisibleCourseTerm())) || {
      year: "",
      semester: "",
      semesterLabel: "",
      key: ""
    };
  };

  const ensureLegacyYearOptions = () => {
    const yearSelect = document.querySelector(".ubion-allcourse-header select[name='year']");
    if (!yearSelect) return;
    const existing = new Set([...yearSelect.options].map((option) => option.value));
    for (let year = new Date().getFullYear(); year >= MIN_LEGACY_YEAR; year -= 1) {
      const value = String(year);
      if (existing.has(value)) continue;
      const option = element("option", "", value);
      option.value = value;
      const before = [...yearSelect.options].find((candidate) => {
        const candidateYear = Number(candidate.value);
        return Number.isInteger(candidateYear) && candidateYear > 0 && candidateYear < year;
      });
      yearSelect.insertBefore(option, before || null);
      existing.add(value);
    }
    const params = new URLSearchParams(location.search);
    const requestedYear = params.get("year") || "";
    if (existing.has(requestedYear)) yearSelect.value = requestedYear;
    const semesterSelect = document.querySelector(".ubion-allcourse-header select[name='semester']");
    const requestedSemester = params.get("semester") || "";
    if (semesterSelect && [...semesterSelect.options].some((option) => option.value === requestedSemester)) {
      semesterSelect.value = requestedSemester;
    }
  };

  const makeCourseTable = (courses, year, semesterLabel) => {
    const table = element("table", "table table-bordered table-coursemos plato-classic-course-table");
    const caption = element(
      "caption",
      "sr-only",
      `${year}년 ${semesterLabel} 강좌 ${courses.length}개`
    );
    const colgroup = document.createElement("colgroup");
    const yearColumn = element("col", "w80");
    const semesterColumn = element("col", "w80");
    colgroup.append(yearColumn, semesterColumn, document.createElement("col"));

    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    ["연도", "학기", "강좌명"].forEach((label) => headingRow.append(element("th", "", label)));
    head.append(headingRow);

    const body = element("tbody", "my-course-lists");
    courses.forEach((course) => {
      const row = document.createElement("tr");
      row.append(
        element("td", "text-center", year),
        element("td", "text-center", semesterLabel)
      );
      const nameCell = document.createElement("td");
      const courseFlex = element("div", "course-flex course-label-hide");
      const courseDetails = element("div", "course-details");
      courseDetails.append(anchor(course.title, course.href, "coursefullname"));
      if (course.professor) {
        courseDetails.append(element("span", "course-professor", `교수 ${course.professor}`));
      }
      courseFlex.append(element("span", "badge badge-course", "교과"), courseDetails);
      nameCell.append(courseFlex);
      row.append(nameCell);
      body.append(row);
    });
    table.append(caption, colgroup, head, body);
    return table;
  };

  const currentSemesterAliases = {
    "10": ["1학기"],
    "11": ["여름학기", "여름계절수업"],
    "12": ["여름도약수업"],
    "20": ["2학기"],
    "21": ["겨울학기", "겨울계절수업"],
    "22": ["겨울도약수업"]
  };
  const CURRENT_LIST_WAIT_MS = 4000;
  let legacyRequestGeneration = 0;
  let activeCourseTermKey = "";
  let pendingLegacyTermKey = "";
  let renderedCourseState = { key: "", mode: "", signature: "", node: null, source: null };
  let courseTableTimer;
  let termNavigationPending = false;
  let termNavigationFallbackTimer;

  const ensureCourseAnnouncer = (content) => {
    let announcer = content.querySelector(":scope > .plato-classic-course-announcer");
    if (announcer) return announcer;
    announcer = element("div", "plato-classic-course-announcer");
    announcer.setAttribute("role", "status");
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    Object.assign(announcer.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0"
    });
    content.append(announcer);
    return announcer;
  };

  const announceCourseState = (content, message) => {
    const announcer = ensureCourseAnnouncer(content);
    announcer.textContent = message;
  };

  const restoreNativeCoursePresentation = () => {
    document.querySelectorAll(".plato-classic-course-source").forEach((node) => {
      node.classList.remove("plato-classic-course-source");
    });
    document.querySelectorAll(".plato-classic-native-empty").forEach((node) => {
      node.classList.remove("plato-classic-native-empty");
    });
    document.querySelectorAll(".ubion-allcourse-content[aria-busy]").forEach((node) => {
      node.removeAttribute("aria-busy");
    });
  };

  const removeGeneratedCoursePresentation = () => {
    document.querySelectorAll(
      ".plato-classic-course-table, .plato-classic-legacy-term, .plato-classic-legacy-status"
    ).forEach((node) => node.remove());
  };

  const resetCoursePresentation = (nextTermKey, force = false) => {
    if (!force && activeCourseTermKey === nextTermKey) return;
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    removeGeneratedCoursePresentation();
    restoreNativeCoursePresentation();
    renderedCourseState = { key: "", mode: "", signature: "", node: null, source: null };
    activeCourseTermKey = nextTermKey;
    document.querySelectorAll(".plato-classic-course-announcer").forEach((node) => {
      node.textContent = "";
    });
  };

  const makeStatus = (content, termKey, text) => {
    document.querySelectorAll(".plato-classic-legacy-status").forEach((node) => node.remove());
    const status = element("div", "plato-classic-legacy-status", text);
    status.dataset.termKey = termKey;
    status.dataset.requestKey = termKey;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    content.append(status);
    return status;
  };

  const readCurrentCourses = (sourceList) => [...sourceList.querySelectorAll("a.course-card[href]")]
    .map((card) => ({
      href: card.href,
      title: normalize(card.querySelector("h5")?.textContent || card.textContent),
      termText: normalize(card.querySelector(".course-semester")?.textContent || ""),
      professor: readProfessorName(card)
    }))
    .filter((course) => course.title && course.href);

  const currentCoursesMatchTerm = (courses, term) => {
    const termTexts = courses.map((course) => course.termText).filter(Boolean);
    if (!termTexts.length) return true;
    const aliases = currentSemesterAliases[term.semester] || [term.semesterLabel].filter(Boolean);
    return termTexts.every((text) =>
      text.includes(`${term.year}년`) && (!aliases.length || aliases.some((label) => text.includes(label)))
    );
  };

  const installCurrentCourseTable = (term, content) => {
    const sourceLists = [...document.querySelectorAll(".ubion-allcourse-course-list")];
    const parsedLists = sourceLists.map((source) => ({ source, courses: readCurrentCourses(source) }));
    const matching = parsedLists.find(({ courses }) => courses.length && currentCoursesMatchTerm(courses, term));
    const candidate = matching || parsedLists.at(-1);

    if (!candidate?.courses.length) {
      const emptySource = candidate?.source || null;
      if (
        renderedCourseState.key === term.key &&
        renderedCourseState.mode === "current-empty" &&
        renderedCourseState.source === emptySource
      ) return false;
      removeGeneratedCoursePresentation();
      restoreNativeCoursePresentation();
      renderedCourseState = {
        key: term.key,
        mode: "current-empty",
        signature: "",
        node: null,
        source: emptySource
      };
      announceCourseState(content, `${term.year}년 ${term.semesterLabel}에 표시할 강좌가 없습니다.`);
      return false;
    }

    if (!matching) {
      const waitingSignature = JSON.stringify(candidate.courses.map(({ href, title, termText }) => ({
        href,
        title,
        termText
      })));
      if (
        renderedCourseState.key === term.key &&
        renderedCourseState.mode === "current-fallback" &&
        renderedCourseState.signature === waitingSignature &&
        renderedCourseState.source === candidate.source
      ) return false;
      if (
        renderedCourseState.key === term.key &&
        renderedCourseState.mode === "current-waiting" &&
        renderedCourseState.signature === waitingSignature &&
        renderedCourseState.source === candidate.source &&
        renderedCourseState.node?.isConnected
      ) return false;
      removeGeneratedCoursePresentation();
      restoreNativeCoursePresentation();
      candidate.source.classList.add("plato-classic-course-source");
      const status = makeStatus(content, term.key, "선택한 학기의 강좌 목록을 불러오고 있습니다…");
      renderedCourseState = {
        key: term.key,
        mode: "current-waiting",
        signature: waitingSignature,
        node: status,
        source: candidate.source
      };
      setTimeout(() => {
        if (
          !document.documentElement.classList.contains(ACTIVE_CLASS) ||
          !candidate.source.isConnected || !status.isConnected ||
          activeCourseTermKey !== term.key ||
          renderedCourseState.key !== term.key ||
          renderedCourseState.mode !== "current-waiting" ||
          renderedCourseState.signature !== waitingSignature ||
          renderedCourseState.source !== candidate.source ||
          renderedCourseState.node !== status
        ) return;
        status.remove();
        restoreNativeCoursePresentation();
        renderedCourseState = {
          key: term.key,
          mode: "current-fallback",
          signature: waitingSignature,
          node: candidate.source,
          source: candidate.source
        };
        announceCourseState(
          content,
          `${term.year}년 ${term.semesterLabel} 목록 갱신이 지연되어 PLATO 원본 목록을 표시합니다.`
        );
      }, CURRENT_LIST_WAIT_MS);
      return false;
    }

    const courses = matching.courses.map(({ href, title, professor }) => ({
      href,
      title,
      professor
    }));
    const signature = JSON.stringify(courses);
    if (
      renderedCourseState.key === term.key &&
      renderedCourseState.mode === "current" &&
      renderedCourseState.signature === signature &&
      renderedCourseState.source === matching.source &&
      renderedCourseState.node?.isConnected
    ) {
      matching.source.classList.add("plato-classic-course-source");
      return true;
    }

    removeGeneratedCoursePresentation();
    restoreNativeCoursePresentation();
    matching.source.classList.add("plato-classic-course-source");
    const table = makeCourseTable(courses, term.year, term.semesterLabel);
    table.dataset.termKey = term.key;
    table.dataset.courseSource = "current";
    matching.source.after(table);
    renderedCourseState = {
      key: term.key,
      mode: "current",
      signature,
      node: table,
      source: matching.source
    };
    announceCourseState(content, `${term.year}년 ${term.semesterLabel} 강좌 ${courses.length}개를 표시했습니다.`);
    return true;
  };

  const legacyTermUrl = (year, semester) => {
    const url = new URL("https://dev-plato.pusan.ac.kr/local/ubion/user/index.php");
    url.searchParams.set("year", year);
    url.searchParams.set("semester", semester);
    return url;
  };

  const requestLegacyRefresh = (term) => {
    if (!term?.key || !shouldUseLegacyTerm(term.year, term.semester)) return;
    clearTimeout(termNavigationFallbackTimer);
    termNavigationPending = false;
    resetCoursePresentation(term.key, true);
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    scheduleCourseTableRefresh(0);
  };

  const syncLegacyAccess = (term, { state = "", count = null } = {}) => {
    const courseHeader = document.querySelector(".ubion-allcourse-header");
    if (!courseHeader) return;
    let panel = document.getElementById(LEGACY_ACCESS_ID);
    if (!panel) {
      panel = element("aside", "plato-classic-legacy-access");
      panel.id = LEGACY_ACCESS_ID;
      panel.setAttribute("aria-label", "이전 PLATO 과거 강좌 조회");
      courseHeader.append(panel);
    }
    const legacySelected = Boolean(term?.key) && shouldUseLegacyTerm(term.year, term.semester);
    panel.hidden = !legacySelected || state === "connected";
    const targetTerm = legacySelected ? term : defaultLegacyTerm();
    const title = legacySelected
      ? `${term.year}년 ${term.semesterLabel} 강좌 조회`
      : `${LEGACY_CUTOVER_YEAR}학년도 2학기 이전 강좌`;
    const descriptions = {
      checking: "브라우저의 구 PLATO 로그인 세션을 확인하여 이 화면 안에 과거 강좌를 합쳐 불러오는 중입니다.",
      connected: count === 0
        ? "구 PLATO 로그인 세션은 확인됐지만 선택한 학기에는 표시할 강좌가 없습니다."
        : `구 PLATO 로그인 세션으로 ${count ?? "과거"}개 강좌를 이 화면에 통합 표시했습니다.`,
      auth: "구 PLATO 로그인 세션이 없습니다. 아래 버튼으로 로그인한 뒤 이 탭으로 돌아오면 다시 불러올 수 있습니다.",
      error: "구 PLATO 목록을 자동으로 불러오지 못했습니다. 아래 버튼으로 같은 학기를 직접 열 수 있습니다."
    };
    const description = descriptions[state] || (legacySelected
      ? "2026년 2학기 이전 학기는 먼저 이 화면에서 통합 조회를 시도하고, 필요하면 구 PLATO 동일 학기를 바로 열 수 있습니다."
      : "과거 학기를 선택해 검색하면 먼저 이 화면에서 구 PLATO 세션을 확인하고, 필요하면 구 PLATO 과거강좌조회로 이동할 수 있습니다.");
    const openLabel = legacySelected
      ? `구 PLATO에서 ${term.year}년 ${term.semesterLabel} 열기`
      : "구 PLATO 과거강좌조회";
    const retryVisible = legacySelected && (state === "auth" || state === "error");
    const retryLabel = "이 화면에서 다시 확인";
    const signature = JSON.stringify({
      title,
      description,
      openLabel,
      retryVisible,
      retryLabel,
      state,
      target: targetTerm.key || `${targetTerm.year}-${targetTerm.semester}`
    });
    const existingActions = courseHeader.querySelector(".plato-classic-legacy-access-actions");
    if (panel.dataset.signature === signature && existingActions?.isConnected) return;
    existingActions?.remove();
    panel.dataset.signature = signature;
    panel.dataset.legacyMode = legacySelected ? "selected" : "hint";
    panel.dataset.legacyState = state || "idle";

    const copy = element("div", "plato-classic-legacy-access-copy");
    copy.append(
      element("strong", "plato-classic-legacy-access-title", title),
      element("span", "plato-classic-legacy-access-description", description)
    );
    const actions = element("div", "plato-classic-legacy-access-actions");
    const openLink = anchor(
      openLabel,
      legacyTermUrl(targetTerm.year, targetTerm.semester).href,
      "plato-classic-legacy-access-link"
    );
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.setAttribute("aria-label", `${openLabel} — 새 탭`);
    actions.append(openLink);

    if (retryVisible) {
      const retryButton = element("button", "plato-classic-legacy-access-retry", retryLabel);
      retryButton.type = "button";
      retryButton.disabled = state === "checking";
      retryButton.addEventListener("click", () => requestLegacyRefresh(term));
      actions.append(retryButton);
    }

    panel.replaceChildren(copy);
    const searchBox = courseHeader.querySelector("form.search-box") ||
      courseHeader.querySelector(".search-box") ||
      courseHeader.querySelector(".csms-search-container");
    (searchBox || panel).append(actions);
  };

  const normalizeLegacyCourses = (response) => {
    const courses = Array.isArray(response.courses)
      ? response.courses
      : (() => {
        if (!response.html) return [];
        const legacyPage = new DOMParser().parseFromString(response.html, "text/html");
        return [...legacyPage.querySelectorAll(
          "a.coursefullname[href*='/course/view.php'], .table-coursemos tbody.my-course-lists a[href*='/course/view.php?id=']"
        )].map((link) => ({
          href: link.getAttribute("href") || "",
          title: normalize(link.textContent),
          professor: readProfessorName(link.closest("tr") || link.parentElement)
        }));
      })();

    return courses.map((course) => {
      try {
        const href = new URL(course?.href || "", "https://dev-plato.pusan.ac.kr/");
        if (href.origin !== "https://dev-plato.pusan.ac.kr" || href.pathname !== "/course/view.php") return null;
        if (!/^\d+$/.test(href.searchParams.get("id") || "")) return null;
        if (["sesskey", "confirm", "delete", "action"].some((name) => href.searchParams.has(name))) return null;
        return {
          href: href.href,
          title: normalize(course?.title || ""),
          professor: cleanProfessorName(course?.professor || "")
        };
      } catch {
        return null;
      }
    }).filter((course) => course?.title)
      .filter((course, index, items) => items.findIndex((item) => item.href === course.href) === index);
  };

  const loadLegacyCourses = (term, content) => {
    const completedModes = new Set(["legacy", "legacy-empty", "legacy-error"]);
    if (
      renderedCourseState.key === term.key &&
      completedModes.has(renderedCourseState.mode) &&
      renderedCourseState.node?.isConnected
    ) {
      if (renderedCourseState.mode === "legacy") {
        syncLegacyAccess(term, {
          state: "connected",
          count: renderedCourseState.node.querySelectorAll("tbody tr").length
        });
      } else if (renderedCourseState.mode === "legacy-empty") {
        syncLegacyAccess(term, { state: "connected", count: 0 });
      }
      return;
    }

    const connectedStatus = document.querySelector(
      `.plato-classic-legacy-status[data-term-key="${CSS.escape(term.key)}"]`
    );
    if (pendingLegacyTermKey === term.key && connectedStatus) return;
    if (pendingLegacyTermKey === term.key) {
      legacyRequestGeneration += 1;
      pendingLegacyTermKey = "";
    }

    removeGeneratedCoursePresentation();
    restoreNativeCoursePresentation();
    document.querySelectorAll(".ubion-allcourse-course-list").forEach((node) => {
      node.classList.add("plato-classic-course-source");
    });

    const status = makeStatus(content, term.key, "이전 PLATO에서 과거 강좌를 확인하고 있습니다…");
    syncLegacyAccess(term, { state: "checking" });
    const requestGeneration = ++legacyRequestGeneration;
    pendingLegacyTermKey = term.key;
    content.setAttribute("aria-busy", "true");
    renderedCourseState = {
      key: term.key,
      mode: "legacy-loading",
      signature: "",
      node: status,
      source: null
    };

    const requestIsCurrent = () => {
      const currentTerm = selectedTerm();
      return requestGeneration === legacyRequestGeneration &&
        pendingLegacyTermKey === term.key &&
        activeCourseTermKey === term.key &&
        currentTerm.key === term.key &&
        shouldUseLegacyTerm(currentTerm.year, currentTerm.semester) &&
        document.documentElement.classList.contains(ACTIVE_CLASS) &&
        content.isConnected && status.isConnected;
    };

    const finishRequest = () => {
      if (pendingLegacyTermKey === term.key) pendingLegacyTermKey = "";
      content.removeAttribute("aria-busy");
    };

    const showLegacyError = ({ authRequired = false } = {}) => {
      finishRequest();
      status.classList.toggle("is-auth-required", authRequired);
      status.replaceChildren(
        element(
          "strong",
          "plato-classic-legacy-status-title",
          authRequired ? "이전 PLATO 로그인이 필요합니다." : "이전 PLATO 강좌를 불러오지 못했습니다."
        ),
        element(
          "span",
          "plato-classic-legacy-status-detail",
          authRequired
            ? "위의 구 PLATO 버튼에서 로그인한 뒤 이 탭으로 돌아오면 자동으로 다시 확인합니다."
            : "위의 구 PLATO 버튼에서 선택한 학기를 직접 확인할 수 있습니다."
        )
      );
      syncLegacyAccess(term, { state: authRequired ? "auth" : "error" });
      renderedCourseState = {
        key: term.key,
        mode: "legacy-error",
        signature: "",
        node: status,
        source: null
      };
    };

    chrome.runtime.sendMessage(
      { type: "platoClassic.fetchLegacyTerm", year: term.year, semester: term.semester },
      (response) => {
        const runtimeError = chrome.runtime.lastError?.message || "";
        if (!requestIsCurrent()) {
          if (requestGeneration === legacyRequestGeneration) finishRequest();
          status.remove();
          if (document.documentElement.classList.contains(ACTIVE_CLASS)) scheduleCourseTableRefresh(0);
          return;
        }
        if (runtimeError || !response?.ok) {
          const errorMessage = `${runtimeError} ${response?.error || ""}`.trim();
          if (/legacy (?:authentication|login session)/i.test(errorMessage)) {
            showLegacyError({ authRequired: true });
            return;
          }
          showLegacyError();
          return;
        }

        const courses = normalizeLegacyCourses(response);
        finishRequest();
        if (!courses.length) {
          status.textContent = "선택한 학기에 표시할 이전 PLATO 강좌가 없습니다.";
          syncLegacyAccess(term, { state: "connected", count: 0 });
          renderedCourseState = {
            key: term.key,
            mode: "legacy-empty",
            signature: "",
            node: status,
            source: null
          };
          return;
        }

        const box = element("div", "csms-box plato-classic-legacy-term");
        box.dataset.termKey = term.key;
        const boxHeader = element("div", "csms-box-header");
        const total = element("div", "totalcount");
        total.append(
          document.createTextNode("총"),
          element("span", "", String(courses.length)),
          document.createTextNode("강좌 · 이전 PLATO 조회")
        );
        boxHeader.append(total);
        const boxContent = element("div", "csms-box-content");
        const table = makeCourseTable(courses, term.year, term.semesterLabel);
        table.dataset.termKey = term.key;
        table.dataset.courseSource = "legacy";
        boxContent.append(table);
        box.append(boxHeader, boxContent);
        status.remove();
        [...content.children].forEach((child) => {
          if (!child.classList.contains("plato-classic-course-announcer")) {
            child.classList.add("plato-classic-native-empty");
          }
        });
        content.append(box);
        renderedCourseState = {
          key: term.key,
          mode: "legacy",
          signature: JSON.stringify(courses),
          node: box,
          source: null
        };
        syncLegacyAccess(term, { state: "connected", count: courses.length });
        announceCourseState(
          content,
          `${term.year}년 ${term.semesterLabel} 이전 PLATO 강좌 ${courses.length}개를 표시했습니다.`
        );
      }
    );
  };

  const loadLegacyTermCourses = () => {
    if (termNavigationPending) return;
    const content = document.querySelector(".ubion-allcourse-content");
    if (!content) return;
    ensureLegacyYearOptions();
    const term = selectedTerm();
    resetCoursePresentation(term.key);
    if (!term.key) {
      syncLegacyAccess(term);
      return;
    }
    if (shouldUseLegacyTerm(term.year, term.semester)) {
      loadLegacyCourses(term, content);
      return;
    }
    syncLegacyAccess(term);
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    installCurrentCourseTable(term, content);
  };

  const scheduleCourseTableRefresh = (delay = 100) => {
    clearTimeout(courseTableTimer);
    courseTableTimer = setTimeout(() => {
      if (document.documentElement.classList.contains(ACTIVE_CLASS)) loadLegacyTermCourses();
    }, delay);
  };

  const applySettings = (settings) => {
    const enabled = settings.classicEnabled !== false && settings.dashboardEnabled !== false;
    header.hidden = !enabled;
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
    if (enabled) {
      loadLegacyTermCourses();
    } else {
      const legacyAccess = document.getElementById(LEGACY_ACCESS_ID);
      if (legacyAccess) legacyAccess.hidden = true;
      document.querySelectorAll(".plato-classic-legacy-access-actions").forEach((node) => node.remove());
      resetCoursePresentation("", true);
    }
    document.dispatchEvent(new CustomEvent("plato-classic-ready"));
  };
  const defaults = { classicEnabled: true, dashboardEnabled: true };
  chrome.storage.local.get(defaults, applySettings);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!changes.classicEnabled && !changes.dashboardEnabled) return;
    chrome.storage.local.get(defaults, applySettings);
  });

  new MutationObserver(() => {
    scheduleCourseTableRefresh(100);
  }).observe(document.querySelector("#region-main") || document.body, { childList: true, subtree: true });

  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    if (!event.target.matches(".ubion-allcourse-header form.search-box")) return;
    const submittedFrom = location.href;
    termNavigationPending = true;
    clearTimeout(termNavigationFallbackTimer);
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    termNavigationFallbackTimer = setTimeout(() => {
      if (location.href !== submittedFrom) return;
      termNavigationPending = false;
      resetCoursePresentation(selectedTerm().key, true);
      scheduleCourseTableRefresh(0);
    }, 1500);
  }, true);
  window.addEventListener("popstate", () => {
    clearTimeout(termNavigationFallbackTimer);
    termNavigationPending = false;
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    scheduleCourseTableRefresh(0);
  });
  window.addEventListener("focus", () => {
    if (!document.documentElement.classList.contains(ACTIVE_CLASS) ||
      renderedCourseState.mode !== "legacy-error") return;
    const term = selectedTerm();
    if (!term.key || term.key !== renderedCourseState.key ||
      !shouldUseLegacyTerm(term.year, term.semester)) return;
    requestLegacyRefresh(term);
  });

  let observedCourseLocation = location.href;
  setInterval(() => {
    if (document.hidden) return;
    if (location.href === observedCourseLocation) return;
    observedCourseLocation = location.href;
    clearTimeout(termNavigationFallbackTimer);
    termNavigationPending = false;
    legacyRequestGeneration += 1;
    pendingLegacyTermKey = "";
    scheduleCourseTableRefresh(0);
  }, 300);
})();
