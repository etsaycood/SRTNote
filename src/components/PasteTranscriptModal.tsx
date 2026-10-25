import React, { useState, useMemo } from 'react';
import { SubtitleItem } from '../types';
import { parsePastedTranscript } from '../utils/srtParser';
import { FileText, X, Check, Clipboard, Info, Sparkles } from 'lucide-react';

interface PasteTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSubtitles: (subtitles: SubtitleItem[], append: boolean) => void;
  defaultDuration?: number;
}

export const PasteTranscriptModal: React.FC<PasteTranscriptModalProps> = ({
  isOpen,
  onClose,
  onImportSubtitles,
  defaultDuration = 0
}) => {
  const [rawText, setRawText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Real-time preview parse
  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];
    return parsePastedTranscript(rawText, defaultDuration);
  }, [rawText, defaultDuration]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedItems.length === 0) return;

    onImportSubtitles(parsedItems, importMode === 'append');
    setRawText('');
    onClose();
  };

  const handlePasteDemo = () => {
    const demo = `0:00
各位好，我們開始今天的產品研發與會員改版週會。
0:14
今天主要確認會員系統改版的上線時程，還有目前的測試與部署進度。
0:19
陳工程師，先請你報告一下目前前後端核心功能的開發狀況。
0:25
好的，王經理。我來同步目前前後端的完成度。
0:27
後端會員登入、註冊、個人資料與點數兌換三模組已 100% 完工並合併主線。`;
    setRawText(demo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Clipboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">貼上逐字稿文字 (Pasted Transcript)</h3>
              <p className="text-[11px] text-slate-400">支援 YouTube 逐字稿、時間標記文字或標準 SRT/VTT 格式</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col min-h-0 space-y-3.5 overflow-y-auto custom-scrollbar">
          {/* Quick Help Tip */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-300">如何從 YouTube 複製逐字稿：</p>
              <p className="text-[11px] text-slate-300">
                1. 在 YouTube 影片下方點擊「... 更多」選單 ➔ 點選「<strong>顯示逐字稿</strong>」。<br />
                2. 按 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Ctrl+A</kbd> 或手動全選逐字稿並複製。<br />
                3. 直接貼入下方文字框，即使帶有 YouTube 產生的隱藏秒數標記（如 <code>0:1818 秒歌詞...</code>）也能自動辨識！
              </p>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                逐字稿文字內容
              </label>
              <button
                type="button"
                onClick={handlePasteDemo}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                <span>填入測試範本</span>
              </button>
            </div>
            <textarea
              autoFocus
              placeholder="請在此貼上逐字稿內容...&#10;&#10;支援格式範例 1 (YouTube 複製):&#10;0:011 秒[♪♪♪]&#10;0:1818 秒♪ 歌詞或對話內容 ♪&#10;&#10;支援格式範例 2 (時間與內文分行):&#10;0:00&#10;各位好，會議開始&#10;0:15&#10;今天討論專案進度&#10;&#10;支援格式範例 3:&#10;00:00 [王經理] 各位好，會議開始&#10;00:15 [陳工程師] 好的，收到"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="flex-1 w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 custom-scrollbar resize-none"
            />
          </div>

          {/* Import Mode Options & Parser Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Mode selection */}
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-blue-600 focus:ring-0"
                />
                <span>取代目前所有逐字稿</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-blue-600 focus:ring-0"
                />
                <span>追加到現有逐字稿後方</span>
              </label>
            </div>

            {/* Parse result counter */}
            {parsedItems.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                <span>已成功解析 {parsedItems.length} 句字幕</span>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={parsedItems.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>確定匯入 ({parsedItems.length} 句)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
