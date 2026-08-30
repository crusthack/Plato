(() => {
  "use strict";

  const DEFAULTS = {
    classicEnabled: true,
    loginEnabled: true,
    dashboardEnabled: true
  };

  const extensionName = chrome.runtime.getManifest().name.replace(/\s+\d+(?:\.\d+)+\s*$/, "");
  document.getElementById("extension-name").textContent = extensionName;
  document.title = `${extensionName} 설정`;

  const master = document.getElementById("classic-enabled");
  const login = document.getElementById("login-enabled");
  const dashboard = document.getElementById("dashboard-enabled");
  const details = document.getElementById("detail-settings");
  const description = document.getElementById("master-description");
  const status = document.getElementById("status");
  let statusTimer;

  const renderMasterState = () => {
    login.disabled = !master.checked;
    dashboard.disabled = !master.checked;
    details.classList.toggle("disabled", !master.checked);
    description.textContent = master.checked
      ? "이전 PLATO 화면을 사용합니다."
      : "학교 기본 UI를 그대로 표시합니다.";
  };

  const showSaved = () => {
    clearTimeout(statusTimer);
    status.textContent = "설정이 적용되었습니다.";
    statusTimer = setTimeout(() => {
      status.textContent = "";
    }, 1400);
  };

  const save = () => {
    const values = {
      classicEnabled: master.checked,
      loginEnabled: login.checked,
      dashboardEnabled: dashboard.checked
    };
    chrome.storage.local.set(values, showSaved);
  };

  chrome.storage.local.get(DEFAULTS, (values) => {
    master.checked = values.classicEnabled;
    login.checked = values.loginEnabled;
    dashboard.checked = values.dashboardEnabled;
    renderMasterState();
  });

  master.addEventListener("change", () => {
    renderMasterState();
    save();
  });
  login.addEventListener("change", save);
  dashboard.addEventListener("change", save);
})();
