import React, { useState, useEffect, useMemo } from 'react';
import {
  ShareMode,
  SubtitleItem,
  YouTubeHistoryItem,
  LoopMode,
  MediaType,
  ProjectConfig
} from '../types';
import {
  CloudProvider,
  CLOUD_PROVIDERS,
  ShareUploadResult,
  uploadShareConfig,
  formatByteSize
} from '../utils/cloudShare';
import { getStoredYouTubeLibrary, extractYouTubeId } from '../utils/youtubeHelper';
import {
  Share2,
  X,
  Copy,
  Check,
  ExternalLink,
  FileJson,
  Globe,
  ListVideo,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  Cloud,
  CheckCircle2,
  EyeOff
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ShareMode;
  projectTitle: string;
  mediaType: MediaType;
  mediaUrl?: string;
  duration: number;
  subtitles: SubtitleItem[];
  subtitlesByMedia: Record<string, SubtitleItem[]>;
  playlistQueue: string[];
  loopMode: LoopMode;
  aiSummary: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'current_note',
  projectTitle,
  mediaType,
  mediaUrl,
  duration,
  subtitles,
  subtitlesByMedia,
  playlistQueue,
  loopMode,
  aiSummary
}) => {
  const [shareMode, setShareMode] = useState<ShareMode>(initialMode);
  const [preferredProvider, setPreferredProvider] = useState<CloudProvider | 'auto'>('auto');
  const [includeHistorySubtitles, setIncludeHistorySubtitles] = useState<boolean>(true);
  const [youtubeLibrary, setYoutubeLibrary] = useState<YouTubeHistoryItem[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ShareUploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'share' | 'gh' | 'raw' | 'web' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShareMode(initialMode);
      setYoutubeLibrary(getStoredYouTubeLibrary());
      setUploadResult(null);
      setErrorMsg(null);
      setCopiedType(null);
    }
  }, [isOpen, initialMode]);

  // Clear previous result if user changes share mode or options
  useEffect(() => {
    setUploadResult(null);
    setErrorMsg(null);
  }, [shareMode, preferredProvider, includeHistorySubtitles]);

  const activeYtId = useMemo(() => {
    if (mediaType === 'youtube' && mediaUrl) {
      return extractYouTubeId(mediaUrl);
    }
    return null;
  }, [mediaType, mediaUrl]);

  // Build the ProjectConfig payload (always excluding slides!)
  const payloadConfig = useMemo<ProjectConfig>(() => {
    const nowIso = new Date().toISOString();

    if (shareMode === 'youtube_history') {
      // Ensure current active YouTube video is also included in library if not already
      let list = [...youtubeLibrary];
      if (activeYtId && mediaUrl && !list.some((item) => item.id === activeYtId)) {
        list = [
          {
            id: activeYtId,
            url: mediaUrl,
            title: projectTitle || `YouTube 影片 (${activeYtId})`,
            addedAt: Date.now()
          },
          ...list
        ];
      }

      const firstVideo = list[0];
      const targetYtId = activeYtId || firstVideo?.id;
      const targetYtUrl =
        mediaType === 'youtube' && mediaUrl
          ? mediaUrl
          : firstVideo?.url || (targetYtId ? `https://www.youtube.com/watch?v=${targetYtId}` : undefined);

      // Build subtitlesByMedia map for videos in library if user opted to include them
      const mergedSubsByMedia: Record<string, SubtitleItem[]> = {};
      if (includeHistorySubtitles) {
        for (const item of list) {
          const subs =
            item.id === activeYtId && subtitles.length > 0
              ? subtitles
              : subtitlesByMedia[item.id];
          if (subs && subs.length > 0) {
            mergedSubsByMedia[item.id] = subs;
          }
        }
      }

      const firstSubs =
        includeHistorySubtitles && targetYtId && mergedSubsByMedia[targetYtId]
          ? mergedSubsByMedia[targetYtId]
          : [];

      return {
        version: '1.2.0',
        shareMode: 'youtube_history',
        title: projectTitle || 'YouTube 影片紀錄分享',
        mediaType: 'youtube',
        youtubeUrl: targetYtUrl,
        youtubeId: targetYtId || undefined,
        mediaDuration: duration || 60,
        subtitles: firstSubs,
        subtitlesByMedia: Object.keys(mergedSubsByMedia).length > 0 ? mergedSubsByMedia : undefined,
        slides: [], // 內容不包含簡報
        youtubeHistory: list,
        playlistVideoIds:
          playlistQueue.length > 0 ? playlistQueue : list.map((item) => item.id),
        loopMode,
        aiSummary: '',
        aiKeyPoints: [],
        updatedAt: nowIso
      };
    }

    // Mode: 'current_note' (YouTube 當前影片 + 逐字稿 + 重點整理分享)
    return {
      version: '1.2.0',
      shareMode: 'current_note',
      title: projectTitle || 'SRTNote 影音筆記分享',
      mediaType: mediaType === 'youtube' ? 'youtube' : 'audio',
      youtubeUrl: mediaType === 'youtube' ? mediaUrl : undefined,
      youtubeId: activeYtId || undefined,
      mediaDuration: duration || 60,
      subtitles,
      subtitlesByMedia:
        activeYtId && subtitles.length > 0 ? { [activeYtId]: subtitles } : undefined,
      slides: [], // 內容不包含簡報
      loopMode,
      aiSummary,
      aiKeyPoints: [],
      updatedAt: nowIso
    };
  }, [
    shareMode,
    youtubeLibrary,
    activeYtId,
    mediaUrl,
    mediaType,
    projectTitle,
    duration,
    subtitles,
    subtitlesByMedia,
    playlistQueue,
    loopMode,
    aiSummary,
    includeHistorySubtitles
  ]);

  const estimatedBytes = useMemo(() => {
    try {
      return new Blob([JSON.stringify(payloadConfig)]).size;
    } catch {
      return 0;
    }
  }, [payloadConfig]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setErrorMsg(null);

    if (shareMode === 'youtube_history' && (!payloadConfig.youtubeHistory || payloadConfig.youtubeHistory.length === 0)) {
      setErrorMsg('目前尚無已儲存的 YouTube 影片紀錄可供分享，請先新增 YouTube 影片。');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadShareConfig(payloadConfig, preferredProvider);
      setUploadResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || '產生分享連結失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopy = (text: string, type: 'share' | 'gh' | 'raw' | 'web') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2200);
  };

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">產生雲端分享連結</h2>
              <p className="text-xs text-slate-400">
                自動將內容打包為雲端 JSON（不含簡報），開啟連結時自動隱藏簡報視窗
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Step 1: 選擇分享模式 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. 選擇分享模式
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Mode A: 當前影片 + 逐字稿 + 重點整理 */}
              <button
                type="button"
                onClick={() => setShareMode('current_note')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  shareMode === 'current_note'
                    ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/40 shadow-md'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      當前影片 + 逐字稿 + 重點整理
                    </span>
                    {shareMode === 'current_note' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    分享目前正在觀看的 YouTube 影片、時間軸逐字稿與 AI 重點整理筆記
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-300">
                    {activeYtId ? `YT: ${activeYtId}` : '純文字時間軸'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-emerald-300">
                    字幕 {subtitles.length} 句
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-purple-300">
                    筆記 {aiSummary.length} 字
                  </span>
                </div>
              </button>

              {/* Mode B: YouTube 影片記錄分享 */}
              <button
                type="button"
                onClick={() => setShareMode('youtube_history')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  shareMode === 'youtube_history'
                    ? 'bg-red-600/20 border-red-500 text-white ring-1 ring-red-500/40 shadow-md'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <ListVideo className="w-3.5 h-3.5 text-red-400" />
                      YouTube 影片記錄分享
                    </span>
                    {shareMode === 'youtube_history' && (
                      <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    分享您的 YouTube 影片收藏清單、自訂排序與多影片輪播清單
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-red-300">
                    共 {payloadConfig.youtubeHistory?.length || 0} 部影片記錄
                  </span>
                  {playlistQueue.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-amber-300">
                      輪播 {playlistQueue.length} 部
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Extra option when in youtube_history mode */}
          {shareMode === 'youtube_history' && (
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/70 cursor-pointer hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">一併包含各部影片已綁定的逐字稿 (SRT)</div>
                  <div className="text-[11px] text-slate-400">
                    若影片曾上傳過專屬逐字稿，切換影片時也能自動對應顯示
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeHistorySubtitles}
                onChange={(e) => setIncludeHistorySubtitles(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              />
            </label>
          )}

          {/* Package Summary & Slide Exclusion Notice */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <EyeOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                分享內容<strong className="text-amber-300 mx-1">不包含簡報</strong>，接收方開啟連結時將自動隱藏「同步簡報」面板
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-[11px] whitespace-nowrap">
              大小約 {formatByteSize(estimatedBytes)}
            </span>
          </div>

          {/* Step 2: 雲端儲存伺服器選擇 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                2. 雲端儲存空間（依大小自動選擇）
              </label>
              <span className="text-[11px] text-slate-400">皆支援直接檢視原始 JSON</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPreferredProvider('auto')}
                className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                  preferredProvider === 'auto'
                    ? 'bg-blue-600/25 border-blue-500 text-white font-semibold'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs">✨ 自動選擇</div>
                <div className="text-[10px] text-slate-400">智慧分流與備援</div>
              </button>

              {(['p', 'd', 'j'] as CloudProvider[]).map((key) => {
                const meta = CLOUD_PROVIDERS[key];
                const isOverMax = estimatedBytes > meta.maxBytes;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isOverMax}
                    onClick={() => setPreferredProvider(key)}
                    className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                      preferredProvider === key
                        ? 'bg-blue-600/25 border-blue-500 text-white font-semibold'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-white'
                    } ${isOverMax ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-xs font-mono">
                      ?s={key}_ ({meta.name})
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{meta.maxSizeDesc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/70 text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generate Button */}
          {!uploadResult && (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={isUploading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在上傳 JSON 至雲端並產生分享連結...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>產生分享連結</span>
                </>
              )}
            </button>
          )}

          {/* Generated Share Link Result Card */}
          {uploadResult && (
            <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-700/60 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    分享連結已產生！存放在 {uploadResult.providerName}（?s={uploadResult.shareParam}）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  重新產生
                </button>
              </div>

              {/* Primary Share URL (GitHub Pages or Current Origin) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-300">
                  🔗 SRTNote 專屬分享連結（點擊複製即可傳給他人開啟）：
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={isLocalhost ? uploadResult.githubPagesUrl : uploadResult.shareUrl}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        isLocalhost ? uploadResult.githubPagesUrl : uploadResult.shareUrl,
                        'gh'
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md whitespace-nowrap"
                  >
                    {copiedType === 'gh' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製連結</span>
                      </>
                    )}
                  </button>
                </div>

                {/* If running on localhost, also provide localhost test link */}
                {isLocalhost && (
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span className="truncate font-mono">本機測試：{uploadResult.shareUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(uploadResult.shareUrl, 'share')}
                      className="text-blue-400 hover:text-blue-300 ml-2 whitespace-nowrap"
                    >
                      {copiedType === 'share' ? '✓ 已複製本機連結' : '複製本機連結'}
                    </button>
                  </div>
                )}
              </div>

              {/* Cloud Direct Inspection Links (Web View & Raw JSON) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  📂 雲端伺服器原始 JSON 檢視位置（?s={uploadResult.shareParam}）：
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Web View Link */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-400" />
                        <span>網頁檢視位置</span>
                      </div>
                      <a
                        href={uploadResult.webViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-blue-400 hover:underline truncate block mt-0.5"
                      >
                        {uploadResult.webViewUrl}
                      </a>
                    </div>
                    <a
                      href={uploadResult.webViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex-shrink-0"
                      title="於新分頁開啟網頁檢視"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Raw JSON Direct Link */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <FileJson className="w-3 h-3 text-amber-400" />
                        <span>原始檔案直連 (Raw JSON)</span>
                      </div>
                      <a
                        href={uploadResult.rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-amber-300 hover:underline truncate block mt-0.5"
                      >
                        {uploadResult.rawUrl}
                      </a>
                    </div>
                    <a
                      href={uploadResult.rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex-shrink-0"
                      title="於新分頁直接打開雲端原始 JSON"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
