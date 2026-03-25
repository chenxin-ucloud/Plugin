let capturedRequests = [];
let capturing = false;
let captureComplete = false;
let captureTimer = null;

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!capturing) return;
    if (details.type !== "xmlhttprequest") return;

    capturedRequests.push({
      url: details.url,
      headers: details.requestHeaders || []
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startCapture") {
    capturedRequests = [];
    capturing = true;
    captureComplete = false;

    // 15秒后自动停止捕获
    if (captureTimer) clearTimeout(captureTimer);
    captureTimer = setTimeout(() => {
      capturing = false;
      captureComplete = true;
      captureTimer = null;
    }, 15000);

    sendResponse({ ok: true });
  } else if (message.action === "getRequests") {
    const sorted = [...capturedRequests].sort((a, b) => {
      const nameA = getUrlName(a.url);
      const nameB = getUrlName(b.url);
      return nameA.localeCompare(nameB);
    });
    sendResponse({ requests: sorted, capturing: capturing, complete: captureComplete });
  } else if (message.action === "getCaptureStatus") {
    sendResponse({ capturing: capturing, complete: captureComplete, count: capturedRequests.length });
  } else if (message.action === "clearRequests") {
    capturedRequests = [];
    capturing = false;
    captureComplete = false;
    if (captureTimer) {
      clearTimeout(captureTimer);
      captureTimer = null;
    }
    sendResponse({ ok: true });
  }
  return true;
});

function getUrlName(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : pathname;
  } catch {
    return url;
  }
}
