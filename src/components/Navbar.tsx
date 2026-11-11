import React, { useState, useEffect } from 'react';
import { PanelId } from '../types';
import {
  FolderOpen,
  Save,
  Upload,
  Cpu,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  FileCheck2,
  FolderCheck,
  ChevronDown,
  FileText,
  Video,
  Presentation,
  SlidersHorizontal,
  Check,
  Plus,
  X,
  Clipboard,
  Settings,
  Smartphone,
  Share2,
  Network,
  Sun,
  Moon,
  Languages,
  Download,
  MoreHorizontal,
  ChevronUp
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { SrtNoteLogo } from './icons/SrtNoteLogo';
import { Theme, Language, t } from '../utils/i18n';

interface NavbarProps {
  projectTitle: string;
  folderName?: string;
  hasDirHandle: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  openPanels: PanelId[];
  panelPositions: PanelId[];
  onUpdateTitle: (title: string) => void;
  onOpenFolder: () => void;
  onSaveConfig: () => void;
  onOpenLMConfig: () => void;
  onLoadDemoProject: () => void;
  onResetLayout: () => void;
  onTogglePanel: (panelId: PanelId) => void;
  onOpenAllPanels: () => void;
  onSwapPanels: (idA: PanelId, idB: PanelId) => void;
  onUploadMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSubtitles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadSlides: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportConfig: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenYouTubeModal?: () => void;
  onOpenPasteModal?: () => void;
  onOpenShareModal?: () => void;
  isMobileMode?: boolean;
  onToggleMobileMode?: () => void;
  onSelectPreset?: (preset: any) => void;
  showPlayerBar?: boolean;
  onTogglePlayerBar?: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectTitle,
  folderName,
  hasDirHandle,
  isSaving,
  saveSuccess,
  openPanels,
  panelPositions,
  onUpdateTitle,
  onOpenFolder,
  onSaveConfig,
  onOpenLMConfig,
  onLoadDemoProject,
  onResetLayout,
  onTogglePanel,
  onOpenAllPanels,
  onSwapPanels,
  onUploadMedia,
  onUploadSubtitles,
  onUploadSlides,
  onImportConfig,
  onOpenYouTubeModal,
  onOpenPasteModal,
  onOpenShareModal,
  isMobileMode = false,
  onToggleMobileMode,
  onSelectPreset,
  showPlayerBar = true,
  onTogglePlayerBar,
  theme = 'dark',
  onToggleTheme,
  lang = 'zh',
  onToggleLanguage
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(projectTitle);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const isLight = theme === 'light';

  // Mobile: compact top bar, secondary actions live in the "⋯" menu,
  // and the whole bar can be collapsed to a small pull tab.
  const compact = isMobileMode;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('srtnote_mobile_bar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const setCollapsed = (next: boolean) => {
    setIsCollapsed(next);
    try {
      localStorage.setItem('srtnote_mobile_bar_collapsed', String(next));
    } catch {
      /* ignore */
    }
  };

  const closeAllDropdowns = () => {
    setShowUploadDropdown(false);
    setShowSettingsDropdown(false);
    setShowLayoutDropdown(false);
    setShowMoreDropdown(false);
  };

  // Dismiss dropdowns on outside click or Escape
  useEffect(() => {
    if (!showUploadDropdown && !showSettingsDropdown && !showLayoutDropdown && !showMoreDropdown) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-nav-dropdown]')) closeAllDropdowns();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllDropdowns();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUploadDropdown, showSettingsDropdown, showLayoutDropdown, showMoreDropdown]);

  // Run a file-input handler, then close the upload menu.
  // The menu must stay mounted until the file dialog returns, otherwise the
  // <input type="file"> is detached and its change event never reaches React.
  const withUploadClose =
    (handler: (e: React.ChangeEvent<HTMLInputElement>) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handler(e);
      setShowUploadDropdown(false);
    };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(projectTitle);
    }
  };

  const panelNames: Record<PanelId, string> = {
    video: t('panel_video', lang),
    slides: t('panel_slides', lang),
    transcript: t('panel_transcript', lang),
    summary: t('panel_summary', lang),
    mindmap: t('panel_mindmap', lang)
  };

  if (compact && isCollapsed) {
    // Collapsed: no layout space at all, just a small pull tab at the top centre
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 h-5 px-4 rounded-b-xl bg-slate-800/90 backdrop-blur border border-t-0 border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-md"
        title={t('expandBar', lang)}
        aria-label={t('expandBar', lang)}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  const moreItemClass =
    'w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-800 text-slate-200 text-left transition-colors';

  return (
    <header
      className={`w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between z-40 select-none shadow-md ${
        compact ? 'px-2 py-1 gap-2' : 'px-4 md:px-6 py-2.5 gap-4'
      }`}
    >
      {/* Left: Brand & Project Name */}
      <div className={`flex items-center min-w-0 ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <SrtNoteLogo className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} flex-shrink-0 drop-shadow-sm`} />
          {!compact && (
            <div className="leading-none">
              <span className="font-extrabold text-[15px] tracking-tight text-white">
                SRT<span className="text-blue-400">Note</span>
              </span>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-800 hidden md:block" />

        {/* Project Title (Click to Edit) */}
        <div className={`${compact ? 'flex min-w-0' : 'hidden md:flex'} items-center gap-2`}>
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              autoFocus
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="bg-slate-800 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(projectTitle);
                setIsEditingTitle(true);
              }}
              className="group flex items-center gap-1.5 text-xs text-slate-200 hover:text-white font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              title={t('editTitle', lang)}
            >
              <span className={`truncate ${compact ? 'max-w-[40vw]' : 'max-w-[200px]'}`}>{projectTitle}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-blue-400">✏️</span>
            </button>
          )}

          {/* Connected Folder Badge */}
          {folderName && !compact && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
              <FolderCheck className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{folderName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Operational Buttons */}
      <div className={`flex items-center flex-shrink-0 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {/* Consolidated Open Folder & Upload Dropdown Button (Icon only) */}
        <div className="relative" data-nav-dropdown>
          <button
            onClick={() => {
              const next = !showUploadDropdown;
              closeAllDropdowns();
              setShowUploadDropdown(next);
            }}
            aria-haspopup="menu"
            aria-expanded={showUploadDropdown}
            className="px-2 py-2 lg:px-2.5 lg:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-1.5 text-xs font-medium shadow-sm"
            title={t('openMenuTitle', lang)}
            aria-label={t('openMenuTitle', lang)}
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">{t('openMenu', lang)}</span>
            <ChevronDown className={`hidden lg:block w-3 h-3 text-slate-400 transition-transform ${showUploadDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showUploadDropdown && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-xs"
            >
              {/* Option 1: Open Local Directory */}
              <button
                type="button"
                onClick={() => { setShowUploadDropdown(false); onOpenFolder(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-amber-300 hover:text-amber-200 cursor-pointer transition-colors text-left font-medium"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>{t('readFolder', lang)}</span>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <Video className="w-4 h-4 text-blue-400" />
                <span>{t('uploadMedia', lang)}</span>
                <input type="file" accept="video/*,audio/*" onChange={withUploadClose(onUploadMedia)} className="hidden" />
              </label>

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{t('uploadSubtitles', lang)}</span>
                <input type="file" accept=".srt,.vtt" onChange={withUploadClose(onUploadSubtitles)} className="hidden" />
              </label>

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <Presentation className="w-4 h-4 text-amber-400" />
                <span>{t('uploadSlidesMenu', lang)}</span>
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={withUploadClose(onUploadSlides)} className="hidden" />
              </label>

              <div className="h-px bg-slate-800 my-1" />

              {/* YouTube Link */}
              {onOpenYouTubeModal && (
                <button
                  type="button"
                  onClick={() => { setShowUploadDropdown(false); onOpenYouTubeModal(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors text-left"
                >
                  <YoutubeIcon className="w-4 h-4 text-red-500" />
                  <span>{t('pasteYoutube', lang)}</span>
                </button>
              )}

              {/* Paste Transcript */}
              {onOpenPasteModal && (
                <button
                  type="button"
                  onClick={() => { setShowUploadDropdown(false); onOpenPasteModal(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors text-left"
                >
                  <Clipboard className="w-4 h-4 text-blue-400" />
                  <span>{t('pasteTranscript', lang)}</span>
                </button>
              )}

              <div className="h-px bg-slate-800 my-1" />

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                <span>{t('importConfig', lang)}</span>
                <input type="file" accept=".json" onChange={withUploadClose(onImportConfig)} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Secondary actions: inline on desktop, moved into the "⋯" menu on mobile */}
        <div className={compact ? 'hidden' : 'contents'}>
        {/* Save Config to Folder / Export JSON (Icon only) */}
        <button
          onClick={onSaveConfig}
          disabled={isSaving}
          className={`px-2 py-2 lg:px-2.5 lg:py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-60 disabled:cursor-wait ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-1 ring-emerald-400'
              : hasDirHandle
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={saveSuccess ? t('saveSuccess', lang) : hasDirHandle ? t('saveConfig', lang) : t('exportConfig', lang)}
          aria-label={saveSuccess ? t('saveSuccess', lang) : hasDirHandle ? t('saveConfig', lang) : t('exportConfig', lang)}
        >
          {saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : hasDirHandle ? (
            <Save className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">
            {saveSuccess ? t('savedShort', lang) : hasDirHandle ? t('saveShort', lang) : t('exportShort', lang)}
          </span>
        </button>

        {/* 雲端分享連結按鈕 (Icon only) */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700'
            }`}
            title={t('shareCloud', lang)}
            aria-label={t('shareCloud', lang)}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* 互動心智圖面板快捷開關按鈕 (Icon only) */}
        <button
          onClick={() => onTogglePanel('mindmap')}
          className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
            openPanels.includes('mindmap')
              ? isLight
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white force-white shadow-md shadow-cyan-600/30 border border-cyan-500 ring-1 ring-cyan-400'
                : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/30'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-cyan-700 hover:text-cyan-900 border border-slate-200'
              : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700'
          }`}
          title={openPanels.includes('mindmap') ? t('mindmapToggleOpen', lang) : t('mindmapToggleClose', lang)}
          aria-label={openPanels.includes('mindmap') ? t('mindmapToggleOpen', lang) : t('mindmapToggleClose', lang)}
          aria-pressed={openPanels.includes('mindmap')}
        >
          <Network className="w-4 h-4" />
        </button>

        {/* 手機模式按鈕 (Icon only) */}
        {onToggleMobileMode && (
          <button
            onClick={onToggleMobileMode}
            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
              isMobileMode
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-sm ring-1 ring-blue-500/30'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
            }`}
            title={isMobileMode ? t('mobileModeOn', lang) : t('mobileModeOff', lang)}
            aria-label={isMobileMode ? t('mobileModeOn', lang) : t('mobileModeOff', lang)}
            aria-pressed={isMobileMode}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        )}

        {/* 播放控制列顯示/隱藏切換按鈕 */}
        {onTogglePlayerBar && (
          <button
            onClick={onTogglePlayerBar}
            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
              showPlayerBar
                ? isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 border border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700'
                : isLight
                ? 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-slate-800'
            }`}
            title={showPlayerBar ? t('playerBarHide', lang) : t('playerBarShow', lang)}
            aria-label={showPlayerBar ? t('playerBarHide', lang) : t('playerBarShow', lang)}
            aria-pressed={showPlayerBar}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}

        {/* 版面格式選單按鈕 (Dropdown) */}
        {!isMobileMode && onSelectPreset && (
          <div className="relative" data-nav-dropdown>
            <button
              onClick={() => {
                const next = !showLayoutDropdown;
                closeAllDropdowns();
                setShowLayoutDropdown(next);
              }}
              aria-haspopup="menu"
              aria-expanded={showLayoutDropdown}
              className={`px-2.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-medium ${
                showLayoutDropdown
                  ? 'bg-blue-600 text-white force-white shadow-blue-600/30 ring-1 ring-blue-400'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 border border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700'
              }`}
              title={t('layoutPresetsTitle', lang)}
            >
              <LayoutGrid className={`w-4 h-4 ${showLayoutDropdown ? 'text-white force-white' : isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <span className="hidden sm:inline">{t('layoutPresets', lang)}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showLayoutDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLayoutDropdown && (
              <div
                className="absolute right-0 top-full mt-2 w-48 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800/80 mb-1">
                  {t('layoutTitle', lang)}
                </div>

                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPreset('study');
                      setShowLayoutDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-left transition-colors flex items-center gap-2 group"
                  >
                    <span>🧠</span>
                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {t('preset_study', lang)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPreset('2x2');
                      setShowLayoutDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-left transition-colors flex items-center gap-2 group"
                  >
                    <span>📊</span>
                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {t('preset_2x2', lang)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPreset('mindmap-focus');
                      setShowLayoutDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-left transition-colors flex items-center gap-2 group"
                  >
                    <span>🗺️</span>
                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {t('preset_mindmap', lang)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPreset('notes-focus');
                      setShowLayoutDropdown(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-left transition-colors flex items-center gap-2 group"
                  >
                    <span>📝</span>
                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {t('preset_notes', lang)}
                    </span>
                  </button>
                </div>

                <div className="pt-1 mt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onResetLayout();
                      setShowLayoutDropdown(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('resetLayout', lang)}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 亮暗版面主題切換按鈕 */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-blue-600 hover:text-blue-700 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700'
            }`}
            title={theme === 'dark' ? t('themeLight', lang) : t('themeDark', lang)}
            aria-label={theme === 'dark' ? t('themeLight', lang) : t('themeDark', lang)}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        )}

        {/* 中英語言切換按鈕 */}
        {onToggleLanguage && (
          <button
            onClick={onToggleLanguage}
            className={`px-2.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-semibold ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
            }`}
            title={lang === 'zh' ? 'Switch to English' : '切換為繁體中文'}
          >
            <Languages className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <span>{lang === 'zh' ? 'EN' : '繁中'}</span>
          </button>
        )}

        </div>

        {/* Mobile "⋯" overflow menu */}
        {compact && (
          <div className="relative" data-nav-dropdown>
            <button
              type="button"
              onClick={() => {
                const next = !showMoreDropdown;
                closeAllDropdowns();
                setShowMoreDropdown(next);
              }}
              aria-haspopup="menu"
              aria-expanded={showMoreDropdown}
              aria-label={t('moreActions', lang)}
              title={t('moreActions', lang)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                showMoreDropdown
                  ? 'bg-blue-600 text-white force-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreDropdown && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 max-h-[70vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-xs"
              >
                <button type="button" className={moreItemClass} disabled={isSaving}
                  onClick={() => { setShowMoreDropdown(false); onSaveConfig(); }}>
                  {hasDirHandle ? <Save className="w-4 h-4 text-blue-400" /> : <Download className="w-4 h-4 text-blue-400" />}
                  <span>{hasDirHandle ? t('saveConfig', lang) : t('exportConfig', lang)}</span>
                </button>
                {onOpenShareModal && (
                  <button type="button" className={moreItemClass}
                    onClick={() => { setShowMoreDropdown(false); onOpenShareModal(); }}>
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span>{t('shareShort', lang)}</span>
                  </button>
                )}
                <button type="button" className={moreItemClass}
                  onClick={() => { setShowMoreDropdown(false); onTogglePanel('mindmap'); }}>
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span className="flex-1">{t('panel_mindmap', lang)}</span>
                  {openPanels.includes('mindmap') && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                {onTogglePlayerBar && (
                  <button type="button" className={moreItemClass}
                    onClick={() => { setShowMoreDropdown(false); onTogglePlayerBar(); }}>
                    <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">{showPlayerBar ? t('playerBarHide', lang) : t('playerBarShow', lang)}</span>
                  </button>
                )}
                <div className="h-px bg-slate-800 my-1" />
                {onToggleTheme && (
                  <button type="button" className={moreItemClass}
                    onClick={() => { setShowMoreDropdown(false); onToggleTheme(); }}>
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                    <span>{theme === 'dark' ? t('themeLight', lang) : t('themeDark', lang)}</span>
                  </button>
                )}
                {onToggleLanguage && (
                  <button type="button" className={moreItemClass}
                    onClick={() => { setShowMoreDropdown(false); onToggleLanguage(); }}>
                    <Languages className="w-4 h-4 text-blue-400" />
                    <span>{lang === 'zh' ? 'English' : '繁體中文'}</span>
                  </button>
                )}
                {onToggleMobileMode && (
                  <button type="button" className={moreItemClass}
                    onClick={() => { setShowMoreDropdown(false); onToggleMobileMode(); }}>
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    <span>{t('switchDesktop', lang)}</span>
                  </button>
                )}
                <div className="h-px bg-slate-800 my-1" />
                <button type="button" className={moreItemClass}
                  onClick={() => { setShowMoreDropdown(false); setCollapsed(true); }}>
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                  <span>{t('collapseBar', lang)}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 統一設定入口 (Icon only) */}
        <div className="relative" data-nav-dropdown>
          <button
            onClick={() => {
              const next = !showSettingsDropdown;
              closeAllDropdowns();
              setShowSettingsDropdown(next);
            }}
            aria-haspopup="dialog"
            aria-expanded={showSettingsDropdown}
            className={`p-2 rounded-xl border shadow-sm transition-all flex items-center justify-center ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={t('settingsTitle', lang)}
            aria-label={t('settingsTitle', lang)}
          >
            <Settings className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`} />
          </button>

          {showSettingsDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-xs">{t('settings', lang)}</span>
                </div>
                <button
                  onClick={() => setShowSettingsDropdown(false)}
                  aria-label={t('panelClose', lang)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 1. AI API 設定 */}
              <div className="py-2.5 border-b border-slate-800">
                <button
                  onClick={() => {
                    onOpenLMConfig();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 group-hover:scale-105 transition-transform">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs">{t('aiSettings', lang)}</div>
                      <div className="text-[10px] text-slate-400">{t('aiSettingsDesc', lang)}</div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-purple-400" />
                </button>
              </div>

              {/* 2. 版面視窗管理 */}
              <div className="py-2.5 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                    {t('panelToggles', lang)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {openPanels.length}/5 {t('panelOpen', lang)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'video' as PanelId, icon: Video, color: 'text-blue-400' },
                    { id: 'slides' as PanelId, icon: Presentation, color: 'text-emerald-400' },
                    { id: 'transcript' as PanelId, icon: FileText, color: 'text-amber-400' },
                    { id: 'summary' as PanelId, icon: Sparkles, color: 'text-purple-400' },
                    { id: 'mindmap' as PanelId, icon: Network, color: 'text-cyan-400' }
                  ].map((p) => {
                    const isOpen = openPanels.includes(p.id);
                    const Icon = p.icon;
                    const pTitle = panelNames[p.id];
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isOpen
                            ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                            : 'bg-slate-950/60 border-dashed border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${isOpen ? p.color : 'text-slate-600'}`} />
                          <span className={`font-medium text-xs ${isOpen ? 'text-white' : 'text-slate-400'}`}>
                            {pTitle}
                          </span>
                        </div>

                        {isOpen ? (
                          <button
                            onClick={() => onTogglePanel(p.id)}
                            className="px-2 py-0.5 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors flex items-center gap-1"
                            title={t('panelClose', lang)}
                          >
                            <X className="w-3 h-3" />
                            <span>{t('panelClose', lang)}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onTogglePanel(p.id)}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1 active:scale-95"
                            title={t('panelAdd', lang)}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{t('panelAdd', lang)}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
