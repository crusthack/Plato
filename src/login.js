(() => {
  "use strict";

  const SHELL_ID = "plato-classic-login";
  const SOURCE_CLASS = "plato-classic-login-source";
  const ACTIVE_CLASS = "plato-classic-login-active";
  const PRODUCTION_LOGIN_URL = "https://plato.pusan.ac.kr/login/index.php";

  if (location.pathname !== "/" && location.pathname !== "/index.php") return;
  if (!document.body.classList.contains("notloggedin")) return;

  const normalize = (value = "") => value.replace(/\s+/g, " ").trim();
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];

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

  const unique = (items, key) => {
    const seen = new Set();
    return items.filter((item) => {
      const value = key(item);
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  const safeCourseHref = (value = "") => {
    try {
      const url = new URL(value, "https://plato.pusan.ac.kr/");
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

  const sourceRoot =
    document.querySelector("#page-wrapper") ||
    document.querySelector("#page");
  if (!sourceRoot) return;

  const readNotices = () => unique(
    all(".open-notice-card-item a[href], a[href*='/mod/ubboard/article.php']", sourceRoot)
      .map((link) => {
        const item = link.closest("li, article, .row") || link.parentElement;
        const date = normalize(item?.querySelector(".notice-date, .date, time")?.textContent);
        return { href: link.href, title: normalize(link.textContent), date };
      })
      .filter((item) => item.title),
    (item) => item.href
  ).slice(0, 3);

  const readCourseSections = () => {
    const cards = unique(
      all(".open-course-list a.course-card[href]", sourceRoot).map((link) => {
        const heading = link.querySelector("h4, h5, .course-name");
        const thumbnail = link.querySelector(".course-thumbnail, img");
        const background = thumbnail?.style?.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1];
        const type = normalize(link.querySelector(".course-info-tags")?.textContent);
        const category = normalize(link.querySelector(".course-semester, .course-category")?.textContent);
        const status = normalize(link.querySelector(".course-status")?.textContent);
        return {
          href: safeCourseHref(link.href),
          title: normalize(heading?.textContent || link.textContent),
          image: thumbnail?.currentSrc || thumbnail?.src || background || "",
          category: [category, status].filter(Boolean).join(" · "),
          type: type.replace(/[\s·ㆍ]/g, "")
        };
      }).filter((item) => item.href && item.title),
      (item) => item.href
    );

    const forType = (...labels) => cards
      .filter((course) => labels.some((label) => course.type.includes(label)))
      .slice(0, 4);
    return [
      {
        title: "교수학습",
        href: "https://plato.pusan.ac.kr/local/ubonline/index.php?cgroup=2",
        legacyPath: "/local/ubteaching/",
        links: forType("교수학습")
      },
      {
        title: "지정강좌",
        href: "https://plato.pusan.ac.kr/local/ubonline/index.php?cgroup=1",
        legacyPath: "/local/ubonline/",
        links: forType("지정강좌", "비교과")
      },
      {
        title: "자율강좌",
        href: "https://plato.pusan.ac.kr/local/ubeclass/index.php",
        legacyPath: "/local/ubeclass/",
        links: forType("자율강좌", "eclass")
      },
      {
        title: "PNU ON",
        href: "https://plato.pusan.ac.kr/local/opencontent/index.php",
        links: forType("PNUON")
      }
    ];
  };

  const readLegacyCourseSections = (legacyDocument) => all(".course-latest", legacyDocument)
    .map((section) => {
      const title = normalize(section.querySelector(".latest-title, h3")?.textContent);
      const href = new URL(
        section.querySelector(".latest-title a[href]")?.getAttribute("href") || "/",
        "https://dev-plato.pusan.ac.kr/"
      ).href;
      const links = unique(
        all(".swiper-slide-course a[href]", section).map((link) => {
          const image = link.querySelector(".course-image img, img");
          return {
            href: safeCourseHref(new URL(link.getAttribute("href") || "", "https://dev-plato.pusan.ac.kr/").href),
            title: normalize(link.querySelector(".course-name")?.textContent || link.textContent),
            image: image?.currentSrc || image?.src || "",
            category: normalize(link.querySelector(".course-category")?.textContent)
          };
        }).filter((item) => item.href && item.title),
        (item) => item.href
      ).slice(0, 4);
      return { title, href, links };
    })
    .filter((section) => section.title && section.links.length);

  const readCurrentListingCourses = (page) => unique(
    all(".ubion-allcourse-course-list a.course-card[href], a.course-card.oc-card[href]", page).map((link) => {
      const thumbnail = link.querySelector(".course-thumbnail, img");
      const background = thumbnail?.style?.backgroundImage?.match(/url\(["']?(.*?)["']?\)/)?.[1];
      const rawImage = thumbnail?.getAttribute("src") || background || "";
      return {
        href: safeCourseHref(new URL(link.getAttribute("href") || "", "https://plato.pusan.ac.kr/").href),
        title: normalize(link.querySelector("h4, h5, .course-name")?.textContent || link.textContent),
        image: rawImage ? new URL(rawImage, "https://plato.pusan.ac.kr/").href : "",
        category: normalize(link.querySelector(".course-info-tags, .course-semester, .course-category")?.textContent)
      };
    }).filter((item) => item.href && item.title),
    (item) => item.href
  ).slice(0, 4);

  const requestLegacyCourseSections = () => new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "platoClassic.fetchLegacyCourses" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok || !response.html) {
        resolve([]);
        return;
      }
      const legacyDocument = new DOMParser().parseFromString(response.html, "text/html");
      resolve(readLegacyCourseSections(legacyDocument));
    });
  });

  const requestCurrentPnuOnCourses = async () => {
    try {
      const response = await fetch("https://plato.pusan.ac.kr/local/opencontent/index.php", {
        method: "GET",
        credentials: "omit",
        cache: "no-store"
      });
      if (!response.ok) return [];
      return readCurrentListingCourses(new DOMParser().parseFromString(await response.text(), "text/html"));
    } catch {
      return [];
    }
  };

  const loadLegacyCourseSections = async (container, initialSections) => {
    const [legacySections, pnuOnCourses] = await Promise.all([
      requestLegacyCourseSections(),
      requestCurrentPnuOnCourses()
    ]);
    const mergedSections = initialSections.map((section) => {
      const legacy = section.legacyPath
        ? legacySections.find((candidate) => {
          try {
            return new URL(candidate.href).pathname.startsWith(section.legacyPath);
          } catch {
            return false;
          }
        })
        : null;
      const supplements = section.title === "PNU ON" ? pnuOnCourses : (legacy?.links || []);
      const links = unique([...section.links, ...supplements], (course) => normalize(course.title).toLowerCase())
        .slice(0, 4);
      return { ...section, links };
    });
    container.replaceChildren(...mergedSections.map(makeCourseLatest));
  };

  const activateLoginForm = (form) => {
    const submit = form.querySelector("[name='loginbutton']");
    if (!submit) throw new Error("classic login submit button is unavailable");

    fetch("https://plato.pusan.ac.kr/login/index.php", {
      credentials: "same-origin",
      cache: "no-store"
    })
      .then((response) => {
        if (!response.ok) throw new Error("login page unavailable");
        return response.text();
      })
      .then((html) => {
        const page = new DOMParser().parseFromString(html, "text/html");
        const universityTab = page.querySelector("input[name='logintab'][value='univ']");
        const officialForm = universityTab?.closest("form") || page.querySelector("form[action*='/login/index.php']");
        if (!officialForm) throw new Error("official login form unavailable");

        const allowedHiddenInputs = new Set(["anchor", "logintoken", "logintab"]);
        all("input[type='hidden'][name]", officialForm)
          .filter((officialInput) => allowedHiddenInputs.has(officialInput.name))
          .forEach((officialInput) => {
            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = officialInput.name;
            hidden.value = officialInput.value;
            form.append(hidden);
          });

        form.action = PRODUCTION_LOGIN_URL;
        submit.disabled = false;
        submit.textContent = "로그인";
      })
      .catch(() => {
        submit.disabled = false;
        submit.type = "button";
        submit.textContent = "공식 로그인 열기";
        submit.addEventListener("click", () => {
          location.href = PRODUCTION_LOGIN_URL;
        });
      });

    form.addEventListener("submit", () => {
      form.action = PRODUCTION_LOGIN_URL;
    });

    return form;
  };

  const activateStaticCarousel = (header) => {
    const carousel = header.querySelector("#carousel-image");
    if (!carousel || carousel.dataset.classicCarouselReady === "true") return;
    const slides = all(".carousel-item", carousel);
    const states = all(".carousel-state", carousel);
    const indicators = all(".carousel-indicators [data-slide-to]", carousel);
    if (slides.length < 2 || slides.length !== indicators.length || slides.length !== states.length) return;
    carousel.dataset.classicCarouselReady = "true";

    let current = 0;
    let timer = 0;
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      states[current].checked = true;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle("active", active);
        slide.setAttribute("aria-hidden", String(!active));
      });
      indicators.forEach((indicator, indicatorIndex) => {
        const active = indicatorIndex === current;
        indicator.classList.toggle("active", active);
        if (active) indicator.setAttribute("aria-current", "true");
        else indicator.removeAttribute("aria-current");
      });
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      stop();
      if (document.hidden) return;
      timer = window.setInterval(() => show(current + 1), 6000);
    };

    states.forEach((state, index) => {
      state.addEventListener("change", () => {
        if (!state.checked) return;
        show(index);
        start();
      });
    });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) start();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    show(0);
    start();
  };

  const loadStaticLayout = async () => {
    const templateUrl = chrome.runtime.getURL("templates/login-classic-header.html");
    const response = await fetch(templateUrl, { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error(`classic header returned ${response.status}`);

    const templateDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const sourceHeader = templateDocument.querySelector("#plato-classic-login-header");
    const sourceForm = templateDocument.querySelector("#plato-classic-login-form-template")?.content
      ?.querySelector("#plato-classic-login-form");
    if (!sourceHeader || !sourceForm) throw new Error("classic header template is invalid");

    const header = document.importNode(sourceHeader, true);
    const loginForm = document.importNode(sourceForm, true);
    const logo = header.querySelector("[data-classic-asset='plato-logo']");
    if (logo) logo.src = chrome.runtime.getURL("assets/icons/plato-logo.png");
    const flag = loginForm.querySelector("[data-classic-asset='flag-ko']");
    if (flag) flag.src = chrome.runtime.getURL("assets/icons/flag-ko.png");

    const list = header.querySelector("[data-classic-notice-list]");
    if (!list) throw new Error("classic notice region is unavailable");
    const notices = readNotices();
    if (!notices.length) list.append(element("li", "list-item", "등록된 게시글이 없습니다."));
    notices.forEach((notice) => {
      const item = element("li", "list-item");
      const noticeLink = anchor("", notice.href, "list-item-link");
      noticeLink.append(element("span", "subject", notice.title));
      if (notice.date) noticeLink.append(element("span", "date", notice.date));
      item.append(noticeLink);
      list.append(item);
    });
    return { header, loginForm: activateLoginForm(loginForm) };
  };

  const makeSearch = () => {
    const search = element("section", "");
    search.id = "plato-classic-content-search";
    const container = element("div", "login-container");
    const form = element("form", "form-content-search");
    form.action = "https://plato.pusan.ac.kr/local/ubonline/search.php";
    form.method = "get";
    form.append(element("div", "search-title", "원하는 강좌, 콘텐츠를 찾아보세요"));
    const inputBox = element("div", "search-input");
    const input = element("input", "form-control required");
    input.type = "search";
    input.name = "search";
    input.placeholder = "검색어를 입력하세요.";
    const button = element("button", "btn btn-submit", "검색");
    button.type = "submit";
    inputBox.append(input, button);
    form.append(inputBox);
    container.append(form);
    search.append(container);
    return search;
  };

  const makeCourseLatest = (section) => {
    const latest = element("section", "course-latest");
    const header = element("div", "latest-header");
    const title = element("h3", "latest-title");
    title.append(anchor(section.title, section.href));
    header.append(title);

    const row = element("div", "course-grid");
    section.links.forEach((course) => {
      const card = anchor("", course.href, "course-card");
      const imageBox = element("div", "course-image");
      if (course.image) {
        const image = document.createElement("img");
        image.src = course.image;
        image.alt = "";
        image.loading = "lazy";
        imageBox.append(image);
      }
      const body = element("div", "course-body");
      if (course.category) body.append(element("div", "course-category", course.category));
      body.append(element("div", "course-name", course.title));
      card.append(imageBox, body);
      row.append(card);
    });
    if (!section.links.length) {
      const empty = element("div", "course-empty");
      empty.append(
        element("p", "", `${section.title} 강좌는 해당 페이지에서 확인할 수 있습니다.`),
        anchor("전체 강좌 보기", section.href, "course-empty-link")
      );
      row.append(empty);
    }
    latest.append(header, row);
    return latest;
  };

  const makeContent = () => {
    const content = element("main", "course-content");
    content.id = "plato-classic-content";
    const container = element("div", "login-container");
    const sections = readCourseSections();
    sections.forEach((section) => container.append(makeCourseLatest(section)));
    loadLegacyCourseSections(container, sections);
    content.hidden = !container.childElementCount;
    content.append(container);
    return content;
  };

  const makeFooter = () => {
    const footer = element("footer", "open-footer");
    footer.id = "open-footer";
    const container = element("div", "open-container");
    const logoBox = element("div", "open-footer-logo");
    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("assets/icons/footer-logo.svg");
    logo.alt = "PLATO";
    logoBox.append(logo);

    const divider = element("hr", "divider");
    const bottom = element("div", "open-footer-bottom");
    const info = element("div", "open-footer-info");
    const links = element("div", "open-footer-links");
    links.append(anchor("개인정보처리방침", "https://www.pusan.ac.kr/kor/CMS/Board/Board.do?mCode=MN186"));
    info.append(links, element("p", "open-footer-copy", "COPYRIGHT © Pusan National University. ALL RIGHTS RESERVED."));

    const family = element("div", "open-footer-family");
    const familyButton = element("button", "open-footer-family-input");
    familyButton.type = "button";
    familyButton.setAttribute("aria-expanded", "false");
    familyButton.append(document.createTextNode("FAMILY SITE"), element("span", "open-footer-family-btn", "이동"));
    const familyMenu = element("ul", "open-footer-family-menu");
    [
      ["부산대학교", "http://www.pusan.ac.kr"],
      ["학생지원시스템", "https://onestop.pusan.ac.kr"],
      ["교육정보시스템", "https://one.pusan.ac.kr"]
    ].forEach(([label, href]) => {
      const item = element("li", "");
      const link = anchor(label, href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
      familyMenu.append(item);
    });
    familyButton.addEventListener("click", () => {
      const open = family.classList.toggle("is-open");
      familyButton.setAttribute("aria-expanded", String(open));
    });
    family.append(familyButton, familyMenu);
    bottom.append(info, family);
    container.append(logoBox, divider, bottom);
    footer.append(container);
    return footer;
  };

  const install = async () => {
    const { header: staticHeader, loginForm } = await loadStaticLayout();
    if (document.getElementById("plato-classic-login-host")) return;

    const host = element("div", "");
    host.id = "plato-classic-login-host";
    host.hidden = true;
    loginForm.slot = "login-form";
    host.append(loginForm);
    const shadow = host.attachShadow({ mode: "open" });
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = chrome.runtime.getURL("styles/login.css");

    const shell = element("div", "");
    shell.id = SHELL_ID;
    const page = element("div", "");
    page.id = "plato-classic-login-page";
    page.append(staticHeader, makeSearch(), makeContent(), makeFooter());
    shell.append(page);

    shadow.append(stylesheet, shell);
    activateStaticCarousel(staticHeader);
    sourceRoot.classList.add(SOURCE_CLASS);
    sourceRoot.before(host);

    const applySettings = (settings) => {
      const enabled = settings.classicEnabled !== false && settings.loginEnabled !== false;
      host.hidden = !enabled;
      document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
      document.dispatchEvent(new CustomEvent("plato-classic-ready"));
    };

    const settingDefaults = { classicEnabled: true, loginEnabled: true };
    chrome.storage.local.get(settingDefaults, applySettings);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes.classicEnabled && !changes.loginEnabled) return;
      chrome.storage.local.get(settingDefaults, applySettings);
    });
  };

  install().catch(() => {
    document.documentElement.classList.remove(ACTIVE_CLASS);
    sourceRoot.classList.remove(SOURCE_CLASS);
    document.dispatchEvent(new CustomEvent("plato-classic-ready"));
  });

})();
