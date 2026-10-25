import React from 'react';
import { SlideItem } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/timeFormatter';
import { Presentation, Clock, X, Plus, Trash2, Crosshair, ArrowUpDown, Sparkles } from 'lucide-react';

interface SlideTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideItem[];
  currentTime: number;
  duration: number;
  onUpdateSlides: (newSlides: SlideItem[]) => void;
  onSeek: (seconds: number) => void;
}

export const SlideTimelineModal: React.FC<SlideTimelineModalProps> = ({
  isOpen,
  onClose,
  slides,
  currentTime,
  duration,
  onUpdateSlides,
  onSeek
}) => {
  if (!isOpen) return null;

  const handleTimeChange = (id: string, newTimeStr: string) => {
    const sec = parseTimeToSeconds(newTimeStr);
    const updated = slides.map(s => s.id === id ? { ...s, timestamp: sec } : s);
    onUpdateSlides(updated);
  };

  const handleSetCurrentTime = (id: string) => {
    const updated = slides.map(s => s.id === id ? { ...s, timestamp: Math.floor(currentTime) } : s);
    onUpdateSlides(updated);
  };

  const handleTitleChange = (id: string, title: string) => {
    const updated = slides.map(s => s.id === id ? { ...s, title } : s);
    onUpdateSlides(updated);
  };

  const handleDeleteSlide = (id: string) => {
    const updated = slides.filter(s => s.id !== id);
    // Re-index page numbers
    const reindexed = updated.map((s, idx) => ({ ...s, pageNumber: idx + 1 }));
    onUpdateSlides(reindexed);
  };

  const handleSortByTime = () => {
    const sorted = [...slides].sort((a, b) => a.timestamp - b.timestamp);
    const reindexed = sorted.map((s, idx) => ({ ...s, pageNumber: idx + 1 }));
    onUpdateSlides(reindexed);
  };

  const handleDistributeEvenly = () => {
    if (!slides || slides.length === 0) return;
    const targetDuration = duration > 0 ? duration : Math.max(60, slides.length * 20);
    const step = slides.length > 1 ? targetDuration / slides.length : 0;
    const updated = slides.map((s, idx) => ({
      ...s,
      timestamp: Math.round(idx * step)
    }));
    onUpdateSlides(updated);
  };

  const handleAddSlide = () => {
    const newSlide: SlideItem = {
      id: `slide_${Date.now()}`,
      pageNumber: slides.length + 1,
      title: `簡報第 ${slides.length + 1} 頁`,
      timestamp: Math.floor(currentTime)
    };
    onUpdateSlides([...slides, newSlide]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">簡報翻頁時間戳管理</h2>
              <p className="text-xs text-slate-400">設定每一頁投影片在音訊播放到何時自動切換</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-850 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            當前播放時間：<span className="font-mono font-bold text-blue-400">{formatTime(currentTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDistributeEvenly}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 hover:border-blue-500/50 transition-colors"
              title="將第 1 頁設為最前面 (00:00)，最後一頁涵蓋至片尾，所有頁面依影片長度平均展開"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              平均展開全片時長
            </button>
            <button
              onClick={handleSortByTime}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> 按時間重新排序
            </button>
            <button
              onClick={handleAddSlide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 新增投影片頁
            </button>
          </div>
        </div>

        {/* Slide List */}
        <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {slides.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Presentation className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>目前尚無簡報投影片資料</p>
            </div>
          ) : (
            slides.map((slide, index) => (
              <div
                key={slide.id}
                className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                {/* Page Number & Thumbnail Preview */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-700/80 flex items-center justify-center font-bold text-xs text-slate-300">
                    {slide.pageNumber}
                  </span>
                  {slide.imageUrl ? (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-16 h-10 object-cover rounded border border-slate-600 bg-slate-900 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onSeek(slide.timestamp)}
                    />
                  ) : (
                    <div className="w-16 h-10 rounded border border-dashed border-slate-700 bg-slate-900/50 flex items-center justify-center text-[10px] text-slate-500">
                      無預覽
                    </div>
                  )}
                </div>

                {/* Title Input */}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => handleTitleChange(slide.id, e.target.value)}
                    placeholder={`第 ${slide.pageNumber} 頁標題`}
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Timestamp & Sync Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <input
                      key={`${slide.id}_${slide.timestamp}`}
                      type="text"
                      defaultValue={formatTime(slide.timestamp)}
                      onBlur={(e) => handleTimeChange(slide.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTimeChange(slide.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                      className="w-20 font-mono text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center text-blue-400 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    title="設為當前播放時間"
                    onClick={() => handleSetCurrentTime(slide.id)}
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title="刪除此頁"
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            完成並返回
          </button>
        </div>
      </div>
    </div>
  );
};
