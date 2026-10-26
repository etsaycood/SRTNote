import React, { useState, useEffect, useMemo } from 'react';
import {
  extractYouTubeId,
  extractMultipleYouTubeVideos,
  getStoredYouTubeLibrary,
  saveMultipleYouTubeToLibrary,
  removeYouTubeFromLibrary,
  clearYouTubeLibrary,
  saveCustomLibraryOrder
} from '../utils/youtubeHelper';
import { YouTubeHistoryItem, SubtitleItem, SlideItem } from '../types';
import { YoutubeIcon } from './icons/YoutubeIcon';
import {
  X,
  Play,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ListVideo,
  Search,
  CheckSquare,
  Square,
  FileText,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Presentation
} from 'lucide-react';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadYouTube: (url: string, videoId: string) => void;
  currentVideoId?: string;
  playlistQueue?: string[];
  onStartPlaylist?: (videoIds: string[]) => void;
  subtitlesByMedia?: Record<string, SubtitleItem[]>;
  slidesByMedia?: Record<string, SlideItem[]>;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({
  isOpen,
  onClose,
  onLoadYouTube,
  currentVideoId,
  playlistQueue = [],
  onStartPlaylist,
  subtitlesByMedia = {},
  slidesByMedia = {}
}) => {
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [library, setLibrary] = useState<YouTubeHistoryItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drag and Drop state (Method B)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Reload stored library whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLibrary(getStoredYouTubeLibrary());
      setErrorMsg('');
      setInputText('');
      setSearchFilter('');
      // Initialize selected with current playlist queue if available
      if (playlistQueue && playlistQueue.length > 0) {
        setSelectedIds(new Set(playlistQueue));
      } else {
        setSelectedIds(new Set());
      }
    }
  }, [isOpen, playlistQueue]);

  // Parse all valid YouTube links from input text
  const detectedVideos = useMemo(() => {
    return extractMultipleYouTubeVideos(inputText);
  }, [inputText]);

  if (!isOpen) return null;

  // Handler: Load first video & save all entered links to library
  const handleLoadAndSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (detectedVideos.length === 0) {
      setErrorMsg('未辨識到有效的 YouTube 連結，請確認格式（如 https://www.youtube.com/watch?v=... 或 11 字元 ID）');
      return;
    }

    // Save all to localStorage library
    const updated = saveMultipleYouTubeToLibrary(detectedVideos);
    setLibrary(updated);

    // If multiple videos were pasted, automatically select them for playlist
    if (detectedVideos.length > 1 && onStartPlaylist) {
      const ids = detectedVideos.map((v) => v.videoId);
      onStartPlaylist(ids);
      setInputText('');
      onClose();
      return;
    }

    // Load first video into workspace
    const first = detectedVideos[0];
    onLoadYouTube(first.url, first.videoId);
    setInputText('');
    onClose();
  };

  // Handler: Add to library only (without loading)
  const handleAddOnly = () => {
    if (detectedVideos.length === 0) {
      setErrorMsg('請先輸入至少一個有效的 YouTube 連結');
      return;
    }

    const updated = saveMultipleYouTubeToLibrary(detectedVideos);
    setLibrary(updated);
    setInputText('');
    setErrorMsg('');
  };

  // Handler: Play a specific single video from library
  const handlePlayFromLibrary = (item: YouTubeHistoryItem) => {
    onLoadYouTube(item.url, item.id);
    onClose();
  };

  // Handler: Remove a single video from library
  const handleRemoveItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeYouTubeFromLibrary(id);
    setLibrary(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Handler: Clear all library items
  const handleClearAll = () => {
    if (window.confirm('確定要清空所有已存的 YouTube 影片紀錄嗎？')) {
      clearYouTubeLibrary();
      setLibrary([]);
      setSelectedIds(new Set());
    }
  };

  // Toggle selection for playlist
  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    if (selectedIds.size === library.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(library.map((x) => x.id)));
    }
  };

  // Start playlist rotation with selected videos
  const handleStartSelectedPlaylist = () => {
    if (selectedIds.size === 0) return;
    const ids = library.filter((item) => selectedIds.has(item.id)).map((item) => item.id);
    if (onStartPlaylist) {
      onStartPlaylist(ids);
    }
    onClose();
  };

  // --- 方式 A：按鈕上移 / 下移 (Button Move Up / Down) ---
  const handleMoveItem = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= library.length) return;

    const nextList = [...library];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);

    setLibrary(nextList);
    saveCustomLibraryOrder(nextList);
  };

  // --- 方式 B：滑鼠/觸控拖曳排序 (Drag and Drop) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const nextList = [...library];
    const [draggedItem] = nextList.splice(draggedIndex, 1);
    nextList.splice(dropIndex, 0, draggedItem);

    setLibrary(nextList);
    saveCustomLibraryOrder(nextList);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Filter library by search query (if actively filtering, disable drag-and-drop to prevent index mismatch)
  const isFiltering = searchFilter.trim().length > 0;
  const filteredLibrary = library.filter((item) => {
    if (!isFiltering) return true;
    const q = searchFilter.toLowerCase();
    return item.id.toLowerCase().includes(q) || (item.title && item.title.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">YouTube 影片庫與多連結管理</h3>
              <p className="text-[11px] text-slate-400">支援批次輸入、輪播排序（▲▼按鈕或拖曳把手），紀錄儲存於瀏覽器</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Upper Section: Input Form (Single or Multi-line batch paste) */}
          <form onSubmit={handleLoadAndSave} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  貼上 YouTube 網址（支援多行批次輸入）
                </label>
                {detectedVideos.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                    已辨識 {detectedVideos.length} 部影片
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                autoFocus
                placeholder="例如:&#10;https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;https://youtu.be/kJQP7kiw5Fk&#10;(可一次貼上多行網址或 11 碼 ID)"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono transition-colors leading-relaxed"
              />
            </div>

            {/* Validation / Detection Preview */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {detectedVideos.length > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-red-950/25 border border-red-500/30 rounded-xl text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium truncate">
                      {detectedVideos.length === 1
                        ? `即將載入: ${detectedVideos[0].videoId}`
                        : `共辨識出 ${detectedVideos.length} 部影片，首部為: ${detectedVideos[0].videoId}`}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {detectedVideos.length > 1
                        ? '按「立即載入播放」將自動建立多影片輪播佇列並存入清單'
                        : '影片將自動加入下方瀏覽器歷史清單'}
                    </p>
                  </div>
                </div>
                <img
                  src={`https://img.youtube.com/vi/${detectedVideos[0].videoId}/mqdefault.jpg`}
                  alt="thumbnail"
                  className="w-16 h-9 object-cover rounded-md border border-slate-700/80 flex-shrink-0 ml-2"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddOnly}
                disabled={detectedVideos.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white border border-slate-700 transition-colors"
                title="僅加入下方清單，不更換目前正在播放的影片"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>僅加入清單</span>
              </button>
              <button
                type="submit"
                disabled={detectedVideos.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95"
                title={
                  detectedVideos.length > 1
                    ? '載入首部並開始輪播所有輸入影片'
                    : '載入影片至工作台，並將連結儲存至清單'
                }
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{detectedVideos.length > 1 ? '載入並開始輪播' : '立即載入播放'}</span>
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="h-px bg-slate-800 my-2" />

          {/* Lower Section: Stored YouTube Library / Browser History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ListVideo className="w-4 h-4 text-red-400" />
                <span>已存影片紀錄</span>
                <span className="text-[10px] text-slate-500 font-mono">({library.length})</span>

                {/* Batch Selection Controls */}
                {library.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="ml-2 text-[11px] text-blue-400 hover:text-blue-300 font-normal transition-colors"
                  >
                    {selectedIds.size === library.length ? '取消全選' : '全選'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  (可拖曳把手或按 ▲▼ 調整順序)
                </span>
                {library.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                    title="清空瀏覽器中的所有 YouTube 影片紀錄"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空紀錄</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Search if library has items */}
            {library.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="搜尋已存影片 ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700"
                />
              </div>
            )}

            {/* Video Cards List */}
            {library.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                尚未儲存任何 YouTube 影片紀錄。上方貼上網址即可自動記錄於瀏覽器！
              </div>
            ) : filteredLibrary.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">查無符合搜尋條件的影片</div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                {filteredLibrary.map((item, index) => {
                  const isCurrent = currentVideoId === item.id;
                  const isSelected = selectedIds.has(item.id);
                  const hasSrt = subtitlesByMedia[item.id] && subtitlesByMedia[item.id].length > 0;
                  const hasSlides = slidesByMedia[item.id] && slidesByMedia[item.id].length > 0;
                  const queueIndex = playlistQueue.indexOf(item.id);
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={item.id}
                      draggable={!isFiltering}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handlePlayFromLibrary(item)}
                      className={`group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        isDragging
                          ? 'opacity-40 scale-98 border-dashed border-blue-500'
                          : isDragOver
                          ? 'border-blue-400 bg-blue-950/40 ring-1 ring-blue-400'
                          : isCurrent
                          ? 'bg-red-950/30 border-red-500/50 ring-1 ring-red-500/30'
                          : isSelected
                          ? 'bg-blue-950/25 border-blue-600/40'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80'
                      }`}
                    >
                      {/* Left: Drag Handle (方式 B) + Checkbox + Thumbnail + Details */}
                      <div className="flex items-center gap-2 min-w-0">
                        {/* 方式 B：拖曳排序把手 (Drag handle) */}
                        {!isFiltering && (
                          <div
                            className="p-1 -ml-1 text-slate-600 group-hover:text-slate-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
                            title="按住上下拖曳調整順序 (方式 B)"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Checkbox for playlist rotation */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelect(e, item.id)}
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
                          title={isSelected ? '取消勾選' : '勾選此部加入輪播清單'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400 fill-blue-950/50" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        {/* Thumbnail */}
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/60 flex-shrink-0">
                          <img
                            src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`}
                            alt="thumb"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white/90 fill-current opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                              {item.id}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800/60">
                                播放中
                              </span>
                            )}
                            {queueIndex !== -1 && (
                              <span className="text-[10px] font-mono text-blue-300 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/50">
                                輪播 #{queueIndex + 1}
                              </span>
                            )}
                            {hasSrt && (
                              <span
                                className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-800/40 flex items-center gap-0.5"
                                title="此影片已對應專屬 SRT 字幕"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                SRT ({subtitlesByMedia[item.id].length})
                              </span>
                            )}
                            {hasSlides && (
                              <span
                                className="text-[10px] font-semibold text-blue-400 bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-800/40 flex items-center gap-0.5"
                                title="此影片已對應專屬簡報投影片"
                              >
                                <Presentation className="w-2.5 h-2.5" />
                                簡報 ({slidesByMedia[item.id].length})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                            {item.url}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions (方式 A: 上移/下移按鈕 + 刪除按鈕) */}
                      <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                        {/* 方式 A：上移按鈕 */}
                        <button
                          type="button"
                          disabled={index === 0 || isFiltering}
                          onClick={(e) => handleMoveItem(e, index, 'up')}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          title="往上移 (方式 A)"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* 方式 A：下移按鈕 */}
                        <button
                          type="button"
                          disabled={index === library.length - 1 || isFiltering}
                          onClick={(e) => handleMoveItem(e, index, 'down')}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                          title="往下移 (方式 A)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* 刪除紀錄按鈕 */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveItem(e, item.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
                          title="從瀏覽器清單移除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={handleStartSelectedPlaylist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>輪播勾選影片 ({selectedIds.size} 部)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">
                勾選多部影片可直接進行輪播
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
