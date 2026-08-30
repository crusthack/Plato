"use strict";

const LEGACY_HOME_URL = "https://dev-plato.pusan.ac.kr/";
const CACHE_LIFETIME = 5 * 60 * 1000;
const LEGACY_TAB_TIMEOUT = 12 * 1000;
const COURSE_CACHE_KEY = "platoClassicCourseCache";
const CURRENT_ORIGIN = "https://plato.pusan.ac.kr";
const LEGACY_ORIGIN = "https://dev-plato.pusan.ac.kr";
const MAX_CACHED_COURSES = 100;
const LEGACY_COURSE_ANCHOR_PATTERN =
  /<a\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bcoursefullname\b[^"']*["'])(?=[^>]*\bhref\s*=\s*["'][^"']*\/course\/view\.php\?[^"']*\bid=\d+[^"']*["'])[^>]*>/i;
let legacyHomeCache = null;
let courseCacheMemory = null;
const pendingLegacyTabs = new Map();

const senderMatches = (sender, origin, pathPrefix = "/") => {
  if (sender?.id !== chrome.runtime.id) return false;
  try {
    const url = new URL(sender.url || sender.tab?.url || "");
    return url.origin === origin && url.pathname.startsWith(pathPrefix);
  } catch {
    return false;
  }
};

const compactText = (value, maxLength = 240) => String(value || "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const normalizeCourseCache = (cache) => {
  if (!cache || !Array.isArray(cache.courses)) return null;

  const coursesById = new Map();
  cache.courses.slice(0, MAX_CACHED_COURSES * 2).forEach((course) => {
    const courseId = compactText(course?.courseId, 20);
    const title = compactText(course?.title);
    if (!/^\d+$/.test(courseId) || !title) return;

    const normalized = {
      courseId,
      href: `${CURRENT_ORIGIN}/course/view.php?id=${encodeURIComponent(courseId)}`,
      title,
      professor: compactText(course?.professor),
      term: compactText(course?.term, 120),
      courseType: compactText(course?.courseType, 80),
      level: compactText(course?.level, 80)
    };
    const previous = coursesById.get(courseId);
    if (!previous || normalized.title.length > previous.title.length) {
      coursesById.set(courseId, normalized);
    }
  });

  const updatedAt = Number(cache.updatedAt);
  return {
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
    courses: [...coursesById.values()].slice(0, MAX_CACHED_COURSES)
  };
};

const readCourseCache = async () => {
  if (courseCacheMemory) return courseCacheMemory;
  if (!chrome.storage?.session) return null;

  const stored = await new Promise((resolve) => {
    chrome.storage.session.get({ [COURSE_CACHE_KEY]: null }, (values) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(values[COURSE_CACHE_KEY]);
    });
  });
  courseCacheMemory = normalizeCourseCache(stored);
  return courseCacheMemory;
};

