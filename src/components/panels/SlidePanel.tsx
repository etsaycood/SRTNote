import React, { useState } from 'react';
import { SlideItem } from '../../types';
import { formatTime } from '../../utils/timeFormatter';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  Minimize2,
  X,
  Upload,
  CalendarCheck,
  Edit3,
  GripVertical,
  Loader2,
  FileText,
  Link2,
  Unlink
} from 'lucide-react';

interface SlidePanelProps {
  slides: SlideItem[];
  currentSlideIndex: number;
  currentTime: number;
  onSelectSlide: (index: number) => void;
  onSyncCurrentTime: () => void;
  onOpenTimelineModal: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose?: () => void;
  onUploadSlides: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isConvertingPdf?: boolean;
  pdfProgress?: string;
  onDropFiles?: (files: FileList) => void;
  isSlideSyncEnabled?: boolean;
  onToggleSlideSync?: () => void;
  currentMediaId?: string;
}

export const SlidePanel: React.FC<SlidePanelProps> = ({
  slides,
  currentSlideIndex,
  currentTime,
  onSelectSlide,
  onSyncCurrentTime,
  onOpenTimelineModal,
  isMaximized,
  onToggleMaximize,
  onClose,
  onUploadSlides,
  isConvertingPdf = false,
  pdfProgress = '',
  onDropFiles,
  isSlideSyncEnabled = true,
  onToggleSlideSync,
  currentMediaId
}) => {
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const currentSlide = slides[currentSlideIndex] || slides[0];
  const hasSlides = slides && slides.length > 0;

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      onSelectSlide(currentSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      onSelectSlide(currentSlideIndex + 1);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg">
      {/* Top Header Badge & Controls (Grouped together next to title) */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-md">
          <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
            <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </span>
          <Presentation className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold tracking-wider text-slate-200">
            同步簡報
          </span>
          {hasSlides && (
            <span className="text-[11px] font-mono text-blue-300/80 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/40">
              {currentSlideIndex + 1} / {slides.length}
            </span>
          )}
        </div>

        {/* Panel Action Buttons: Positioned directly next to title */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md">
          <button
            onClick={onOpenTimelineModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-300 hover:text-white hover:bg-blue-600/30 transition-colors"
            title="調整每頁翻頁時間軸"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>時間軸</span>
          </button>
          <label className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors" title="上傳簡報或圖片">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={onUploadSlides} className="hidden" />
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

      {/* Main Slide Viewer */}
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverFile(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverFile(false);
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes('Files') && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOverFile(false);
            onDropFiles?.(e.dataTransfer.files);
          }
        }}
        className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 p-4 overflow-hidden select-none"
      >
        {/* Drag-over overlay */}
        {isDragOverFile && (
          <div className="absolute inset-0 z-40 bg-blue-600/30 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-fade-in">
            <Upload className="w-10 h-10 text-blue-300 animate-bounce mb-2" />
            <span className="text-white font-bold text-sm">放開滑鼠以載入 PDF 簡報或圖片投影片</span>
          </div>
        )}

        {isConvertingPdf ? (
          /* PDF Parsing / Conversion in progress */
          <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h4 className="font-bold text-white text-sm mb-1">正在解析 PDF 簡報</h4>
            <p className="text-xs text-blue-300 font-mono mb-3">{pdfProgress || '正在逐頁轉為高解析投影片...'}</p>
            <div className="w-52 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse w-full"></div>
            </div>
          </div>
        ) : hasSlides && currentSlide ? (
          <div className="relative w-full h-full max-w-4xl flex flex-col items-center justify-center">
            {currentSlide.imageUrl ? (
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title || `Slide ${currentSlide.pageNumber}`}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            ) : (
              /* Fallback slide layout */
              <div className="w-full h-full max-h-[380px] bg-slate-900 border border-slate-700/80 rounded-2xl p-8 flex flex-col justify-between shadow-2xl">
                <div>
                  <span className="text-xs uppercase font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800/40">
                    Slide {currentSlide.pageNumber}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-4">{currentSlide.title}</h3>
                  <p className="text-sm text-slate-400 mt-2">{currentSlide.notes || '暫無額外備註'}</p>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-800 pt-3">
                  <span>設定觸發時間：{formatTime(currentSlide.timestamp)}</span>
                  <span>SyncNote Studio</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty slides state */
          <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-blue-400">
              <Presentation className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-slate-200 mb-1">
              {currentMediaId ? `尚未為影片 (${currentMediaId}) 上傳簡報` : '未載入簡報'}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              支援上傳 <strong>PDF 簡報檔案</strong> 或投影片圖片，系統將在播放到指定時間自動翻頁同步。
            </p>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-blue-600/20 transition-all">
              <Upload className="w-3.5 h-3.5" /> 選擇 PDF 簡報或圖片
              <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={onUploadSlides} className="hidden" />
            </label>
          </div>
        )}

        {/* Floating Quick Navigation & Timestamp Controller (Option B) */}
        {hasSlides && (
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-2xl transition-all duration-300 ${
              !isSlideSyncEnabled
                ? 'opacity-100 ring-1 ring-amber-500/40'
                : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="上一頁"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-slate-300 font-semibold px-2">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="下一頁"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-3.5 bg-slate-700 mx-1"></div>

            {/* Option B: Pause Slide Sync Toggle Button */}
            {onToggleSlideSync && (
              <button
                type="button"
                onClick={onToggleSlideSync}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  isSlideSyncEnabled
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                }`}
                title={isSlideSyncEnabled ? '簡報隨影音時間自動同步中，點擊可暫停同步' : '簡報已暫停同步，點擊恢復隨影音時間自動翻頁'}
              >
                {isSlideSyncEnabled ? (
                  <>
                    <Link2 className="w-3 h-3 text-emerald-400" />
                    <span>同步中</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-3 h-3 text-amber-400" />
                    <span>暫停同步</span>
                  </>
                )}
              </button>
            )}

            <div className="w-px h-3.5 bg-slate-700 mx-1"></div>

            <button
              onClick={onSyncCurrentTime}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-[11px] font-medium transition-colors"
              title="將當前播放秒數設定為此頁簡報的起始時間點"
            >
              <CalendarCheck className="w-3 h-3 text-blue-400" />
              <span>設為 {formatTime(currentTime)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
