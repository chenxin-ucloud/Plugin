const startBtn = document.getElementById("startBtn");
const status = document.getElementById("status");
const requestListEl = document.getElementById("requestList");
const headerInfo = document.getElementById("headerInfo");
const cookieVal = document.getElementById("cookieVal");
const csrfVal = document.getElementById("csrfVal");

let pollTimer = null;
let requests = [];

startBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startCapture" }, () => {
    status.textContent = "正在重新加载页面...";
    requestListEl.style.display = "none";
    headerInfo.style.display = "none";
    requestListEl.innerHTML = "";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id, () => {
          status.textContent = "正在捕获请求...";
          startPolling();
        });
      }
    });
  });
});

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  let count = 0;
  pollTimer = setInterval(() => {
    count++;
    chrome.runtime.sendMessage({ action: "getRequests" }, (res) => {
      if (!res) return;
      requests = res.requests;
      status.textContent = `已捕获 ${requests.length} 个 XHR 请求...`;
      renderList();

      // Stop polling after 5 seconds or 30 ticks
      if (count >= 30) {
        clearInterval(pollTimer);
        pollTimer = null;
        status.textContent = `完成，共 ${requests.length} 个 XHR 请求`;
      }
    });
  }, 500);
}

function getUrlName(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : pathname;
  } catch {
    return url;
  }
}

function renderList() {
  if (requests.length === 0) return;
  requestListEl.style.display = "block";
  requestListEl.innerHTML = "";

  requests.forEach((req, i) => {
    const div = document.createElement("div");
    div.className = "request-item" + (i === 0 ? " selected" : "");
    div.textContent = getUrlName(req.url);
    div.title = req.url;
    div.addEventListener("click", () => selectRequest(i));
    requestListEl.appendChild(div);
  });

  selectRequest(0);
}

function selectRequest(index) {
  document.querySelectorAll(".request-item").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  const req = requests[index];
  if (!req) return;

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
