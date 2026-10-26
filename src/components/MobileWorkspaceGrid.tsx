import React, { useState, useRef, useEffect } from 'react';
import { PanelId } from '../types';
import {
  Video,
  Presentation,
  FileText,
  Sparkles,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MobileWorkspaceGridProps {
  openPanels: PanelId[];
  activeMaximizedPanel: PanelId | null;
  renderPanel: (panelId: PanelId) => React.ReactNode;
  onToggleMaximize?: (panelId: PanelId) => void;
  onClosePanel?: (panelId: PanelId) => void;
  onReopenPanel?: (panelId: PanelId) => void;
  onResetLayout?: () => void;
}

const PANEL_META: Record<PanelId, { name: string; icon: React.FC<{ className?: string }> }> = {
  video: { name: '影音視窗', icon: Video },
  slides: { name: '同步簡報', icon: Presentation },
  transcript: { name: '即時逐字稿', icon: FileText },
  summary: { name: '重點整理', icon: Sparkles }
};

interface SwipeablePaneProps {
  paneTitle: string;
  panels: PanelId[];
  availableSiblingPanels: PanelId[];
  renderPanel: (panelId: PanelId) => React.ReactNode;
  onReopenPanel?: (panelId: PanelId) => void;
  accentColor: 'blue' | 'purple';
}

const SwipeablePane: React.FC<SwipeablePaneProps> = ({
  paneTitle,
  panels,
  availableSiblingPanels,
  renderPanel,
  onReopenPanel,
  accentColor
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scroll position when activeIndex changes or on mount
  useEffect(() => {
    if (activeIndex >= panels.length) {
      setActiveIndex(Math.max(0, panels.length - 1));
    }
  }, [panels.length, activeIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.clientWidth > 0) {
      const newIdx = Math.round(el.scrollLeft / el.clientWidth);
      if (newIdx !== activeIndex && newIdx >= 0 && newIdx < panels.length) {
        setActiveIndex(newIdx);
      }
    }
  };

  const scrollToIndex = (idx: number) => {
    if (!containerRef.current) return;
    const targetLeft = idx * containerRef.current.clientWidth;
    containerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
    setActiveIndex(idx);
  };

  const handleNext = () => {
    if (activeIndex < panels.length - 1) {
      scrollToIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  };

  // If no panels in this pane
  if (panels.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-center">
        <p className="text-xs text-slate-400 mb-3">{paneTitle}目前無開啟視窗</p>
        <div className="flex items-center gap-2">
          {availableSiblingPanels.map((id) => {
            const meta = PANEL_META[id];
            const Icon = meta.icon;
            return (
              <button
                key={id}
                onClick={() => onReopenPanel?.(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <Icon className="w-3.5 h-3.5" />
                <span>開啟{meta.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const activeColorClasses =
    accentColor === 'blue'
      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
      : 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold';

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 overflow-hidden group/pane">
      {/* Pane Top Bar: Tabs & Quick Switcher when multiple panels, or Add Sibling button */}
      <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 z-30 select-none">
        {/* Left: Window Tabs / Indicators */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {panels.length > 1 ? (
            panels.map((panelId, idx) => {
              const meta = PANEL_META[panelId];
              const Icon = meta.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={panelId}
                  onClick={() => scrollToIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all active:scale-95 ${
                    isActive
                      ? activeColorClasses
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.name}</span>
                </button>
              );
            })
          ) : (
            // Only 1 panel open, show subtle label
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900/80 text-slate-300 border border-slate-800/80">
              {React.createElement(PANEL_META[panels[0]].icon, { className: 'w-3.5 h-3.5 text-blue-400' })}
              <span className="font-medium">{PANEL_META[panels[0]].name}</span>
            </div>
          )}
        </div>

        {/* Right: Sibling Window Add Button & Swipe Indicator */}
        <div className="flex items-center gap-1.5">
          {panels.length > 1 && (
            <div className="flex items-center gap-1 text-slate-400 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-800 text-[11px] font-mono">
              <button
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className="hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                title="滑至前一個視窗"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span>
                {activeIndex + 1}/{panels.length}
              </span>
              <button
                onClick={handleNext}
                disabled={activeIndex === panels.length - 1}
                className="hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                title="滑至後一個視窗"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick add unopen sibling panel button */}
          {availableSiblingPanels
            .filter((id) => !panels.includes(id))
            .map((id) => {
              const meta = PANEL_META[id];
              return (
                <button
                  key={id}
                  onClick={() => onReopenPanel?.(id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                  title={`加入${meta.name}至此窗格 (可左右滑動)`}
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>{meta.name}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Swipeable Carousel Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full min-h-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {panels.map((panelId) => (
          <div
            key={panelId}
            className="w-full h-full flex-shrink-0 snap-center min-w-full overflow-hidden p-0.5"
          >
            {renderPanel(panelId)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MobileWorkspaceGrid: React.FC<MobileWorkspaceGridProps> = ({
  openPanels,
  activeMaximizedPanel,
  renderPanel,
  onReopenPanel,
  onResetLayout
}) => {
  // Height ratio between top and bottom pane (percentage: 20% to 80%, default 45%)
  const [topHeightPercent, setTopHeightPercent] = useState(44);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. If any panel is maximized, render that panel in 100% full screen
  if (activeMaximizedPanel && openPanels.includes(activeMaximizedPanel)) {
    return (
      <div className="w-full h-full p-2 select-none overflow-hidden">
        {renderPanel(activeMaximizedPanel)}
      </div>
    );
  }

  // 2. Partition open panels into Top Pane (Visual/Media) and Bottom Pane (Text/Notes)
  // Top defaults to 'video' and 'slides'
  const topPanels = openPanels.filter((id) => id === 'video' || id === 'slides');
  // Bottom defaults to 'transcript' and 'summary'
  const bottomPanels = openPanels.filter((id) => id === 'transcript' || id === 'summary');

  // If no panels are open anywhere
  if (openPanels.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center mb-4 text-blue-400">
          <RotateCcw className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-2">所有視窗已關閉</h3>
        <p className="text-xs text-slate-400 mb-5 max-w-xs leading-relaxed">
          您可以點擊下方按鈕恢復預設手機雙窗格佈局（上窗格影音視窗、下窗格即時逐字稿）。
        </p>
        <button
          onClick={onResetLayout}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>恢復手機雙窗格配置</span>
        </button>
      </div>
    );
  }

  // If only top pane has panels (bottom is empty)
  if (topPanels.length > 0 && bottomPanels.length === 0) {
    return (
      <div className="w-full h-full p-1.5 flex flex-col select-none overflow-hidden">
        <SwipeablePane
          paneTitle="上窗格"
          panels={topPanels}
          availableSiblingPanels={['video', 'slides']}
          renderPanel={renderPanel}
          onReopenPanel={onReopenPanel}
          accentColor="blue"
        />
      </div>
    );
  }

  // If only bottom pane has panels (top is empty)
  if (bottomPanels.length > 0 && topPanels.length === 0) {
    return (
      <div className="w-full h-full p-1.5 flex flex-col select-none overflow-hidden">
        <SwipeablePane
          paneTitle="下窗格"
          panels={bottomPanels}
          availableSiblingPanels={['transcript', 'summary']}
          renderPanel={renderPanel}
          onReopenPanel={onReopenPanel}
          accentColor="purple"
        />
      </div>
    );
  }

  // --- Resizing Handlers between Top and Bottom Panes ---
  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const initialHeight = topHeightPercent;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const onMove = (moveY: number) => {
      const deltaY = moveY - startY;
      const deltaPercent = (deltaY / containerHeight) * 100;
      setTopHeightPercent(Math.min(75, Math.max(25, initialHeight + deltaPercent)));
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      onMove(moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        onMove(moveEvent.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // Standard: Top and Bottom Panes (直立雙窗格，各顯示一個視窗，可左右滑動)
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col p-1.5 select-none overflow-hidden"
    >
      {/* 1. Top Pane (上窗格: 影音視窗 / 同步簡報) */}
      <div
        className="w-full min-h-[140px] overflow-hidden flex flex-col"
        style={{ height: `${topHeightPercent}%` }}
      >
        <SwipeablePane
          paneTitle="上窗格"
          panels={topPanels}
          availableSiblingPanels={['video', 'slides']}
          renderPanel={renderPanel}
          onReopenPanel={onReopenPanel}
          accentColor="blue"
        />
      </div>

      {/* 2. Resizable Divider between Top and Bottom Panes */}
      <div
        onMouseDown={handleStartResize}
        onTouchStart={handleStartResize}
        className="w-full h-3 flex items-center justify-center cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/40 rounded-full my-0.5 transition-colors group z-40 touch-none"
        title="拖曳調整上下窗格比例"
      >
        <div className="h-1 w-14 rounded-full bg-slate-700 group-hover:bg-blue-400 group-active:bg-blue-400 transition-colors" />
      </div>

      {/* 3. Bottom Pane (下窗格: 即時逐字稿 / 重點整理) */}
      <div
        className="w-full min-h-[140px] flex-1 overflow-hidden flex flex-col"
        style={{ height: `${100 - topHeightPercent}%` }}
      >
        <SwipeablePane
          paneTitle="下窗格"
          panels={bottomPanels}
          availableSiblingPanels={['transcript', 'summary']}
          renderPanel={renderPanel}
          onReopenPanel={onReopenPanel}
          accentColor="purple"
        />
      </div>
    </div>
  );
};
