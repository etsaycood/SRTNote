# Security Policy / 安全性政策

## 架構與隱私說明

**SRTNote** 為純前端本地運行（Local-first）的學習與筆記工具：
- 本機檔案存取（影片、音訊、PDF 簡報、SRT 逐字稿）均透過瀏覽器 File System Access API 或本地記憶體處理，不上傳至任何私有後端伺服器。
- AI 整理功能預設連線至使用者本機的 OpenAI 相容端點（例如 LM Studio `http://127.0.0.1:1234/v1`）。
- 僅在使用者主動點擊「雲端分享」時，才會將對應筆記設定（不含本機簡報圖片）上傳至第三方公開匿名儲存服務（Pastes.dev / dpaste / JSONBlob）。

---

## 支援版本 / Supported Versions

目前僅對 `main` 分支最新發布版本提供安全性修復與更新：

| Version | Supported |
| ------- | --------- |
| `main` (`v1.2.x`) | :white_check_mark: |
| `< 1.2.0` | :x: |

---

## 回報安全性漏洞 / Reporting a Vulnerability

**請勿直接在公開 GitHub Issues 揭露尚未修復的安全性漏洞。**

若您發現任何安全隱憂（例如 XSS、依賴套件漏洞、不當的外部請求或 HTML 淨化問題），請透過 GitHub 私人安全通報機制進行回報：

1. 前往本專案的 **Security → Advisories** 頁面：
   https://github.com/etsaycood/SRTNote/security/advisories/new
2. 詳細說明漏洞細節、影響範圍與重現方式（若能提供 PoC 或建議修復方向更佳）。

我們會在收到通報後盡快檢視與確認，並於修復完成及發布後同步說明。
