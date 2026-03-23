let capturedRequests = [];
let capturing = false;

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
    sendResponse({ ok: true });
  } else if (message.action === "getRequests") {
    const sorted = [...capturedRequests].sort((a, b) => {
      const nameA = getUrlName(a.url);
      const nameB = getUrlName(b.url);
      return nameA.localeCompare(nameB);
    });
    sendResponse({ requests: sorted });
  } else if (message.action === "clearRequests") {
    capturedRequests = [];
    capturing = false;
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
