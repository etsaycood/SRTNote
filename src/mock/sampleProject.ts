import { ProjectConfig, SubtitleItem, SlideItem } from '../types';

export const SAMPLE_SUBTITLES: SubtitleItem[] = [
  {
    id: 'sub_1',
    startTime: 0,
    endTime: 13,
    speaker: '王經理',
    text: '各位好，我們開始今天的產品研發與會員改版週會。',
    color: 'text-blue-500'
  },
  {
    id: 'sub_2',
    startTime: 14,
    endTime: 18,
    speaker: '王經理',
    text: '今天主要確認會員系統改版的上線時程，還有目前的測試與部署進度。',
    color: 'text-blue-500'
  },
  {
    id: 'sub_3',
    startTime: 19,
    endTime: 24,
    speaker: '王經理',
    text: '陳工程師，先請你報告一下目前後端與核心功能的開發狀況。',
    color: 'text-blue-500'
  },
  {
    id: 'sub_4',
    startTime: 25,
    endTime: 26,
    speaker: '陳工程師',
    text: '好的，王經理。我來同步目前後端的完成度。',
    color: 'text-amber-500'
  },
  {
    id: 'sub_5',
    startTime: 27,
    endTime: 32,
    speaker: '陳工程師',
    text: '目前會員登入、第三方註冊跟個人資料管理這三個核心模組都已經開發完成，單元測試覆蓋率達到88%。',
    color: 'text-amber-500'
  },
  {
    id: 'sub_6',
    startTime: 33,
    endTime: 34,
    speaker: '陳工程師',
    text: '相關的程式碼昨天晚上已經通過代碼審查並合併到主線了。',
    color: 'text-amber-500'
  },
  {
    id: 'sub_7',
    startTime: 35,
    endTime: 41,
    speaker: '陳工程師',
    text: '目前比較落後的是點數兌換與交易紀錄的部分，大概完成 70% 左右。',
    color: 'text-amber-500'
  },
  {
    id: 'sub_8',
    startTime: 42,
    endTime: 47,
    speaker: '王經理',
    text: '點數兌換有遇到什麼技術瓶頸嗎？這部分是營運部門非常在意的功能。',
    color: 'text-blue-500'
  },
  {
    id: 'sub_9',
    startTime: 48,
    endTime: 54,
    speaker: '陳工程師',
    text: '主要是舊有 Oracle 資料庫的資料結構相容性問題，需要額外寫轉接層與快取機制來確保高併發。預計週三能完成。',
    color: 'text-amber-500'
  },
  {
    id: 'sub_10',
    startTime: 55,
    endTime: 62,
    speaker: '林設計',
    text: '另外，前端全新設計系統與行動端響應式 UI 我也已經更新到最新版本，等等可以在畫面上展示。',
    color: 'text-emerald-500'
  },
  {
    id: 'sub_11',
    startTime: 63,
    endTime: 75,
    speaker: '王經理',
    text: '太好了。那我們這週五前進入全模組整合測試，下週二如期發布上線。大家繼續加油！',
    color: 'text-blue-500'
  }
];

