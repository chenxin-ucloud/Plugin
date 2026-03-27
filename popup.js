const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");
const headerInfo = document.getElementById("headerInfo");
const cookieVal = document.getElementById("cookieVal");
const csrfVal = document.getElementById("csrfVal");

let pollTimer = null;

// 建立 port 连接，保持 Service Worker 在捕获期间不被终止
let keepAlivePort = null;

// popup 打开时，检查是否有正在进行或已完成的捕获，自动恢复状态
chrome.runtime.sendMessage({ action: "getCaptureStatus" }, (res) => {
  if (!res) return;
  if (res.capturing) {
    status.textContent = "正在捕获请求...";
    startBtn.textContent = "抓取中...";
    startBtn.disabled = true;
    startPolling();
  } else if (res.complete && res.count > 0) {
    chrome.runtime.sendMessage({ action: "getRequests" }, (res2) => {
      if (!res2 || res2.requests.length === 0) return;
      showHeaders(res2.requests[0]);
      status.textContent = "完成";
    });
  }
});

startBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0] ? tabs[0].id : null;
    chrome.runtime.sendMessage({ action: "startCapture" }, () => {
      status.textContent = "正在重新加载页面并捕获请求...";
      startBtn.textContent = "抓取中...";
      startBtn.disabled = true;
      headerInfo.style.display = "none";

      // 建立 port 连接保持 SW 活跃
      if (keepAlivePort) { keepAlivePort.disconnect(); }
      keepAlivePort = chrome.runtime.connect({ name: "keepalive" });

      // 等待页面加载完成后再 reload，避免快速连续操作时注入到正在卸载的旧页面
      if (tabId) {
        reloadWhenReady(tabId);
      }

      startPolling();
    });
  });
});

// 确保页面处于 complete 状态再执行 reload
function reloadWhenReady(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    if (tab.status === "complete") {
      doReload(tabId);
    } else {
      // 页面仍在加载（上次 reload 还没完成），等它加载完再 reload
      const listener = (id, info) => {
        if (id === tabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          doReload(tabId);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    }
  });
}

function doReload(tabId) {
  chrome.scripting.executeScript(
    { target: { tabId: tabId }, func: () => location.reload() },
    () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.reload(tabId);
      }
    }
  );
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  let count = 0;
  pollTimer = setInterval(() => {
    count++;
    chrome.runtime.sendMessage({ action: "getRequests" }, (res) => {
      if (!res) return;

      if (res.requests.length > 0) {
        clearInterval(pollTimer);
        pollTimer = null;
        if (keepAlivePort) { keepAlivePort.disconnect(); keepAlivePort = null; }
        showHeaders(res.requests[0]);
        status.textContent = "完成";
        startBtn.textContent = "开始抓取";
        startBtn.disabled = false;
        return;
      }

      if (res.complete || count >= 30) {
        clearInterval(pollTimer);
        pollTimer = null;
        if (keepAlivePort) { keepAlivePort.disconnect(); keepAlivePort = null; }
        status.textContent = "未捕获到匹配的请求";
        startBtn.textContent = "开始抓取";
        startBtn.disabled = false;
      }
    });
  }, 500);
}

function showHeaders(req) {
  const cookie = findHeader(req.headers, "cookie");
  const csrf = findHeader(req.headers, "u-csrf-token");
  cookieVal.textContent = cookie || "(未找到)";
  csrfVal.textContent = csrf || "(未找到)";
  headerInfo.style.display = "block";
}

function findHeader(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const text = document.getElementById(targetId).textContent;
    if (text && text !== "(未找到)") {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "已复制";
        setTimeout(() => (btn.textContent = "复制"), 1500);
      });
    }
  });
});
