# XHR Header Extractor

Chrome 浏览器扩展，自动捕获页面 XHR 请求，提取请求头中的 Cookie 和 u-csrf-token 值，支持一键复制。

## 功能

- 一键重新加载页面并捕获所有 XHR 请求
- 请求列表按 Name（URL 路径末段）升序排列
- 自动选中第一个请求，展示 Cookie 和 u-csrf-token
- 点击列表项可切换查看不同请求的头信息
- 一键复制 Cookie / u-csrf-token 到剪贴板

## 安装

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目目录

## 使用

1. 打开目标网页
2. 点击浏览器工具栏中的扩展图标
3. 点击「开始抓取」按钮
4. 页面自动重新加载，扩展捕获所有 XHR 请求
5. 在请求列表中查看结果，点击复制所需的值

## 文件结构

```
Plugin/
├── manifest.json   # MV3 扩展清单
├── background.js   # Service Worker - 监听网络请求
├── popup.html      # 弹窗 UI
├── popup.js        # 弹窗逻辑
├── popup.css       # 样式
└── README.md
```

## 权限说明

| 权限 | 用途 |
|------|------|
| `webRequest` | 监听网络请求头 |
| `activeTab` | 访问当前活动标签页 |
| `tabs` | 重新加载页面 |
| `clipboardWrite` | 复制到剪贴板 |
| `<all_urls>` | 监听所有域名的请求 |
