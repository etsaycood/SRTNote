import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SubtitleItem, LMStudioConfig, TimeRange } from '../../types';
import { streamLMStudioSummary } from '../../utils/lmStudioClient';
import { PROMPT_PRESETS, getPromptPreset } from '../../utils/promptPresets';
import { formatTime, parseTimeToSeconds } from '../../utils/timeFormatter';
import {
  Sparkles,
  Wand2,
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
  Play,
  SlidersHorizontal,
  ChevronDown,
  Settings
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
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [activeMarker, setActiveMarker] = useState<'start' | 'end' | null>(null);
  const [startInputText, setStartInputText] = useState(formatTime(timeRange.start, duration >= 3600));
  const [endInputText, setEndInputText] = useState(formatTime(timeRange.end, duration >= 3600));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setStartInputText(formatTime(timeRange.start, duration >= 3600));
  }, [timeRange.start, duration]);

  useEffect(() => {
    setEndInputText(formatTime(timeRange.end, duration >= 3600));
  }, [timeRange.end, duration]);

  // Elapsed timer while generating
  useEffect(() => {
    let timer: number;
    if (isGenerating) {
      timer = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

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

  // Compute subtitles and total characters for analysis (either full video or filtered by selected range)
  const { activeSubtitles, totalChars } = useMemo(() => {
    let list = subtitles;
    if (timeRange && timeRange.enabled) {
      const minT = Math.min(timeRange.start, timeRange.end);
      const maxT = Math.max(timeRange.start, timeRange.end);
      const filtered = subtitles.filter((s) => s.startTime >= minT && s.startTime <= maxT);
      if (filtered.length > 0) list = filtered;
    }
    const chars = list.reduce((acc, cur) => acc + (cur.text?.length || 0), 0);
    return {
      activeSubtitles: list,
      totalChars: chars
    };
  }, [subtitles, timeRange]);

  // Estimated generation time in seconds based on subtitles count and characters
  const estimatedSeconds = useMemo(() => {
    const baseOverhead = 5;
    const contentTime = Math.round(totalChars / 35 + activeSubtitles.length * 0.25);
    return Math.max(8, Math.min(60, baseOverhead + contentTime));
  }, [totalChars, activeSubtitles.length]);

  const rangeDuration = Math.max(0, timeRange.end - timeRange.start);

  // Stop Generation handler (點擊終止)
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
    setElapsedSeconds(0);
    const rangeLabel = timeRange.enabled
      ? `區間 [${formatTime(timeRange.start, duration >= 3600)} ~ ${formatTime(timeRange.end, duration >= 3600)}]`
      : '全片';
    setStatusText(`正在連線 API 伺服器，準備分析${rangeLabel} (共 ${activeSubtitles.length} 句，約 ${totalChars} 字)...`);
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
      {/* Top Header Badge & Controls (Floating overlay matching SlidePanel) */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Title Badge (rounded-full) */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-md">
            <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
              <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            </span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold tracking-wider text-slate-200">
              重點整理
            </span>
          </div>

          {/* Action Controls Pill */}
          <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md">
            {/* Main AI Generate / Terminate Button */}
            {isGenerating ? (
              <button
                onClick={handleStopGeneration}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all active:scale-95 animate-pulse"
                title="點擊以終止 AI 生成"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>終止 ({elapsedSeconds}s / ~{estimatedSeconds}s)</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAIGenerateModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25"
                title="開啟 AI 重點整理（選擇提示範本、區間或全部、預計時間）"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI</span>
                <ChevronDown className="w-3 h-3 text-purple-200" />
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="複製文字"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* 手動編輯圖示按鈕 */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                isEditing
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isEditing ? '切換為預覽筆記' : '手動編輯筆記'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            {/* 下載圖示按鈕 */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="下載 Markdown 筆記 (.md)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* 上傳圖示按鈕 */}
            <label
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="上傳 Markdown 筆記 (.md/.txt)"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".md,.txt"
                onChange={handleUploadMarkdown}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Window Controls (Maximize & Close) */}
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

      {/* Real-time Status / Loading Banner */}
      {isGenerating && (
        <div className="px-4 py-2.5 bg-purple-950/90 border-b border-purple-800/80 text-purple-200 text-xs flex flex-col gap-1.5 animate-fade-in flex-shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
              <span className="font-mono truncate">{statusText || 'AI 深度分析運算中...'}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[11px] font-mono text-purple-300">
                已耗時 {elapsedSeconds}s / 預計約 {estimatedSeconds}s
              </span>
              <button
                onClick={handleStopGeneration}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-sm active:scale-95"
                title="終止生成並保留目前產生的內容"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>終止</span>
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-purple-900/40 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-300 transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(96, Math.max(8, Math.round((elapsedSeconds / Math.max(1, estimatedSeconds)) * 100)))}%`
              }}
            />
          </div>
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
              <Settings className="w-3.5 h-3.5" />
              檢查 API 設定
            </button>
          </div>
        </div>
      )}

      {/* Editor & Content Area (Full height underneath floating overlay) */}
      <div className="flex-1 overflow-y-auto p-5 pt-14 custom-scrollbar bg-slate-900/40 h-full w-full">
        {isEditing ? (
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>支援標準 Markdown 語法，加入 [MM:SS] 或 [HH:MM:SS] 可自動產生跳轉時間戳記</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInsertCurrentTimestamp}
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>[{formatTime(currentTime, currentTime >= 3600)}]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 hover:bg-purple-600 hover:text-white transition-colors"
                >
                  完成預覽
                </button>
              </div>
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
            className="markdown-body prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed relative"
          >
            {summary ? (
              <div className="relative group/note">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="absolute -top-1 right-0 opacity-0 group-hover/note:opacity-100 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 shadow-md transition-all flex items-center gap-1 text-xs"
                  title="手動編輯此筆記"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>編輯筆記</span>
                </button>
                <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              </div>
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
                    onClick={() => setShowAIGenerateModal(true)}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>AI 重點整理</span>
                  </button>
                  <button
                    onClick={onOpenLMConfig}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/80 transition-all"
                  >
                    <Settings className="w-4 h-4 text-purple-400" />
                    API 連線設定
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Generate Wizard Modal (按鈕連結整合：1.選擇提示範本 -> 2.選擇區間或全部 -> 3.送出執行並顯示預計時間，可再按一下終止) */}
      {showAIGenerateModal && (
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 p-3 sm:p-5 flex items-center justify-center animate-fade-in"
          onClick={() => setShowAIGenerateModal(false)}
        >
          <div
            className="max-w-lg w-full bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4 max-h-[92%] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">AI 重點整理</h4>
                  <p className="text-[11px] text-slate-400">依序選擇提示範本與分析範圍後送出執行</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIGenerateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: 選擇提示範本 (下拉選單，無詳細說明) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600/30 text-purple-300 text-[10px] flex items-center justify-center font-bold">1</span>
                  選擇提示範本
                </span>
              </div>

              <select
                value={lmConfig.presetId || 'business'}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
              >
                {PROMPT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: 選擇區間或全部 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] flex items-center justify-center font-bold">2</span>
                  選擇分析範圍
                </span>
                <span className="text-[10px] text-slate-500 font-normal">全片或自訂時間區間</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 1: 全片 */}
                <button
                  type="button"
                  onClick={() => handleToggleRange(false)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    !timeRange.enabled
                      ? 'bg-blue-600/20 border-blue-500 shadow-sm shadow-blue-600/20 text-white ring-1 ring-blue-400/50'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">全片逐字稿</span>
                    {!timeRange.enabled && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    00:00 ~ {formatTime(duration, duration >= 3600)}
                  </div>
                  <div className="text-[10px] text-blue-300/80 font-mono">
                    共 {subtitles.length} 句逐字稿
                  </div>
                </button>

                {/* Option 2: 區間 */}
                <button
                  type="button"
                  onClick={() => handleToggleRange(true)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    timeRange.enabled
                      ? 'bg-purple-600/20 border-purple-500 shadow-sm shadow-purple-600/20 text-white ring-1 ring-purple-400/50'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">自訂時間區間</span>
                    {timeRange.enabled && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatTime(timeRange.start, duration >= 3600)} ~ {formatTime(timeRange.end, duration >= 3600)}
                  </div>
                  <div className="text-[10px] text-purple-300/80 font-mono">
                    共 {activeSubtitles.length} 句 ({formatTime(rangeDuration, rangeDuration >= 3600)})
                  </div>
                </button>
              </div>

              {/* Range Detail Editors (When Range is Selected) */}
              {timeRange.enabled && (
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs animate-fade-in font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px] font-sans">起點時間</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={startInputText}
                        onChange={(e) => setStartInputText(e.target.value)}
                        onBlur={(e) => handleRangeStartChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRangeStartChange((e.target as HTMLInputElement).value);
                        }}
                        className="w-16 bg-slate-900 text-center text-white text-xs font-mono rounded px-1.5 py-1 border border-slate-700 focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSetCurrentAsStart}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600 hover:text-white text-purple-300 text-[10px] font-sans transition-colors active:scale-95"
                        title="將當前播放時間設為起點"
                      >
                        當前播放 ({formatTime(currentTime, duration >= 3600)})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px] font-sans">終點時間</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={endInputText}
                        onChange={(e) => setEndInputText(e.target.value)}
                        onBlur={(e) => handleRangeEndChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRangeEndChange((e.target as HTMLInputElement).value);
                        }}
                        className="w-16 bg-slate-900 text-center text-white text-xs font-mono rounded px-1.5 py-1 border border-slate-700 focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSetCurrentAsEnd}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600 hover:text-white text-purple-300 text-[10px] font-sans transition-colors active:scale-95"
                        title="將當前播放時間設為終點"
                      >
                        當前播放 ({formatTime(currentTime, duration >= 3600)})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Time Indicator */}
            <div className="p-3 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/60 border border-purple-800/40 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-purple-200">
                    預計分析耗時：約 <span className="font-mono text-purple-300 font-bold text-sm">{estimatedSeconds}</span> 秒
                  </div>
                  <div className="text-[10px] text-slate-400">
                    以選取之 {activeSubtitles.length} 句逐字稿（約 {totalChars} 字）推算
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                ~{estimatedSeconds}s
              </span>
            </div>

            {/* Step 3: 送出執行按鈕 */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAIGenerateModal(false);
                  handleGenerateAI();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Wand2 className="w-4 h-4" />
                <span>送出執行重點整理</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
