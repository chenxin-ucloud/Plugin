// 使用 chrome.storage.session 持久化状态，防止 Service Worker 被终止后状态丢失
// chrome.storage.session 数据仅在浏览器会话期间保留，不会写入磁盘

let capturedRequests = [];
let capturing = false;
let captureComplete = false;
let captureStartTime = 0;

const CAPTURE_DURATION = 15000; // 15秒捕获时间

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
        // 捕获仍在时间窗口内，继续捕获
        capturing = true;
        captureStartTime = data.captureStartTime;
        // 设置剩余时间的定时器
        setTimeout(() => {
          capturing = false;
          captureComplete = true;
          saveState();
        }, CAPTURE_DURATION - elapsed);
      } else {
        // 已超时，标记为完成
        capturing = false;
        captureComplete = true;
        saveState();
      }
    }
  }
);

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
    if (!capturing) return;
    if (details.type !== "xmlhttprequest") return;
    // 精准匹配：只捕获包含 ?Action=GetRegion 的请求
    if (!details.url.includes("?Action=GetRegion")) return;

    // 已捕获到匹配请求，忽略后续重复请求
    if (capturedRequests.length > 0) return;

    capturedRequests.push({
      url: details.url,
      headers: details.requestHeaders || []
    });
    // 匹配到第一个即停止捕获
    capturing = false;
    captureComplete = true;
    saveState();
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCapture") {
    capturedRequests = [];
    capturing = true;
    captureComplete = false;
    captureStartTime = Date.now();
    saveState();

    // 15秒后自动停止捕获
    setTimeout(() => {
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
    capturing = false;
    captureComplete = false;
    captureStartTime = 0;
    saveState();
    sendResponse({ ok: true });
  }
  return true;
});
