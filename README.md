# XHR Header Extractor

Chrome 浏览器扩展，自动捕获页面中 `?Action=GetRegion` 请求，提取请求头中的 Cookie 和 u-csrf-token 值，支持一键复制。

## 功能

- 一键重新加载页面并精准捕获 `?Action=GetRegion` 请求
- 匹配到第一个目标请求后自动停止，直接展示 Cookie 和 u-csrf-token
- 一键复制 Cookie / u-csrf-token 到剪贴板
- 捕获状态持久化，Service Worker 重启后自动恢复
- 兼容 Windows / Mac 版 Chrome

## 安装

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目目录

## 使用

1. 打开目标网页
2. 点击浏览器工具栏中的扩展图标
3. 点击「开始抓取」按钮
4. 页面自动重新加载，扩展捕获匹配请求后直接展示结果
5. 点击复制按钮获取所需的值

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
| `tabs` | 查询当前标签页 |
| `scripting` | 在页面内执行 reload（避免弹窗关闭） |
| `storage` | 持久化捕获状态（防止 Service Worker 重启丢失） |
| `clipboardWrite` | 复制到剪贴板 |
| `<all_urls>` | 监听所有域名的请求 |
