import React, { useState } from 'react';
import { extractYouTubeId } from '../utils/youtubeHelper';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { X, Play, AlertCircle, CheckCircle2 } from 'lucide-react';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadYouTube: (url: string, videoId: string) => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({
  isOpen,
  onClose,
  onLoadYouTube
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const detectedId = extractYouTubeId(inputUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!inputUrl.trim()) {
      setErrorMsg('請輸入 YouTube 影片網址或 ID');
      return;
    }

    const videoId = extractYouTubeId(inputUrl);
    if (!videoId) {
      setErrorMsg('無法辨識此 YouTube 連結，請確認格式（如 https://www.youtube.com/watch?v=... 或 youtu.be/...）');
      return;
    }

    onLoadYouTube(inputUrl.trim(), videoId);
    setInputUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">載入 YouTube 影片</h3>
              <p className="text-[11px] text-slate-400">貼上 YouTube 連結直接在工作台中同步播放與筆記</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              YouTube 影片網址或 Video ID
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="例如: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              支援標準網址、短網址 (<code className="text-red-300">youtu.be</code>)、嵌入網址或 11 字元代碼。
            </p>
          </div>

          {/* Validation Feedback */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {detectedId && !errorMsg && (
            <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 truncate">
                  已識別 Video ID: <strong className="text-white font-mono">{detectedId}</strong>
                </span>
              </div>
              <img
                src={`https://img.youtube.com/vi/${detectedId}/mqdefault.jpg`}
                alt="thumbnail"
                className="w-16 h-9 object-cover rounded-md border border-slate-700/80 flex-shrink-0"
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!inputUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>載入影片</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
