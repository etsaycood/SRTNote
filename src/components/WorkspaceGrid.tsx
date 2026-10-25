import React, { useState, useRef } from 'react';
import { PanelId } from '../types';
import { Move, Video, Presentation, FileText, Sparkles, Plus, RotateCcw } from 'lucide-react';

interface WorkspaceGridProps {
  openPanels: PanelId[];
  activeMaximizedPanel: PanelId | null;
  onSwapPanels: (idA: PanelId, idB: PanelId) => void;
  renderPanel: (panelId: PanelId) => React.ReactNode;
  onReopenPanel?: (panelId: PanelId) => void;
  onResetLayout?: () => void;
}

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  openPanels,
  activeMaximizedPanel,
  onSwapPanels,
  renderPanel,
  onReopenPanel,
  onResetLayout
}) => {
  // Split ratio states (percentages: 0 to 100)
  const [topHeightPercent, setTopHeightPercent] = useState(48);
  const [topLeftWidthPercent, setTopLeftWidthPercent] = useState(50);
  const [bottomLeftWidthPercent, setBottomLeftWidthPercent] = useState(50);
  const [twoColWidthPercent, setTwoColWidthPercent] = useState(50);
  const [threeColSplitPercent, setThreeColSplitPercent] = useState(50);
  const [threeRowSplitPercent, setThreeRowSplitPercent] = useState(50);

  // Drag and drop states
  const [draggingPanelId, setDraggingPanelId] = useState<PanelId | null>(null);
  const [dragOverPanelId, setDragOverPanelId] = useState<PanelId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Resizing Handlers ---
  const startResizeTopBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const initialHeight = topHeightPercent;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = (deltaY / containerHeight) * 100;
      setTopHeightPercent(Math.min(80, Math.max(20, initialHeight + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizeTopLeftRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = topLeftWidthPercent;
    const containerWidth = containerRef.current?.clientWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      setTopLeftWidthPercent(Math.min(80, Math.max(20, initialWidth + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizeBottomLeftRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = bottomLeftWidthPercent;
    const containerWidth = containerRef.current?.clientWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      setBottomLeftWidthPercent(Math.min(80, Math.max(20, initialWidth + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizeTwoCol = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = twoColWidthPercent;
    const containerWidth = containerRef.current?.clientWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      setTwoColWidthPercent(Math.min(80, Math.max(20, initialWidth + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizeThreeCol = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = threeColSplitPercent;
    const containerWidth = containerRef.current?.clientWidth || 1000;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      setThreeColSplitPercent(Math.min(80, Math.max(20, initialWidth + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startResizeThreeRow = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const initialHeight = threeRowSplitPercent;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaPercent = (deltaY / containerHeight) * 100;
      setThreeRowSplitPercent(Math.min(80, Math.max(20, initialHeight + deltaPercent)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, panelId: PanelId) => {
    const target = e.target as HTMLElement;
    // If dragging starts from an interactive control or content element, prevent drag
    if (target.closest('input, textarea, select, button, .timestamp-badge, pre, code, p')) {
      e.preventDefault();
      return;
    }
    // Only allow dragging from the grip handle or header bar
    const isGrip = !!target.closest('[title*="拖曳"], [data-drag-handle="true"]');
    const isHeader = !!target.closest('.border-b, .backdrop-blur-md, header');
    if (!isGrip && !isHeader) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', panelId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingPanelId(panelId);
  };

  const handleDragOver = (e: React.DragEvent, targetPanelId: PanelId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPanelId !== targetPanelId) {
      setDragOverPanelId(targetPanelId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetPanelId: PanelId) => {
    if (dragOverPanelId === targetPanelId) {
      setDragOverPanelId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPanelId: PanelId) => {
    e.preventDefault();
    const sourceId = (e.dataTransfer.getData('text/plain') as PanelId) || draggingPanelId;
    if (sourceId && targetPanelId && sourceId !== targetPanelId) {
      onSwapPanels(sourceId, targetPanelId);
    }
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  };

  const handleDragEnd = () => {
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  };

  // Wrapper for rendering each draggable slot
  const renderSlot = (panelId: PanelId, className: string = '', style?: React.CSSProperties) => {
    const isDragging = draggingPanelId === panelId;
    const isTarget = dragOverPanelId === panelId && draggingPanelId !== panelId;

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, panelId)}
        onDragOver={(e) => handleDragOver(e, panelId)}
        onDragLeave={(e) => handleDragLeave(e, panelId)}
        onDrop={(e) => handleDrop(e, panelId)}
        onDragEnd={handleDragEnd}
        className={`relative h-full transition-all overflow-hidden ${className} ${
          isDragging ? 'opacity-40 scale-[0.99]' : ''
        } ${
          isTarget ? 'ring-2 ring-blue-500 rounded-2xl bg-blue-500/10' : ''
        }`}
        style={style}
      >
        {renderPanel(panelId)}
        {isTarget && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-blue-600/20 backdrop-blur-[2px] rounded-2xl border-2 border-dashed border-blue-400">
            <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-bounce">
              <Move className="w-4 h-4" />
              <span>釋放以調換至此位置</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. If a single panel is maximized, render only that panel full screen
  if (activeMaximizedPanel) {
    return (
      <div className="w-full h-full p-2 animate-scale-in">
        {renderPanel(activeMaximizedPanel)}
      </div>
    );
  }

  // 2. Empty State: No panels are currently open
  if (!openPanels || openPanels.length === 0) {
    const allDefs: { id: PanelId; title: string; icon: any; color: string }[] = [
      { id: 'video', title: '影音視窗 (Video)', icon: Video, color: 'text-blue-400 border-blue-500/30 hover:border-blue-500' },
      { id: 'slides', title: '同步簡報 (Slides)', icon: Presentation, color: 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500' },
      { id: 'transcript', title: '即時逐字稿 (Transcript)', icon: FileText, color: 'text-amber-400 border-amber-500/30 hover:border-amber-500' },
      { id: 'summary', title: 'AI 重點整理 (AI Summary)', icon: Sparkles, color: 'text-purple-400 border-purple-500/30 hover:border-purple-500' }
    ];

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950/60">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Plus className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">所有面板目前已關閉</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            您已關閉所有工作區面板。請點選下方卡片，或隨時由右上角「版面視窗」選單加回所需的面板：
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {allDefs.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => onReopenPanel?.(p.id)}
                  className={`p-3 rounded-2xl border bg-slate-800/80 hover:bg-slate-800 flex flex-col items-center justify-center gap-2 transition-all group ${p.color}`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="text-xs font-semibold text-slate-200">{p.title}</span>
                </button>
              );
            })}
          </div>

          {onResetLayout && (
            <button
              onClick={onResetLayout}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
            >
              <RotateCcw className="w-4 h-4" />
              <span>一鍵還原全部 4 個面板</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Exactly 1 Panel Open: Full screen
  if (openPanels.length === 1) {
    return (
      <div ref={containerRef} className="w-full h-full p-2 select-none overflow-hidden">
        {renderSlot(openPanels[0], 'w-full h-full')}
      </div>
    );
  }

  // 4. Exactly 2 Panels Open: 2-Column Split
  if (openPanels.length === 2) {
    const p0 = openPanels[0];
    const p1 = openPanels[1];

    return (
      <div ref={containerRef} className="relative w-full h-full flex p-2 select-none overflow-hidden">
        {/* Left Panel */}
        <div className="h-full pr-1 overflow-hidden" style={{ width: `${twoColWidthPercent}%` }}>
          {renderSlot(p0)}
        </div>

        {/* Resizer */}
        <div
          onMouseDown={startResizeTwoCol}
          className="w-2.5 h-full flex items-center justify-center cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full transition-colors group z-20"
          title="拖曳調整左右寬度比例"
        >
          <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Right Panel */}
        <div className="h-full pl-1 flex-1 overflow-hidden" style={{ width: `${100 - twoColWidthPercent}%` }}>
          {renderSlot(p1)}
        </div>
      </div>
    );
  }

  // 5. Exactly 3 Panels Open: Left Column 1 Panel, Right Column 2 Panels Stacked
  if (openPanels.length === 3) {
    const p0 = openPanels[0];
    const p1 = openPanels[1];
    const p2 = openPanels[2];

    return (
      <div ref={containerRef} className="relative w-full h-full flex p-2 select-none overflow-hidden">
        {/* Left Column (Single Large Panel) */}
        <div className="h-full pr-1 overflow-hidden" style={{ width: `${threeColSplitPercent}%` }}>
          {renderSlot(p0)}
        </div>

        {/* Vertical Resizer between Left & Right */}
        <div
          onMouseDown={startResizeThreeCol}
          className="w-2.5 h-full flex items-center justify-center cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full transition-colors group z-20"
          title="拖曳調整左右寬度比例"
        >
          <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Right Column (2 Panels Stacked) */}
        <div
          className="h-full pl-1 flex-1 flex flex-col overflow-hidden"
          style={{ width: `${100 - threeColSplitPercent}%` }}
        >
          {/* Right Top */}
          <div className="w-full pb-1 overflow-hidden" style={{ height: `${threeRowSplitPercent}%` }}>
            {renderSlot(p1)}
          </div>

          {/* Horizontal Resizer between Right Top & Bottom */}
          <div
            onMouseDown={startResizeThreeRow}
            className="w-full h-2.5 flex items-center justify-center cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full my-0.5 transition-colors group z-20"
            title="拖曳調整上下高度比例"
          >
            <div className="h-1 w-12 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
          </div>

          {/* Right Bottom */}
          <div className="w-full pt-1 flex-1 overflow-hidden" style={{ height: `${100 - threeRowSplitPercent}%` }}>
            {renderSlot(p2)}
          </div>
        </div>
      </div>
    );
  }

  // 6. Default: All 4 Panels Open (2x2 Grid)
  const p0 = openPanels[0] || 'video';
  const p1 = openPanels[1] || 'slides';
  const p2 = openPanels[2] || 'transcript';
  const p3 = openPanels[3] || 'summary';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col p-2 select-none overflow-hidden"
    >
      {/* Top Half Row */}
      <div
        className="w-full flex min-h-[160px] overflow-hidden"
        style={{ height: `${topHeightPercent}%` }}
      >
        {/* Top Left Panel */}
        <div
          className="h-full pr-1 overflow-hidden"
          style={{ width: `${topLeftWidthPercent}%` }}
        >
          {renderSlot(p0)}
        </div>

        {/* Vertical Resizer between Top Left & Top Right */}
        <div
          onMouseDown={startResizeTopLeftRight}
          className="w-2.5 h-full flex items-center justify-center cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full transition-colors group z-20"
          title="拖曳調整左右寬度比例"
        >
          <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Top Right Panel */}
        <div
          className="h-full pl-1 flex-1 overflow-hidden"
          style={{ width: `${100 - topLeftWidthPercent}%` }}
        >
          {renderSlot(p1)}
        </div>
      </div>

      {/* Horizontal Resizer between Top Row & Bottom Row */}
      <div
        onMouseDown={startResizeTopBottom}
        className="w-full h-2.5 flex items-center justify-center cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full my-0.5 transition-colors group z-20"
        title="拖曳調整上下高度比例"
      >
        <div className="h-1 w-16 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
      </div>

      {/* Bottom Half Row */}
      <div
        className="w-full flex min-h-[160px] flex-1 overflow-hidden"
        style={{ height: `${100 - topHeightPercent}%` }}
      >
        {/* Bottom Left Panel */}
        <div
          className="h-full pr-1 overflow-hidden"
          style={{ width: `${bottomLeftWidthPercent}%` }}
        >
          {renderSlot(p2)}
        </div>

        {/* Vertical Resizer between Bottom Left & Bottom Right */}
        <div
          onMouseDown={startResizeBottomLeftRight}
          className="w-2.5 h-full flex items-center justify-center cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full transition-colors group z-20"
          title="拖曳調整逐字稿與重點筆記寬度比例"
        >
          <div className="w-1 h-8 rounded-full bg-slate-700 group-hover:bg-blue-400 transition-colors" />
        </div>

        {/* Bottom Right Panel */}
        <div
          className="h-full pl-1 flex-1 overflow-hidden"
          style={{ width: `${100 - bottomLeftWidthPercent}%` }}
        >
          {renderSlot(p3)}
        </div>
      </div>
    </div>
  );
};

