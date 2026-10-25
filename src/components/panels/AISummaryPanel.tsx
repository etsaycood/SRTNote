import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SubtitleItem, LMStudioConfig, TimeRange } from '../../types';
import { streamLMStudioSummary } from '../../utils/lmStudioClient';
import { PROMPT_PRESETS, getPromptPreset } from '../../utils/promptPresets';
import { formatTime, parseTimeToSeconds } from '../../utils/timeFormatter';
import {
  Sparkles,
  Wand2,
  Settings2,
  Copy,
  Check,
  Download,
  Upload,
  Edit3,
  Maximize2,
  Minimize2,
  Clock,
  HelpCircle,
  Loader2,
  Cpu,
  SplitSquareVertical,
  Crosshair,
  Square,
  X,
  GripVertical,
  Play
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface AISummaryPanelProps {
  summary: string;
  subtitles: SubtitleItem[];
  lmConfig: LMStudioConfig;
  currentTime: number;
  duration?: number;
  timeRange?: TimeRange;
  onUpdateTimeRange?: (range: TimeRange) => void;
  onUpdateSummary: (newSummary: string) => void;
  onSeek: (seconds: number) => void;
  onOpenLMConfig: () => void;
  onUpdateLMConfig?: (config: LMStudioConfig) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose?: () => void;
}

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  summary,
  subtitles,
  lmConfig,
  currentTime,
  duration = 0,
  timeRange = { enabled: false, start: 0, end: 60 },
  onUpdateTimeRange,
  onUpdateSummary,
  onSeek,
  onOpenLMConfig,
  onUpdateLMConfig,
  isMaximized,
  onToggleMaximize,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeMarker, setActiveMarker] = useState<'start' | 'end' | null>(null);
  const [startInputText, setStartInputText] = useState(formatTime(timeRange.start, duration >= 3600));
  const [endInputText, setEndInputText] = useState(formatTime(timeRange.end, duration >= 3600));

  useEffect(() => {
    setStartInputText(formatTime(timeRange.start, duration >= 3600));
  }, [timeRange.start, duration]);

  useEffect(() => {
    setEndInputText(formatTime(timeRange.end, duration >= 3600));
  }, [timeRange.end, duration]);

  const handleScenarioChange = (newPresetId: string) => {
    const preset = getPromptPreset(newPresetId);
    if (onUpdateLMConfig) {
      onUpdateLMConfig({
        ...lmConfig,
        presetId: newPresetId,
        systemPrompt: preset.systemPrompt
      });
    }
  };

  // Compute subtitles for analysis (either full video or filtered by selected range)
  const { activeSubtitles, startIndex, endIndex } = useMemo(() => {
    if (!timeRange || !timeRange.enabled) {
      return {
        activeSubtitles: subtitles,
        startIndex: subtitles.length > 0 ? 1 : 0,
        endIndex: subtitles.length
      };
    }
    const minT = Math.min(timeRange.start, timeRange.end);
    const maxT = Math.max(timeRange.start, timeRange.end);
    let firstIdx = -1;
    let lastIdx = -1;
    const filtered = subtitles.filter((s, idx) => {
      const match = s.startTime >= minT && s.startTime <= maxT;
      if (match) {
        if (firstIdx === -1) firstIdx = idx + 1;
        lastIdx = idx + 1;
      }
      return match;
    });
    return {
      activeSubtitles: filtered.length > 0 ? filtered : subtitles,
      startIndex: firstIdx > 0 ? firstIdx : 1,
      endIndex: lastIdx > 0 ? lastIdx : subtitles.length
    };
  }, [subtitles, timeRange]);

  const rangeDuration = Math.max(0, timeRange.end - timeRange.start);

  // Stop Generation handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(new Error('使用者手動停止生成'));
    }
    setIsGenerating(false);
    setStatusText('');
  };

  // Trigger AI API streaming generation
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    const rangeLabel = timeRange.enabled
      ? `區間 [${formatTime(timeRange.start, duration >= 3600)} ~ ${formatTime(timeRange.end, duration >= 3600)}]`
      : '全片';
    setStatusText(`正在連線 API 伺服器，準備分析${rangeLabel} (共 ${activeSubtitles.length} 句)...`);
    setErrorMessage(null);
    setIsEditing(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentAccumulated = '';
    await streamLMStudioSummary({
      config: lmConfig,
      subtitles: activeSubtitles,
      abortController: controller,
      onStatus: (st) => setStatusText(st),
      onChunk: (_chunk, fullText) => {
        currentAccumulated = fullText;
        onUpdateSummary(fullText);
      },
      onComplete: (fullText) => {
        setIsGenerating(false);
        setStatusText('');
        onUpdateSummary(fullText);
      },
      onError: (err) => {
        setIsGenerating(false);
        setStatusText('');
        setErrorMessage(err.message || '連線至 API 伺服器失敗。');
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting_ai_summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onUpdateSummary(text);
          setIsEditing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInsertCurrentTimestamp = () => {
    const stamp = `[${formatTime(currentTime, currentTime >= 3600)}] `;
    onUpdateSummary((summary ? summary + '\n' : '') + stamp);
  };

  const handleToggleRange = (enabled: boolean) => {
    if (!onUpdateTimeRange) return;
    if (enabled) {
      const start = Math.floor(currentTime);
      const defaultLen = duration > 0 ? Math.min(900, Math.max(180, Math.floor(duration * 0.2))) : 600;
      const end = Math.min(duration || start + defaultLen, start + defaultLen);
      onUpdateTimeRange({ enabled: true, start, end });
    } else {
      onUpdateTimeRange({ ...timeRange, enabled: false });
    }
  };

  const handleRangeStartChange = (valStr: string) => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('start');
    const sec = parseTimeToSeconds(valStr);
    const validSec = Math.max(0, Math.min(timeRange.end - 1, sec));
    onUpdateTimeRange({ ...timeRange, enabled: true, start: validSec });
    setStartInputText(formatTime(validSec, duration >= 3600));
  };

  const handleRangeEndChange = (valStr: string) => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('end');
    const sec = parseTimeToSeconds(valStr);
    const validSec = Math.min(duration || 999999, Math.max(timeRange.start + 1, sec));
    onUpdateTimeRange({ ...timeRange, enabled: true, end: validSec });
    setEndInputText(formatTime(validSec, duration >= 3600));
  };

  const handleSetCurrentAsStart = () => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('start');
    const cur = Math.floor(currentTime);
    const newEnd = cur >= timeRange.end ? Math.min(duration || cur + 300, cur + 300) : timeRange.end;
    onUpdateTimeRange({ ...timeRange, enabled: true, start: cur, end: newEnd });
  };

  const handleSetCurrentAsEnd = () => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('end');
    const cur = Math.floor(currentTime);
    const newStart = cur <= timeRange.start ? Math.max(0, cur - 300) : timeRange.start;
    onUpdateTimeRange({ ...timeRange, enabled: true, start: newStart, end: cur });
  };

  const handleAdjustStart = (delta: number) => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('start');
    const newStart = Math.max(0, Math.min(timeRange.end - 1, timeRange.start + delta));
    onUpdateTimeRange({ ...timeRange, enabled: true, start: newStart });
  };

  const handleAdjustEnd = (delta: number) => {
    if (!onUpdateTimeRange) return;
    setActiveMarker('end');
    const newEnd = Math.min(duration || 999999, Math.max(timeRange.start + 1, timeRange.end + delta));
    onUpdateTimeRange({ ...timeRange, enabled: true, end: newEnd });
  };

  // Convert timestamps like [01:23] or [01:23:45] into interactive clickable HTML tags
  const renderedHtml = useMemo(() => {
    if (!summary) return '';
    try {
      let html = marked.parse(summary, { async: false }) as string;
      const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
      html = html.replace(timestampRegex, (_match, timeStr) => {
        return `<button type="button" class="timestamp-badge" data-time="${timeStr}">⏱️ ${timeStr}</button>`;
      });
      return DOMPurify.sanitize(html, {
        ADD_TAGS: ['button'],
        ADD_ATTR: ['data-time', 'type', 'class']
      });
    } catch (e) {
      return summary;
    }
  }, [summary]);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.timestamp-badge');
    if (target) {
      const timeStr = target.getAttribute('data-time');
      if (timeStr) {
        const seconds = parseTimeToSeconds(timeStr);
        onSeek(seconds);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
            <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </span>
          <div className="w-5 h-5 rounded-md bg-purple-500/15 flex items-center justify-center text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            重點整理 (AI Smart Summary)
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {/* Scenario Selector Dropdown */}
          <select
            value={lmConfig.presetId || 'business'}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-purple-500/60 rounded-xl px-2.5 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-500 cursor-pointer transition-colors font-medium shadow-sm"
            title="切換分析情境提示詞範本"
          >
            {PROMPT_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.icon} {p.name}
              </option>
            ))}
          </select>

          {/* Main Generate / Stop Button */}
          {isGenerating ? (
            <button
              onClick={handleStopGeneration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all active:scale-95 animate-pulse"
              title="停止 AI 生成 (保留目前產出內容)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止生成</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25"
              title="呼叫 AI API 執行深度重點整理"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>
                {timeRange.enabled ? '產生區間整理' : '產生重點整理'}
              </span>
            </button>
          )}

          {/* Toggle Edit Mode */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              isEditing
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="手動編輯摘要內容"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditing ? '預覽' : '編輯'}</span>
          </button>

          {/* API Config */}
          <button
            onClick={onOpenLMConfig}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition-colors"
            title="AI API 連線設定與模型偵測"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="複製文字"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="下載為 Markdown 筆記"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Upload Markdown */}
          <label
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            title="上傳自訂 Markdown 筆記"
          >
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".md,.txt" onChange={handleUploadMarkdown} className="hidden" />
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

      {/* Sub-toolbar: Compact Single Row */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300">
        {/* Left: Mode Toggle & Range In/Out Markers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Mode: Full Video vs Range */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => handleToggleRange(false)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-xs ${
                !timeRange.enabled
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              全片
            </button>

            <button
              onClick={() => handleToggleRange(true)}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all text-xs ${
                timeRange.enabled
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>自訂區間</span>
            </button>
          </div>

          {/* When Range is Enabled: Enlarged Start & End Buttons with Color-Change and Hover Extras */}
          {timeRange.enabled && (
            <div className="flex items-center gap-2 animate-fade-in font-mono">
              {/* Start Point Button & Time */}
              <div className={`group/start flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
                activeMarker === 'start'
                  ? 'bg-purple-950/70 border-purple-500 shadow-sm shadow-purple-600/30 ring-1 ring-purple-500/50'
                  : 'bg-slate-900 border-slate-700/80 hover:border-purple-500/50'
              }`}>
                <button
                  type="button"
                  onClick={handleSetCurrentAsStart}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-xs active:scale-95 ${
                    activeMarker === 'start'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white'
                  }`}
                  title={`點擊以當前播放時間 (${formatTime(currentTime, duration >= 3600)}) 設為起點`}
                >
                  <Crosshair className="w-4 h-4 fill-current" />
                  <span className="text-xs">起點</span>
                </button>

                <input
                  type="text"
                  value={startInputText}
                  onChange={(e) => setStartInputText(e.target.value)}
                  onBlur={(e) => handleRangeStartChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRangeStartChange((e.target as HTMLInputElement).value);
                  }}
                  className="w-16 bg-transparent text-center text-white text-xs font-mono focus:outline-none focus:bg-slate-950 rounded px-1 py-0.5 border border-transparent focus:border-purple-500"
                  title="起點時間 (可手動修改)"
                />

                {/* Hover-only controls: Stepper & Seek */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/start:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => handleAdjustStart(-5)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[10px]"
                    title="起點 -5s"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStart(5)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[10px]"
                    title="起點 +5s"
                  >
                    +5s
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeek(timeRange.start)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300"
                    title="跳轉播放起點"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>

              <span className="text-slate-600 text-xs">至</span>

              {/* End Point Button & Time */}
              <div className={`group/end flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
                activeMarker === 'end'
                  ? 'bg-purple-950/70 border-purple-500 shadow-sm shadow-purple-600/30 ring-1 ring-purple-500/50'
                  : 'bg-slate-900 border-slate-700/80 hover:border-purple-500/50'
              }`}>
                <button
                  type="button"
                  onClick={handleSetCurrentAsEnd}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-xs active:scale-95 ${
                    activeMarker === 'end'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white'
                  }`}
                  title={`點擊以當前播放時間 (${formatTime(currentTime, duration >= 3600)}) 設為終點`}
                >
                  <Crosshair className="w-4 h-4 fill-current" />
                  <span className="text-xs">終點</span>
                </button>

                <input
                  type="text"
                  value={endInputText}
                  onChange={(e) => setEndInputText(e.target.value)}
                  onBlur={(e) => handleRangeEndChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRangeEndChange((e.target as HTMLInputElement).value);
                  }}
                  className="w-16 bg-transparent text-center text-white text-xs font-mono focus:outline-none focus:bg-slate-950 rounded px-1 py-0.5 border border-transparent focus:border-purple-500"
                  title="終點時間 (可手動修改)"
                />

                {/* Hover-only controls: Stepper & Seek */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/end:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={() => handleAdjustEnd(-5)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[10px]"
                    title="終點 -5s"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustEnd(5)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[10px]"
                    title="終點 +5s"
                  >
                    +5s
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeek(timeRange.end)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300"
                    title="跳轉播放終點"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Status / Loading Banner */}
      {isGenerating && (
        <div className="px-4 py-2.5 bg-purple-950/80 border-b border-purple-800/80 text-purple-200 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
            <span className="font-mono truncate">{statusText || 'AI 運算進行中...'}</span>
          </div>
          <button
            onClick={handleStopGeneration}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>停止生成</span>
          </button>
        </div>
      )}

      {/* Helpful Error alert banner */}
      {errorMessage && (
        <div className="px-4 py-3 bg-amber-950/70 border-b border-amber-800/80 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                請開啟 API 設定檢查伺服器位址 (URL)、連接埠與 CORS 跨域設定。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <button
              onClick={onOpenLMConfig}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition-colors text-xs"
            >
              <Settings2 className="w-3.5 h-3.5" />
              檢查 API 設定
            </button>
          </div>
        </div>
      )}

      {/* Editor & Content Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-900/40">
        {isEditing ? (
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>支援標準 Markdown 語法，加入 [MM:SS] 或 [HH:MM:SS] 可自動產生跳轉時間戳記</span>
              <button
                type="button"
                onClick={handleInsertCurrentTimestamp}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium"
              >
                <Clock className="w-3.5 h-3.5" />
                插入當前時間戳 [{formatTime(currentTime, currentTime >= 3600)}]
              </button>
            </div>
            <textarea
              value={summary}
              onChange={(e) => onUpdateSummary(e.target.value)}
              placeholder="可直接在此編寫或貼上重點整理..."
              className="flex-1 w-full bg-slate-950 border border-slate-700/80 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>
        ) : (
          <div
            onClick={handleContentClick}
            className="markdown-body prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed"
          >
            {summary ? (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : isGenerating ? (
              /* Actively generating placeholder */
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center max-w-md mx-auto">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-700/60 flex items-center justify-center text-purple-400 animate-pulse">
                    <Cpu className="w-8 h-8" />
                  </div>
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin absolute -top-1 -right-1" />
                </div>
                <h4 className="font-bold text-white text-base mb-1.5">
                  {timeRange.enabled ? 'AI 正在分析指定區間' : 'AI 正在深度分析中'}
                </h4>
                <p className="text-xs text-purple-300 font-mono mb-3">{statusText || '正在連線與推論...'}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  模型正在以持續串流生成內容。您隨時可點擊下方按鈕停止並保留目前文字。
                </p>
                <button
                  onClick={handleStopGeneration}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止生成 (保留目前內容)</span>
                </button>
              </div>
            ) : (
              /* Empty state before generation */
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center mb-3 text-purple-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-slate-200 mb-1 text-base">
                  {timeRange.enabled ? '尚未產生自訂區間重點整理' : '尚未產生重點整理'}
                </h4>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  {timeRange.enabled
                    ? `已為您選定 [${formatTime(timeRange.start, duration >= 3600)} ~ ${formatTime(timeRange.end, duration >= 3600)}] 區間，共 ${activeSubtitles.length} 句逐字稿。點擊下方按鈕即可開始專題整理！`
                    : '系統將深度解析逐字稿內容，自動歸納核心綱要、行動清單與時間標籤。您可選擇全片分析或上方自訂區間分析。'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Wand2 className="w-4 h-4" />
                    {timeRange.enabled ? '使用 AI API 分析自訂區間' : '開始 AI 深度分析'}
                  </button>
                  <button
                    onClick={onOpenLMConfig}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/80 transition-all"
                  >
                    <Settings2 className="w-4 h-4 text-purple-400" />
                    API 連線設定
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
