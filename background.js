// 使用 chrome.storage.session 持久化状态，防止 Service Worker 被终止后状态丢失

let capturedRequests = [];
let capturing = false;
let captureComplete = false;
let captureStartTime = 0;
let captureGeneration = 0; // 用于区分不同捕获会话，防止旧定时器干扰新会话
let stateRestored = false;

const CAPTURE_DURATION = 15000;
const MATCH_PATTERN = "Action=GetRegion";

// Service Worker 启动时，从 storage.session 恢复状态
chrome.storage.session.get(
  ["capturing", "captureComplete", "capturedRequests", "captureStartTime"],
  (data) => {
    if (data.capturedRequests) {
      capturedRequests = data.capturedRequests;
    }
    if (data.captureComplete) {
      captureComplete = data.captureComplete;
    }
    if (data.capturing && data.captureStartTime) {
      const elapsed = Date.now() - data.captureStartTime;
      if (elapsed < CAPTURE_DURATION) {
        capturing = true;
        captureStartTime = data.captureStartTime;
        setTimeout(() => {
          capturing = false;
          captureComplete = true;
          saveState();
        }, CAPTURE_DURATION - elapsed);
      } else {
        capturing = false;
        captureComplete = true;
        saveState();
      }
    }
    stateRestored = true;

    // 状态恢复后，处理缓冲区中在恢复前到达的请求
    processPendingRequests();
  }
);

// 缓冲区：存储状态恢复前到达的匹配请求，避免竞态条件丢失
let pendingRequests = [];

function processPendingRequests() {
  if (!capturing || capturedRequests.length > 0 || pendingRequests.length === 0) {
    pendingRequests = [];
    return;
  }
  // 取第一个匹配请求
  capturedRequests.push(pendingRequests[0]);
  capturing = false;
  captureComplete = true;
  pendingRequests = [];
  saveState();
}

function saveState() {
  chrome.storage.session.set({
    capturing,
    captureComplete,
    capturedRequests,
    captureStartTime
  });
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.type !== "xmlhttprequest") return;
    if (!details.url.includes(MATCH_PATTERN)) return;

    const req = { url: details.url, headers: details.requestHeaders || [] };

    // 状态尚未从 storage 恢复，先缓冲请求
    if (!stateRestored) {
      pendingRequests.push(req);
      return;
    }

    if (!capturing) return;
    if (capturedRequests.length > 0) return;

    capturedRequests.push(req);
    capturing = false;
    captureComplete = true;
    saveState();
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

// 保持 Service Worker 活跃：popup 通过 port 连接防止 SW 被终止
chrome.runtime.onConnect.addListener(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "startCapture") {
    capturedRequests = [];
    pendingRequests = [];
    capturing = true;
    captureComplete = false;
    captureStartTime = Date.now();
    captureGeneration++;
    const gen = captureGeneration;
    saveState();

    // 15秒后自动停止，通过 generation 确保只终止当前会话
    setTimeout(() => {
      if (captureGeneration !== gen) return; // 已被新的捕获取代，忽略
      capturing = false;
      captureComplete = true;
      saveState();
    }, CAPTURE_DURATION);

    sendResponse({ ok: true });
  } else if (message.action === "getRequests") {
    sendResponse({ requests: [...capturedRequests], capturing, complete: captureComplete });
  } else if (message.action === "getCaptureStatus") {
    sendResponse({ capturing, complete: captureComplete, count: capturedRequests.length });
  } else if (message.action === "clearRequests") {
    capturedRequests = [];
    pendingRequests = [];
    capturing = false;
    captureComplete = false;
    captureStartTime = 0;
    saveState();
    sendResponse({ ok: true });
  }
  return true;
});
