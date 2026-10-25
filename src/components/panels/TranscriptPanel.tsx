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
  GripVertical
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
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  subtitles,
  currentTime,
  onSeek,
  onUpdateSubtitles,
  isMaximized,
  onToggleMaximize,
  onClose,
  onUploadSubtitles
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
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
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
            <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </span>
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            即時逐字稿 (Transcript)
          </h3>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {subtitles.length} 句
          </span>
        </div>

        {/* Functions & Controls (Hidden until hover) */}
        <div className="flex-1 flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="搜尋發言人或內容關鍵字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                autoScroll
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="自動平滑滾動到當前播放行"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">自動滾動</span>
            </button>

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                isEditMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="微調字幕時間與內容"
            >
              {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              <span>{isEditMode ? '完成編輯' : '微調校對'}</span>
            </button>

            {/* Export / Upload */}
            <button
              onClick={handleDownloadSRT}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="下載為 SRT 字幕檔"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="匯入 SRT/VTT 字幕"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".srt,.vtt,.json" onChange={onUploadSubtitles} className="hidden" />
            </label>

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
      </div>

      {/* Subtitles Scroll List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-slate-900/60"
      >
        {filteredSubtitles.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            查無相符逐字稿內容
          </div>
        ) : (
          filteredSubtitles.map((sub) => {
            const isCurrent = sub.id === activeSubId;

            return (
              <div
                key={sub.id}
                ref={isCurrent ? activeLineRef : null}
                className={`group/item rounded-xl transition-all duration-150 border ${
                  isCurrent
                    ? 'bg-blue-600/15 border-blue-500/40 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-slate-850/50 hover:bg-slate-800/80 border-slate-800/60'
                } p-3.5 flex flex-col gap-2`}
              >
                {/* Meta Row: Time & Speaker */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
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
                    {isEditMode ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <input
                          type="text"
                          value={sub.speaker}
                          onChange={(e) => handleLineChange(sub.id, 'speaker', e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <span className={`font-semibold tracking-wide ${sub.color || 'text-slate-300'}`}>
                        {sub.speaker || '發言者'}
                      </span>
                    )}
                  </div>

                  {/* Edit Controls Toolbar */}
                  {isEditMode && (
                    <div className="flex items-center gap-1 text-[11px]">
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
                </div>

                {/* Subtitle Text Content */}
                {isEditMode ? (
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
