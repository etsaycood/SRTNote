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
  X
} from 'lucide-react';

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
  onImportConfig
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(projectTitle);
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);

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
    summary: 'AI 重點整理'
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
            <span className="font-extrabold text-sm tracking-wider text-white">SyncNote</span>
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Open Local Directory Button */}
        <button
          onClick={onOpenFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow-sm transition-all"
          title="讀取電腦特定資料夾內的影音、字幕、簡報與設定檔"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">讀取特定資料夾</span>
          <span className="sm:hidden">資料夾</span>
        </button>

        {/* Upload Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUploadDropdown(!showUploadDropdown)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all"
            title="分別上傳或匯入檔案"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">個別上傳</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUploadDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-xs"
              onClick={() => setShowUploadDropdown(false)}
            >
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

              <label className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-800 text-slate-200 cursor-pointer transition-colors">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                <span>匯入設定檔 (JSON)</span>
                <input type="file" accept=".json" onChange={onImportConfig} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Save Config to Folder / Export JSON */}
        <button
          onClick={onSaveConfig}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-1 ring-emerald-400'
              : hasDirHandle
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title={
            hasDirHandle
              ? '將設定寫回該資料夾內的 sync_config.json'
              : '匯出並下載 sync_config.json 設定檔'
          }
        >
          {saveSuccess ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>
            {saveSuccess
              ? '已儲存！'
              : hasDirHandle
              ? '存檔至資料夾'
              : '導出設定檔'}
          </span>
        </button>

        {/* API 連線設定 */}
        <button
          onClick={onOpenLMConfig}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm transition-all"
          title="設定 AI API 連線端點、模型與情境提示詞"
        >
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">API 連線</span>
        </button>

        {/* Layout & Window Manager */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutDropdown(!showLayoutDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              openPanels.length < 4
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="管理視窗面板開關、拖曳位置與重設"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
            <span>版面視窗</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                openPanels.length < 4 ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {openPanels.length}/4
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showLayoutDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <div className="font-bold text-white text-xs">版面與視窗管理</div>
                  <div className="text-[10px] text-slate-400">可自由關閉或隨時加回面板</div>
                </div>
                <button
                  onClick={() => setShowLayoutDropdown(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Panel List */}
              <div className="py-2.5 space-y-1.5">
                {[
                  { id: 'video' as PanelId, title: '影音視窗 (Video)', icon: Video, color: 'text-blue-400' },
                  { id: 'slides' as PanelId, title: '同步簡報 (Slides)', icon: Presentation, color: 'text-emerald-400' },
                  { id: 'transcript' as PanelId, title: '即時逐字稿 (Transcript)', icon: FileText, color: 'text-amber-400' },
                  { id: 'summary' as PanelId, title: 'AI 重點整理 (AI Summary)', icon: Sparkles, color: 'text-purple-400' }
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
                        <Icon className={`w-4 h-4 ${isOpen ? p.color : 'text-slate-600'}`} />
                        <span className={`font-semibold text-xs ${isOpen ? 'text-white' : 'text-slate-400'}`}>
                          {p.title}
                        </span>
                      </div>

                      {isOpen ? (
                        <button
                          onClick={() => onTogglePanel(p.id)}
                          className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors flex items-center gap-1"
                          title="關閉此面板"
                        >
                          <X className="w-3 h-3" />
                          <span>關閉</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onTogglePanel(p.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-1 active:scale-95"
                          title="將此面板加回畫面"
                        >
                          <Plus className="w-3 h-3" />
                          <span>加回面板</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                {openPanels.length < 4 && (
                  <button
                    onClick={() => {
                      onOpenAllPanels();
                      setShowLayoutDropdown(false);
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
                    setShowLayoutDropdown(false);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重設為預設四宮格排序與比例</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Load Demo */}
        <button
          onClick={onLoadDemoProject}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="載入示範專案"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
