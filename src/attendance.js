(() => {
  "use strict";

  // Recalculate the "내 출석현황" rate so that unprocessed / cancelled classes ("-")
  // are excluded:
  //   (출석 + 지각 + 조퇴 + 지각조퇴) / (출석 + 결석 + 지각 + 조퇴 + 지각조퇴)
  const STATUS = { present: "1", absent: "2", late: "3", lateEarly: "5", early: "6", none: "0" };

  const readCount = (root, status) => {
    const node = root.querySelector(`.status-item[data-status="${status}"] .count`);
    const value = Number.parseInt(String(node?.textContent || "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(value) ? value : 0;
  };

  const guideText = (rate) => {
    if (rate === null) return ["아직 출결이 처리된 수업이 없습니다.", ""];
    if (rate >= 100) return ["처리된 모든 수업에 <span>출석</span>했습니다.", "지금처럼 꾸준히 참여해 주세요."];
    if (rate >= 90) return ["출석 상태가 <span>좋습니다.</span>", "지금처럼 꾸준히 참여해 주세요."];
    if (rate >= 80) return ["놓친 수업이 <span>조금 있습니다.</span>", "남은 수업도 빠지지 않도록 챙겨 주세요."];
    return ["놓친 수업이 <span>많습니다.</span>", "앞으로는 출석을 우선 순위로 두면 성적에도 긍정적인 변화가 있을 거에요."];
  };

  const formatRate = (rate) => `${Number(rate.toFixed(2))}%`;

  const recalculate = () => {
    const container = document.querySelector(".my-userinfo-attendance-container");
    if (!container || container.dataset.classicRate) return;

    const count = Object.fromEntries(
      Object.entries(STATUS).map(([key, status]) => [key, readCount(container, status)])
    );
    const attended = count.present + count.late + count.early + count.lateEarly;
    const processed = attended + count.absent;
    const rate = processed > 0 ? (attended / processed) * 100 : null;

    const progress = container.querySelector(".progress[role='progressbar']");
    const bar = container.querySelector(".progress-bar");
    const percent = container.querySelector(".desc-percent");
    const info = container.querySelector(".header-header-info");
    const body = container.querySelector(".attendance-guide-progress");
    const guide = container.querySelector(".attendance-guide");
    const originalRate = percent?.textContent.trim() || "";

    container.dataset.classicRate = rate === null ? "none" : rate.toFixed(2);
    if (progress) progress.setAttribute("aria-valuenow", rate === null ? "0" : rate.toFixed(2));
    if (bar) bar.style.width = `${rate === null ? 0 : rate}%`;
    if (percent) {
      percent.textContent = rate === null ? "-" : formatRate(rate);
      if (originalRate) percent.title = `PLATO 기본 계산(결강·미처리 포함): ${originalRate}`;
    }

    if (info) {
      const number = (value) => {
        const span = document.createElement("span");
        span.textContent = String(value);
        return span;
      };
      info.replaceChildren(
        "출결 처리 ", number(processed), "개 중 ", number(attended), "개 출석"
      );
      if (count.none > 0) info.append(` (결강·미처리 ${count.none}개 제외)`);
    }

    if (body && rate !== null) {
      [...body.classList]
        .filter((name) => /^level-\d+$/.test(name))
        .forEach((name) => body.classList.remove(name));
      body.classList.add(`level-${Math.min(100, Math.floor(rate / 10) * 10)}`);
    }

    if (guide) {
      const [first, second] = guideText(rate);
      const lines = [first, second].filter(Boolean).map((html) => {
        const p = document.createElement("p");
        p.innerHTML = html; // fixed strings above only
        return p;
      });
      guide.replaceChildren(...lines);
    }
  };

  chrome.storage.local.get({ classicEnabled: true, dashboardEnabled: true }, (settings) => {
    if (settings.classicEnabled === false || settings.dashboardEnabled === false) return;
    recalculate();
  });
})();
