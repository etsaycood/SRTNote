import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SubtitleItem } from '../../types';
import { formatTime, formatTimePrecise, parseTimeToSeconds } from '../../utils/timeFormatter';
import { exportToSRT } from '../../utils/srtParser';
import {
  FileText,
  Search,
  Maximize2,
  Minimize2,
  X,
  Edit2,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  ArrowDownToLine,
  Crosshair,
  User,
  GripVertical,
  Clipboard
} from 'lucide-react';

interface TranscriptPanelProps {
  subtitles: SubtitleItem[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onUpdateSubtitles: (newSubtitles: SubtitleItem[]) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose?: () => void;
  onUploadSubtitles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPasteModal?: () => void;
  currentMediaId?: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  subtitles,
  currentTime,
  onSeek,
  onUpdateSubtitles,
  isMaximized,
  onToggleMaximize,
  onClose,
  onUploadSubtitles,
  onOpenPasteModal,
  currentMediaId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lastScrolledSubIdRef = useRef<string | null>(null);

  // Determine currently active subtitle ID from full subtitle list
  const activeSubId = useMemo(() => {
    if (!subtitles || subtitles.length === 0) return null;
    const found = subtitles.find(
      (s, idx) =>
        currentTime >= s.startTime &&
        (idx === subtitles.length - 1 || currentTime < (subtitles[idx + 1]?.startTime ?? (s.endTime || s.startTime + 3)))
    );
    return found ? found.id : null;
  }, [subtitles, currentTime]);

  // Auto-scroll to active subtitle ONLY when the active subtitle changes (eliminating 100ms stutter)
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current && !isEditMode && activeSubId) {
      if (activeSubId !== lastScrolledSubIdRef.current) {
        lastScrolledSubIdRef.current = activeSubId;
        activeLineRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeSubId, autoScroll, isEditMode]);

  // Handle line updates
  const handleLineChange = (id: string, field: keyof SubtitleItem, value: any) => {
    const updated = subtitles.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    onUpdateSubtitles(updated);
  };

