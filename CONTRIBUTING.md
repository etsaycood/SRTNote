# 貢獻指南 / Contributing Guide

感謝您有興趣為 **SRTNote** 做出貢獻！無論是回報 Bug、提出功能建議、改善文件，或直接提交程式碼，我們都非常歡迎。

請先閱讀並遵守本專案的 [行為準則 (CODE_OF_CONDUCT.md)](./CODE_OF_CONDUCT.md)。

---

## 💻 本機開發環境設定

### 系統需求
- Node.js 18.0 或以上版本（建議 v20+）
- npm

### 安裝與啟動

```bash
# 1. Fork 本專案後 clone 至本機
git clone https://github.com/<your-username>/SRTNote.git
cd SRTNote

# 2. 安裝相依套件
npm install

# 3. 啟動本機開發伺服器 (預設 http://localhost:3000/)
npm run dev

# 4. 進行 TypeScript 型別檢查與生產環境建置
npm run build
```

---

## 🔀 提交 Pull Request 流程

1. 從最新 `main` 分支建立功能分支（例如 `feat/your-feature` 或 `fix/issue-description`）。
2. 進行修改並確保符合專案技術規範：
   - 使用 TypeScript 與 React Functional Components。
   - 保持純前端本地運作架構（不引入需要使用者資料上雲的強依賴）。
   - 若調整 UI，請同時測試 **亮色 (Light)** 與 **暗色 (Dark)** 主題以及桌機／行動版畫面。
   - 若新增介面文字，請同步補齊 `src/utils/i18n.ts` 的繁體中文與英文翻譯。
3. 提交前務必在本機執行以下指令確認無錯誤：
   ```bash
   npm run build
   ```
4. 推送分支並建立 Pull Request，請依 Pull Request 範本說明變更重點與測試結果。

---

## 🐛 問題回報與功能建議

在建立新的 Issue 前，建議先搜尋既有 Issues 確認是否已有重複討論：
- **回報錯誤**：請選擇 **Bug Report** 範本，附上重現步驟、瀏覽器版本與截圖或 Console 錯誤訊息。
- **功能建議**：請選擇 **Feature Request** 範本，說明預期使用情境與想解決的問題。

---

## 📄 授權聲明

本專案採用 [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE) 授權。
所有提交並合併至本專案的貢獻，均視為您同意依 AGPL-3.0 條款釋出。
