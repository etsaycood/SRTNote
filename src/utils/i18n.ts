export type Language = 'zh' | 'en';
export type Theme = 'dark' | 'light';

export const TRANSLATIONS = {
  zh: {
    // App & Navbar
    appTitle: 'SRTNote - 智慧影音同步學習與筆記平台',
    openFolder: '開啟專案資料夾',
    saveConfig: '存檔至資料夾 (sync_config.json)',
    exportConfig: '導出設定檔 (sync_config.json)',
    saveSuccess: '已儲存！',
    shareCloud: '產生雲端分享連結 (?s=代號)',
    mindmapToggleOpen: '互動心智圖面板：已開啟 (點擊關閉)',
    mindmapToggleClose: '開啟「互動心智圖」面板',
    playerBarShow: '展開底端播放列',
    playerBarHide: '隱藏底端播放列 (釋放更多視窗空間)',
    layoutPresets: '版面格式',
    layoutTitle: '工作區版面格式',
    themeDark: '深色版面',
    themeLight: '淺色版面',
    themeToggle: '切換亮暗主題',
    langToggle: '切換中英文',
    settings: '系統設定',
    aiSettings: 'AI 連線設定',
    aiSettingsDesc: '自訂 API 端點、模型與提示詞',
    panelToggles: '版面視窗開關',
    panelOpen: '開啟',
    panelClose: '關閉',
    panelAdd: '加回',
    
    // Layout Presets
    preset_study: '研討學習模式',
    preset_2x2: '經典四宮格',
    preset_mindmap: '心智圖專注',
    preset_notes: '筆記專注',
    resetLayout: '重設版面',

    // Panels
    panel_video: '影音畫面',
    panel_slides: '同步簡報',
    panel_transcript: '即時逐字稿',
    panel_summary: '重點整理',
    panel_mindmap: '互動心智圖',

    // Slots
    slot_topLeft: '左上窗格',
    slot_bottomLeft: '左下窗格',
    slot_topRight: '右上窗格',
    slot_bottomRight: '右下窗格',
    moveToTarget: '移至目標窗格：',
    currentSlot: '(目前)',
    maximizeSlot: '最大化此視窗',
    restoreSlot: '還原視窗佈局',
    addTabHere: '在此窗格加入標籤頁：',
    alreadyHere: '已在此',

    // Tools
    searchPlaceholder: '搜尋關鍵字...',
    autoScroll: '自動滾動',
    proofread: '校對模式',
    proofreadDone: '完成校對',
    addLine: '新增一行逐字稿',
    downloadSRT: '下載為 SRT 字幕檔',
    importSRT: '匯入 SRT/VTT 字幕',
    pasteTranscript: '貼上逐字稿文字',
    linesCount: '句',
    
    // AI Summary
    aiButton: 'AI',
    stopGenerate: '終止生成',
    copy: '複製文字',
    copied: '已複製',
    editNote: '手動編輯筆記',
    previewNote: '預覽筆記',
    downloadNote: '下載 Markdown 筆記 (.md)',
    uploadNote: '上傳 Markdown 筆記 (.md/.txt)',

    // Slides
    timeline: '時間軸',
    uploadSlides: '上傳簡報或圖片',

    // Mindmap
    expand: '展開:',
    level1: '1層',
    level2: '2層',
    level3: '3層',
    allOpen: '全開',
    editMap: '編輯',
    downloadMap: '下載心智圖',
    importMap: '匯入心智圖',
    fitView: '全圖置中適配',

    // Player
    loopSingle: '重複播放：單曲循環',
    loopAll: '重複播放：全部循環',
    loopOff: '重複播放：關閉',
    speed: '播放倍速',
    mute: '靜音',
    unmute: '取消靜音'
  },
  en: {
    // App & Navbar
    appTitle: 'SRTNote - Smart Video & Slides Sync Study Platform',
    openFolder: 'Open Folder',
    saveConfig: 'Save Project (sync_config.json)',
    exportConfig: 'Export Config (sync_config.json)',
    saveSuccess: 'Saved!',
    shareCloud: 'Generate Cloud Share Link (?s=code)',
    mindmapToggleOpen: 'MindMap Panel: Open (Click to close)',
    mindmapToggleClose: 'Open MindMap Panel',
    playerBarShow: 'Show Player Bar',
    playerBarHide: 'Hide Player Bar (Maximize Space)',
    layoutPresets: 'Layout',
    layoutTitle: 'Workspace Layouts',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    themeToggle: 'Toggle Theme',
    langToggle: 'Switch Language',
    settings: 'Settings',
    aiSettings: 'AI Connection Settings',
    aiSettingsDesc: 'Custom API endpoint, model & system prompt',
    panelToggles: 'Panel Visibility',
    panelOpen: 'Open',
    panelClose: 'Close',
    panelAdd: 'Add',
    
    // Layout Presets
    preset_study: 'Study Mode',
    preset_2x2: '2x2 Grid',
    preset_mindmap: 'MindMap Focus',
    preset_notes: 'Notes Focus',
    resetLayout: 'Reset Layout',

    // Panels
    panel_video: 'Video Player',
    panel_slides: 'Presentation',
    panel_transcript: 'Live Transcript',
    panel_summary: 'AI Summary',
    panel_mindmap: 'Interactive MindMap',

    // Slots
    slot_topLeft: 'Top Left',
    slot_bottomLeft: 'Bottom Left',
    slot_topRight: 'Top Right',
    slot_bottomRight: 'Bottom Right',
    moveToTarget: 'Move to Slot:',
    currentSlot: '(Current)',
    maximizeSlot: 'Maximize Window',
    restoreSlot: 'Restore Layout',
    addTabHere: 'Add Tab to Slot:',
    alreadyHere: 'Present',

    // Tools
    searchPlaceholder: 'Search keywords...',
    autoScroll: 'Auto Scroll',
    proofread: 'Proofread',
    proofreadDone: 'Done',
    addLine: 'Add subtitle line',
    downloadSRT: 'Download SRT Subtitles',
    importSRT: 'Import SRT/VTT',
    pasteTranscript: 'Paste Transcript Text',
    linesCount: 'lines',
    
    // AI Summary
    aiButton: 'AI',
    stopGenerate: 'Stop',
    copy: 'Copy text',
    copied: 'Copied',
    editNote: 'Edit note',
    previewNote: 'Preview',
    downloadNote: 'Download Markdown (.md)',
    uploadNote: 'Upload Markdown (.md/.txt)',

    // Slides
    timeline: 'Timeline',
    uploadSlides: 'Upload Slides / Images',

    // Mindmap
    expand: 'Expand:',
    level1: 'L1',
    level2: 'L2',
    level3: 'L3',
    allOpen: 'All',
    editMap: 'Edit',
    downloadMap: 'Download MindMap',
    importMap: 'Import MindMap',
    fitView: 'Fit View',

    // Player
    loopSingle: 'Repeat: Single Track',
    loopAll: 'Repeat: All Playlist',
    loopOff: 'Repeat: Off',
    speed: 'Playback Speed',
    mute: 'Mute',
    unmute: 'Unmute'
  }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.zh;

export function t(key: TranslationKey, lang: Language = 'zh'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.zh;
  return dict[key] || TRANSLATIONS.zh[key] || key;
}

export function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem('srtnote_lang');
    if (saved === 'en' || saved === 'zh') return saved;
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('zh')) return 'zh';
  } catch (e) {
    console.warn(e);
  }
  return 'zh';
}

export function setSavedLanguage(lang: Language): void {
  try {
    localStorage.setItem('srtnote_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
  } catch (e) {
    console.warn(e);
  }
}

export function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem('srtnote_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    console.warn(e);
  }
  return 'dark';
}

export function applyTheme(theme: Theme): void {
  try {
    localStorage.setItem('srtnote_theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  } catch (e) {
    console.warn(e);
  }
}

