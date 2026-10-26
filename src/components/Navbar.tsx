import React, { useState } from 'react';
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
  Settings
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';

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
  onOpenPasteModal
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(projectTitle);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(projectTitle);
    }
  };

  const panelNames: Record<PanelId, string> = {
    video: '影音視窗',
    slides: '同步簡報',
    transcript: '即時逐字稿',
    summary: '重點整理'
  };

  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 z-40 select-none shadow-md">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-white">SRTNote</span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 hidden md:block" />

        {/* Project Title (Click to Edit) */}
        <div className="hidden md:flex items-center gap-2">
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
              title="點擊修改專案名稱"
            >
              <span className="truncate max-w-[200px]">{projectTitle}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-blue-400">✏️</span>
            </button>
          )}

          {/* Connected Folder Badge */}
          {folderName && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
              <FolderCheck className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{folderName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Operational Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Consolidated Open Folder & Upload Dropdown Button (Icon only) */}
        <div className="relative">
          <button
            onClick={() => setShowUploadDropdown(!showUploadDropdown)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center justify-center shadow-sm"
            title="開啟特定資料夾或上傳影音/字幕/簡報"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </button>

          {showUploadDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-xs"
              onClick={() => setShowUploadDropdown(false)}
            >
              {/* Option 1: Open Local Directory */}
              <button
                type="button"
                onClick={onOpenFolder}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-amber-300 hover:text-amber-200 cursor-pointer transition-colors text-left font-medium"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>讀取特定資料夾</span>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <Video className="w-4 h-4 text-blue-400" />
                <span>上傳影音 (MP4/MP3)</span>
                <input type="file" accept="video/*,audio/*" onChange={onUploadMedia} className="hidden" />
              </label>

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>上傳字幕 (SRT/VTT)</span>
                <input type="file" accept=".srt,.vtt" onChange={onUploadSubtitles} className="hidden" />
              </label>

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <Presentation className="w-4 h-4 text-amber-400" />
                <span>上傳簡報 (PDF/圖片)</span>
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={onUploadSlides} className="hidden" />
              </label>

              <div className="h-px bg-slate-800 my-1" />

              {/* YouTube Link */}
              {onOpenYouTubeModal && (
                <button
                  type="button"
                  onClick={onOpenYouTubeModal}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors text-left"
                >
                  <YoutubeIcon className="w-4 h-4 text-red-500" />
                  <span>貼上 YouTube 網址</span>
                </button>
              )}

              {/* Paste Transcript */}
              {onOpenPasteModal && (
                <button
                  type="button"
                  onClick={onOpenPasteModal}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors text-left"
                >
                  <Clipboard className="w-4 h-4 text-blue-400" />
                  <span>貼上逐字稿文字</span>
                </button>
              )}

              <div className="h-px bg-slate-800 my-1" />

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                <span>匯入設定檔 (JSON)</span>
                <input type="file" accept=".json" onChange={onImportConfig} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Save Config to Folder / Export JSON (Icon only) */}
        <button
          onClick={onSaveConfig}
          disabled={isSaving}
          className={`p-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-1 ring-emerald-400'
              : hasDirHandle
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={
            saveSuccess
              ? '已儲存！'
              : hasDirHandle
              ? '存檔至資料夾 (sync_config.json)'
              : '導出設定檔 (sync_config.json)'
          }
        >
          {saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>

        {/* 統一設定入口 (Icon only) */}
        <div className="relative">
          <button
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-all flex items-center justify-center"
            title="系統設定（AI 連線、版面視窗、示範專案）"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          {showSettingsDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-xs">系統設定</span>
                </div>
                <button
                  onClick={() => setShowSettingsDropdown(false)}
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
                      <div className="font-semibold text-white text-xs">AI 連線設定</div>
                      <div className="text-[10px] text-slate-400">自訂 API 端點、模型與提示詞</div>
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
                    版面視窗開關
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {openPanels.length}/4 開啟
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'video' as PanelId, title: '影音視窗', icon: Video, color: 'text-blue-400' },
                    { id: 'slides' as PanelId, title: '同步簡報', icon: Presentation, color: 'text-emerald-400' },
                    { id: 'transcript' as PanelId, title: '即時逐字稿', icon: FileText, color: 'text-amber-400' },
                    { id: 'summary' as PanelId, title: '重點整理', icon: Sparkles, color: 'text-purple-400' }
                  ].map((p) => {
                    const isOpen = openPanels.includes(p.id);
                    const Icon = p.icon;
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
                            {p.title}
                          </span>
                        </div>

                        {isOpen ? (
                          <button
                            onClick={() => onTogglePanel(p.id)}
                            className="px-2 py-0.5 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors flex items-center gap-1"
                            title="關閉此面板"
                          >
                            <X className="w-3 h-3" />
                            <span>關閉</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onTogglePanel(p.id)}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1 active:scale-95"
                            title="將此面板加回畫面"
                          >
                            <Plus className="w-3 h-3" />
                            <span>加回</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  {openPanels.length < 4 && (
                    <button
                      onClick={() => {
                        onOpenAllPanels();
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>一鍵開啟全部 4 個面板</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onResetLayout();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重設為預設四宮格排序與比例</span>
                  </button>
                </div>
              </div>

              {/* 3. 示範專案 */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onLoadDemoProject();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors flex items-center justify-between"
                  title="載入示範專案"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                    <span>載入示範專案</span>
                  </span>
                  <span className="text-[10px] text-slate-500">重置至預設範例</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
