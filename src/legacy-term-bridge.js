(() => {
  "use strict";

  const requestId = new URLSearchParams(location.search).get("plato_classic_bridge");
  if (!requestId) return;
  const authenticationRequired = document.body.classList.contains("notloggedin") ||
    document.documentElement.classList.contains("html_login") ||
    document.body.id === "page-login-index" ||
    Boolean(document.querySelector("form[action*='/login/index.php'] input[name='username']"));
  if (authenticationRequired) {
    chrome.runtime.sendMessage({
      type: "platoClassic.legacyTermBridgeResult",
      requestId,
      authRequired: true,
      courses: []
    });
    return;
  }

  const normalize = (value = "") => value.replace(/\s+/g, " ").trim();
  const cleanProfessorName = (value = "") => {
    const parts = normalize(value)
      .replace(/^(?:담당\s*)?교수\s*[:：]?\s*/, "")
      .split(" ")
      .filter(Boolean);
    return parts.filter((part, index) => !(
      /^[가-힣]$/.test(part) && parts[index + 1]?.startsWith(part)
    )).join(" ");
  };
  const readProfessorName = (link) => {
    const row = link.closest("tr") || link.parentElement;
    const professor = row?.querySelector(
      ".professors .text-truncate, .professor-name, .course-professor, .professor, .teacher, " +
      "[data-field='professor'], [data-region='professor']"
    );
    if (professor) return cleanProfessorName(professor.textContent);
    const group = row?.querySelector(".professors");
    if (!group) return "";
    const copy = group.cloneNode(true);
    copy.querySelectorAll(".csms-avata, .userinitials, img, svg").forEach((node) => node.remove());
    return cleanProfessorName(copy.textContent);
  };
  const courseLinks = [...document.querySelectorAll(
    "a.coursefullname[href*='/course/view.php'], .table-coursemos tbody.my-course-lists a[href*='/course/view.php?id=']"
  )];
  const courses = courseLinks
    .map((link) => {
      const href = (() => {
        try {
          const url = new URL(link.getAttribute("href") || "", location.origin);
          const courseId = url.searchParams.get("id") || "";
          const unsafeQuery = ["sesskey", "confirm", "delete", "action"].some(
            (name) => url.searchParams.has(name)
          );
          return url.origin === "https://dev-plato.pusan.ac.kr" &&
            url.pathname === "/course/view.php" && /^\d+$/.test(courseId) && !unsafeQuery
            ? url.href
            : "";
        } catch {
          return "";
        }
      })();
      return {
        href,
        title: normalize(link.textContent),
        professor: readProfessorName(link)
      };
    })
    .filter((course, index, items) =>
      course.title &&
      /^https:\/\/dev-plato\.pusan\.ac\.kr\/course\/view\.php\?/.test(course.href) &&
      items.findIndex((item) => item.href === course.href) === index
    )
    .slice(0, 100);

  const emptyTextPattern =
    /(?:강좌|교과목|조회\s*결과).*(?:없습니다|없음)|no\s+(?:courses?|data)|nothing\s+to\s+display/i;
  const recognizedList = document.querySelector(
    ".table-coursemos tbody.my-course-lists"
  );
  const recognizedEmptyList = Boolean(recognizedList) && (
    !normalize(recognizedList.textContent) ||
    emptyTextPattern.test(normalize(recognizedList.textContent))
  );
  const explicitEmpty = [...document.querySelectorAll(
    ".table-coursemos .no-data, .table-coursemos .no-course, " +
    ".table-coursemos .nocourse, .course-list-empty, .allcourse-no-data, " +
    "[data-region='empty-message']"
  )].some((node) => emptyTextPattern.test(normalize(node.textContent)));

  const emptyPage = recognizedEmptyList || explicitEmpty;
  if (!courses.length && (courseLinks.length || !emptyPage)) {
    chrome.runtime.sendMessage({
      type: "platoClassic.legacyTermBridgeResult",
      requestId,
      unavailable: true,
      courses: []
    });
    return;
  }

  chrome.runtime.sendMessage({
    type: "platoClassic.legacyTermBridgeResult",
    requestId,
    empty: courses.length === 0,
    courses
  });
})();