// SVG slide generator for crisp, standalone visual slides
const createSlideSvg = (title: string, subtitle: string, bullets: string[], tag: string, accentColor: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="800" height="450" rx="16" fill="url(#bgGrad)" stroke="#334155" stroke-width="2"/>
    <rect x="0" y="0" width="800" height="6" fill="url(#accentGrad)" />
    
    <!-- Tag badge -->
    <rect x="48" y="44" width="120" height="28" rx="14" fill="${accentColor}" fill-opacity="0.15" stroke="${accentColor}" stroke-width="1.5"/>
    <text x="108" y="63" fill="${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${tag}</text>
    
    <!-- Title -->
    <text x="48" y="125" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold">${title}</text>
    <text x="48" y="160" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="16">${subtitle}</text>
    
    <!-- Divider -->
    <line x1="48" y1="185" x2="752" y2="185" stroke="#334155" stroke-width="1.5" />
    
    <!-- Bullets -->
    ${bullets.map((b, idx) => `
      <g transform="translate(48, ${225 + idx * 46})">
        <circle cx="10" cy="-6" r="5" fill="${accentColor}" />
        <text x="32" y="0" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500">${b}</text>
      </g>
    `).join('')}

    <!-- Footer -->
    <text x="752" y="420" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="end">SyncNote Studio • 會議簡報展示</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const SAMPLE_SLIDES: SlideItem[] = [
  {
    id: 'slide_1',
    pageNumber: 1,
    title: '會員系統改版進度報告',
    timestamp: 0,
    imageUrl: createSlideSvg(
      '會員系統改版進度報告',
      '主講人：王經理 | 核心研發週會',
      ['研發時程規劃與目標確認', '前後端核心模組交付進度彙整', '點數兌換與架構技術難點評估'],
      'SLIDE 01 / 04',
      '#3b82f6'
    ),
    notes: '簡介開場與會議目標交代'
  },
  {
    id: 'slide_2',
    pageNumber: 2,
    title: '上線時程與測試里程碑',
    timestamp: 14,
    imageUrl: createSlideSvg(
      '2026 Q4 上線時程與里程碑',
      '目標：確保新舊系統無縫過渡與資料完整性',
      ['10/25 核心功能代碼凍結 (Code Freeze)', '10/28 全模組跨系統整合壓測 (Stress Test)', '11/02 正式上線與金流轉移 (Production Release)'],
      'SLIDE 02 / 04',
      '#6366f1'
    ),
    notes: '重要時程節點提醒'
  },
  {
    id: 'slide_3',
    pageNumber: 3,
    title: '後端模組進度現狀',
    timestamp: 27,
    imageUrl: createSlideSvg(
      '後端模組進度現狀',
      '回報人：陳工程師 | 核心服務模組',
      ['會員登入 / 第三方 SSO 註冊：100% 已合併主線', '個人資料與安全中心：100% 單元測試通過', '點數兌換中心：70% 進行中 (舊 Oracle 相容層建構中)'],
      'SLIDE 03 / 04',
      '#f59e0b'
    ),
    notes: '登入完成，點數模組需要相容層'
  },
  {
    id: 'slide_4',
    pageNumber: 4,
    title: '技術瓶頸與跨層解決方案',
    timestamp: 48,
    imageUrl: createSlideSvg(
      '技術瓶頸與轉接層優化',
      '相容性挑戰與應對策略',
      ['挑戰：舊版 Oracle 與新微服務資料結構不一致', '解法：開發專用轉接層 (Adapter) + Redis 快取高併發', '時程：預計本週三前完成，不影響週五總體封測'],
      'SLIDE 04 / 04',
      '#10b981'
    ),
    notes: '已確認相容層可以在週三完成'
  }
];

export const SAMPLE_AI_SUMMARY = `## 📌 會議核心主題與目標
本場會議為**會員系統改版進度報告**，由王經理主持。重點在於檢視會員登入、註冊、個人資料與點數兌換之開發完成度，並確認本週五整合測試與下週正式上線時程。

---

## ⏱️ 關鍵時間戳記與核心綱要
- [00:00] **會議開始與議題說明**：王經理開場，說明確認時程與測試進度之目的。
- [00:14] **上線時程與測試進度**：訂定本週五前全模組完成、下週正式發布。
- [00:27] **後端完成度回報**：陳工程師回報會員登入、註冊與個資管理三模組已 100% 完工並合併主線。
- [00:35] **點數兌換進度**：目前進度約 70%，為進度關注焦點。
- [00:48] **舊資料庫相容性瓶頸**：針對 Oracle 舊資料庫相容問題，團隊正撰寫專用轉接層與快取機制。
- [00:55] **前端全新 UI 更新**：林設計確認最新前端元件庫與響應式介面已就緒。

---

## 🎯 決策事項與行動清單 (Action Items)
1. **陳工程師**：於**週三前**完成點數兌換模組之舊資料庫轉接層與單元測試。
2. **全體研發團隊**：**週五前**進入跨模組整合測試與高併發壓力測試。
3. **王經理**：向營運部門同步點數兌換機制進度與上線時程。`;

export const SAMPLE_PROJECT: ProjectConfig = {
  version: '1.0.0',
  title: '會員系統改版進度報告週會',
  mediaType: 'audio',
  mediaDuration: 75,
  subtitles: SAMPLE_SUBTITLES,
  slides: SAMPLE_SLIDES,
  aiSummary: SAMPLE_AI_SUMMARY,
  aiKeyPoints: [
    { time: 0, label: '會議開場', description: '確認會員系統改版上線時程' },
    { time: 27, label: '核心模組', description: '登入、註冊與個人資料模組完成' },
    { time: 35, label: '點數兌換', description: '完成度 70%，正在開發資料轉接層' },
    { time: 55, label: 'UI更新', description: '前端響應式介面更新' }
  ],
  updatedAt: new Date().toISOString()
};