  const handleAdjustTime = (id: string, delta: number) => {
    const updated = subtitles.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          startTime: Math.max(0, item.startTime + delta),
          endTime: Math.max(0, item.endTime + delta)
        };
      }
      return item;
    });
    onUpdateSubtitles(updated);
  };

  const handleSetCurrentStart = (id: string) => {
    const updated = subtitles.map((item) => {
      if (item.id === id) {
        return { ...item, startTime: Math.floor(currentTime * 10) / 10 };
      }
      return item;
    });
    onUpdateSubtitles(updated);
  };

  const handleDeleteLine = (id: string) => {
    const updated = subtitles.filter((item) => item.id !== id);
    onUpdateSubtitles(updated);
  };

  const handleAddLine = () => {
    const lastSub = subtitles[subtitles.length - 1];
    const newStart = lastSub ? lastSub.endTime + 0.5 : Math.floor(currentTime);
    const newSub: SubtitleItem = {
      id: `sub_${Date.now()}`,
      startTime: newStart,
      endTime: newStart + 4,
      speaker: lastSub ? lastSub.speaker : '發言者',
      text: '（請輸入字幕文字）'
    };
    onUpdateSubtitles([...subtitles, newSub]);
  };

  const handleDownloadSRT = () => {
    const srtText = exportToSRT(subtitles);
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter subtitles by search query
  const filteredSubtitles = searchQuery.trim()
    ? subtitles.filter(
        (sub) =>
          sub.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subtitles;

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg">
      {/* Top Header Badge & Controls (Floating overlay matching SlidePanel) */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Title Badge (rounded-full) */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-md">
            <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
              <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            </span>
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200">
              即時逐字稿
            </span>
            <span className="text-[11px] font-mono text-blue-300/80 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/40">
              {subtitles.length} 句
            </span>
          </div>

          {/* Action Controls & Search Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md">
            {/* Dynamic Sizing Search Input */}
            <div className="relative w-28 sm:w-36 focus-within:w-48 sm:focus-within:w-56 transition-all duration-200">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="搜尋關鍵字..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-6 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Auto Scroll (Icon only, no text) */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                autoScroll
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={autoScroll ? '自動滾動：已開啟' : '自動滾動：已關閉 (點擊開啟)'}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>

            {/* Global Proofread/Edit Toggle (Icon only, no text) */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                isEditMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEditMode ? '完成校對' : '開啟逐字稿校對模式'}
            >
              {isEditMode ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Edit2 className="w-3.5 h-3.5" />}
            </button>

            {/* Add subtitle line */}
            {isEditMode && (
              <button
                onClick={handleAddLine}
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="新增一行逐字稿"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Export SRT */}
            <button
              onClick={handleDownloadSRT}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="下載為 SRT 字幕檔"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Import SRT */}
            <label
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="匯入 SRT/VTT 字幕"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".srt,.vtt,.txt" onChange={onUploadSubtitles} className="hidden" />
            </label>

            {onOpenPasteModal && (
              <button
                onClick={onOpenPasteModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                title="貼上逐字稿文字"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Window controls (Maximize & Close) */}
        <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md">
          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMaximized ? '還原視窗' : '最大化視窗'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
              title="關閉此面板（可由右上角加回）"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Subtitles Scroll List (Takes 100% full height underneath overlay) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 pt-14 space-y-2.5 custom-scrollbar bg-slate-900/60 h-full w-full"
      >
        {subtitles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/10">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">
                {currentMediaId ? `尚未為影片 (${currentMediaId}) 上傳字幕` : '尚未載入逐字稿內容'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                上傳或貼上逐字稿後，將自動與此影片 ID 綁定對應，匯出設定檔後下次載入依然能比對呈現！
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/30 transition-all active:scale-95">
                <Upload className="w-3.5 h-3.5" />
                <span>上傳 SRT / VTT</span>
                <input type="file" accept=".srt,.vtt,.txt" onChange={onUploadSubtitles} className="hidden" />
              </label>
              {onOpenPasteModal && (
                <button
                  type="button"
                  onClick={onOpenPasteModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5 text-blue-400" />
                  <span>貼上文字</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredSubtitles.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            查無相符逐字稿搜尋結果
          </div>
        ) : (
          filteredSubtitles.map((sub) => {
            const isCurrent = sub.id === activeSubId;
            const isLineEditing = isEditMode || editingLineId === sub.id;

            return (
              <div
                key={sub.id}
                ref={isCurrent ? activeLineRef : null}
                className={`group/item rounded-xl transition-all duration-150 border ${
                  isCurrent
                    ? 'bg-blue-600/15 border-blue-500/40 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-slate-850/50 hover:bg-slate-800/80 border-slate-800/60'
                } p-3 flex flex-col gap-1.5`}
              >
                {/* Meta Row: Time, Speaker, and Proofread Button */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    {/* Timestamp clickable button */}
                    <button
                      type="button"
                      onClick={() => onSeek(sub.startTime)}
                      className={`font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-slate-800 text-blue-400 hover:bg-blue-900/50 hover:text-blue-200'
                      }`}
                      title="跳轉至此時間"
                    >
                      {formatTime(sub.startTime)}
                    </button>

                    {/* Speaker */}
                    {isLineEditing ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <input
                          type="text"
                          value={sub.speaker}
                          onChange={(e) => handleLineChange(sub.id, 'speaker', e.target.value)}
                          className="w-20 sm:w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className={`font-semibold tracking-wide ${sub.color || 'text-slate-300'}`}>
                        {sub.speaker || '發言者'}
                      </span>
                    )}
                  </div>

                  {/* Right Side: Per-line Proofread & Time Controls */}
                  <div className="flex items-center gap-1">
                    {/* Time Adjustment Controls (When editing this line) */}
                    {isLineEditing && (
                      <div className="flex items-center gap-0.5 text-[11px] animate-fade-in mr-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustTime(sub.id, -0.5)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="時間往前移 0.5 秒"
                        >
                          -0.5s
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustTime(sub.id, 0.5)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="時間往後延 0.5 秒"
                        >
                          +0.5s
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetCurrentStart(sub.id)}
                          className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                          title="將起點設為當前影音秒數"
                        >
                          <Crosshair className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(sub.id)}
                          className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
                          title="刪除此句"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Inline Proofread/Edit Button beside each subtitle item */}
                    <button
                      type="button"
                      onClick={() => setEditingLineId(editingLineId === sub.id ? null : sub.id)}
                      className={`p-1 rounded-md text-xs transition-colors flex items-center gap-1 ${
                        isLineEditing
                          ? 'bg-amber-500/25 text-amber-300'
                          : 'opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={isLineEditing ? '完成校對' : '校對此句'}
                    >
                      {isLineEditing ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Edit2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Subtitle Text Content */}
                {isLineEditing ? (
                  <textarea
                    rows={2}
                    value={sub.text}
                    onChange={(e) => handleLineChange(sub.id, 'text', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-sans leading-relaxed"
                  />
                ) : (
                  <p
                    onClick={() => onSeek(sub.startTime)}
                    className={`text-xs md:text-sm leading-relaxed cursor-pointer transition-colors ${
                      isCurrent
                        ? 'text-white font-medium drop-shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {sub.text}
                  </p>
                )}
              </div>
            );
          })
        )}

        {/* Add new line button at bottom */}
        {isEditMode && (
          <button
            onClick={handleAddLine}
            className="w-full py-3 rounded-xl border border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-900/40 hover:bg-blue-500/5 text-slate-400 hover:text-blue-400 flex items-center justify-center gap-2 text-xs font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            新增一行逐字稿
          </button>
        )}
      </div>
    </div>
  );
};