const writeCourseCache = async (cache) => {
  const normalized = normalizeCourseCache(cache);
  if (!normalized) throw new Error("invalid course cache");
  courseCacheMemory = normalized;
  if (!chrome.storage?.session) return normalized;

  await new Promise((resolve, reject) => {
    chrome.storage.session.set({ [COURSE_CACHE_KEY]: normalized }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
  return normalized;
};

// Remove course metadata written by earlier builds; navigation cache is session-only now.
chrome.storage.local.remove(COURSE_CACHE_KEY, () => void chrome.runtime.lastError);

const fetchLegacyHome = async () => {
  if (legacyHomeCache && Date.now() - legacyHomeCache.savedAt < CACHE_LIFETIME) {
    return legacyHomeCache.html;
  }

  const response = await fetch(LEGACY_HOME_URL, {
    cache: "no-store",
    credentials: "omit"
  });
  if (!response.ok) throw new Error(`legacy home returned ${response.status}`);
  const html = await response.text();
  legacyHomeCache = { html, savedAt: Date.now() };
  return html;
};

const legacyTermUrl = (year, semester, bridgeId = "") => {
  const numericYear = Number(year);
  const allowedSemesters = new Set(["10", "11", "12", "20", "21", "22"]);
  if (!Number.isInteger(numericYear) || numericYear < 2014 || numericYear > 2100) {
    throw new Error("invalid year");
  }
  if (!allowedSemesters.has(String(semester))) throw new Error("invalid semester");

  const url = new URL("https://dev-plato.pusan.ac.kr/local/ubion/user/index.php");
  url.searchParams.set("year", String(numericYear));
  url.searchParams.set("semester", String(semester));
  if (bridgeId) url.searchParams.set("plato_classic_bridge", bridgeId);
  return url;
};

const closeLegacyTab = (tabId) => {
  if (!Number.isInteger(tabId)) return;
  chrome.tabs.remove(tabId, () => void chrome.runtime.lastError);
};

const isSafeLegacyCourse = (course) => {
  if (typeof course?.title !== "string" || !course.title.trim()) return false;
  try {
    const url = new URL(course.href || "");
    const unsafeQuery = ["sesskey", "confirm", "delete", "action"].some(
      (name) => url.searchParams.has(name)
    );
    return url.origin === "https://dev-plato.pusan.ac.kr" &&
      url.pathname === "/course/view.php" &&
      /^\d+$/.test(url.searchParams.get("id") || "") && !unsafeQuery;
  } catch {
    return false;
  }
};

const fetchLegacyTermInTab = (year, semester) => new Promise((resolve, reject) => {
  const requestId = crypto.randomUUID();
  const url = legacyTermUrl(year, semester, requestId);
  const pending = { requestId, tabId: null, timer: null, resolve, reject };
  pendingLegacyTabs.set(requestId, pending);

  chrome.tabs.create({ url: url.href, active: false }, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      pendingLegacyTabs.delete(requestId);
      reject(new Error(chrome.runtime.lastError?.message || "legacy tab unavailable"));
      return;
    }
    if (!pendingLegacyTabs.has(requestId)) {
      closeLegacyTab(tab.id);
      return;
    }
    pending.tabId = tab.id;
    pending.timer = setTimeout(() => {
      pendingLegacyTabs.delete(requestId);
      closeLegacyTab(tab.id);
      reject(new Error("legacy login session unavailable"));
    }, LEGACY_TAB_TIMEOUT);
  });
});

const fetchLegacyTerm = async (year, semester) => {
  const numericYear = Number(year);
  legacyTermUrl(numericYear, semester);

  const url = legacyTermUrl(numericYear, semester);
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "include"
  });
  if (!response.ok) throw new Error(`legacy term returned ${response.status}`);
  const html = await response.text();
  let result;
  if (LEGACY_COURSE_ANCHOR_PATTERN.test(html)) {
    result = { html, source: "fetch" };
  } else {
    const courses = await fetchLegacyTermInTab(numericYear, semester);
    result = { courses, source: "tab" };
  }
  return result;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "platoClassic.legacyTermBridgeResult") {
    if (!senderMatches(sender, LEGACY_ORIGIN, "/local/ubion/user/")) return false;
    const pending = pendingLegacyTabs.get(message.requestId);
    if (!pending) return false;
    if (pending.tabId !== null && sender.tab?.id !== pending.tabId) return false;

    clearTimeout(pending.timer);
    pendingLegacyTabs.delete(message.requestId);
    closeLegacyTab(sender.tab?.id || pending.tabId);
    if (message.authRequired === true) {
      pending.reject(new Error("legacy authentication required"));
      sendResponse({ ok: true });
      return false;
    }
    if (message.unavailable === true) {
      pending.reject(new Error("legacy term page unavailable"));
      sendResponse({ ok: true });
      return false;
    }
    const courses = Array.isArray(message.courses)
      ? message.courses.filter(isSafeLegacyCourse).slice(0, 100)
      : [];
    if (courses.length || message.empty === true) {
      pending.resolve(courses);
    } else {
      pending.reject(new Error("legacy term page unavailable"));
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "platoClassic.fetchLegacyTerm") {
    if (!senderMatches(sender, CURRENT_ORIGIN)) {
      sendResponse({ ok: false, error: "unauthorized sender" });
      return false;
    }
    fetchLegacyTerm(message.year, message.semester)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "platoClassic.fetchLegacyCourses") {
    if (!senderMatches(sender, CURRENT_ORIGIN)) {
      sendResponse({ ok: false, error: "unauthorized sender" });
      return false;
    }
    fetchLegacyHome()
      .then((html) => sendResponse({ ok: true, html }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "platoClassic.getCourseCache") {
    if (!senderMatches(sender, CURRENT_ORIGIN)) {
      sendResponse({ ok: false, error: "unauthorized sender" });
      return false;
    }
    readCourseCache()
      .then((cache) => sendResponse({ ok: true, cache }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "platoClassic.setCourseCache") {
    if (!senderMatches(sender, CURRENT_ORIGIN)) {
      sendResponse({ ok: false, error: "unauthorized sender" });
      return false;
    }
    writeCourseCache(message.cache)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
