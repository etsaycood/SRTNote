import React, { useState, useRef, useEffect } from 'react';
import {
  PanelId,
  DockSlotId,
  DockLayoutConfig,
  DockLayoutPreset
} from '../types';
import {
  DOCK_SLOT_NAMES,
  DOCK_SLOT_ICONS,
  DOCK_LAYOUT_PRESETS,
  movePanelToSlot,
  removePanelFromLayout,
  reorderTabsInSlot,
  ALL_PANELS
} from '../utils/dockLayout';
import {
  Video,
  Presentation,
  FileText,
  Sparkles,
  Network,
  Maximize2,
  Minimize2,
  X,
  Plus,
  RotateCcw,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';
import { Language, t } from '../utils/i18n';

export interface WorkspaceGridProps {
  layout: DockLayoutConfig;
  onChangeLayout: (newLayout: DockLayoutConfig) => void;
  renderPanel: (panelId: PanelId) => React.ReactNode;
  activeMaximizedPanel: PanelId | null;
  onToggleMaximizePanel: (panelId: PanelId | null) => void;
  onResetLayout: () => void;
  onSelectPreset?: (preset: DockLayoutPreset) => void;
  openPanels?: PanelId[];
  onSwapPanels?: (idA: PanelId, idB: PanelId) => void;
  onReopenPanel?: (panelId: PanelId) => void;
  lang?: Language;
}

export const PANEL_META: Record<
  PanelId,
  {
    title: string;
    shortTitle: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeBg: string;
    borderActive: string;
  }
> = {
  video: {
    title: '影音畫面',
    shortTitle: '影音',
    icon: Video,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300',
    borderActive: 'border-b-blue-500 text-blue-400'
  },
  slides: {
    title: '同步簡報',
    shortTitle: '簡報',
    icon: Presentation,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300',
    borderActive: 'border-b-emerald-500 text-emerald-400'
  },
  transcript: {
    title: '即時逐字稿',
    shortTitle: '逐字稿',
    icon: FileText,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300',
    borderActive: 'border-b-amber-500 text-amber-400'
  },
  summary: {
    title: '重點整理',
    shortTitle: '重點整理',
    icon: Sparkles,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/60 text-purple-300',
    borderActive: 'border-b-purple-500 text-purple-400'
  },
  mindmap: {
    title: '互動心智圖',
    shortTitle: '心智圖',
    icon: Network,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/60 text-cyan-300',
    borderActive: 'border-b-cyan-500 text-cyan-400'
  }
};

export const getPanelMeta = (panelId: PanelId, lang: Language = 'zh') => {
  const meta = PANEL_META[panelId];
  if (!meta) {
    return {
      title: panelId,
      shortTitle: panelId,
      icon: Video,
      color: 'text-blue-400',
      badgeBg: 'bg-blue-950/60 text-blue-300',
      borderActive: 'border-b-blue-500 text-blue-400'
    };
  }
  const translatedTitle = t(`panel_${panelId}` as any, lang);
  const shortTitle = lang === 'en'
    ? (panelId === 'transcript' ? 'Transcript' : panelId === 'summary' ? 'Summary' : panelId === 'mindmap' ? 'MindMap' : panelId === 'video' ? 'Video' : 'Slides')
    : meta.shortTitle;
  return {
    ...meta,
    title: translatedTitle || meta.title,
    shortTitle
  };
};

export const getSlotName = (slotId: DockSlotId, lang: Language = 'zh') => {
  return t(`slot_${slotId}` as any, lang) || DOCK_SLOT_NAMES[slotId];
};

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  layout,
  onChangeLayout,
  renderPanel,
  activeMaximizedPanel,
  onToggleMaximizePanel,
  onResetLayout,
  onSelectPreset,
  lang = 'zh'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop states
  const [draggedPanel, setDraggedPanel] = useState<{ panelId: PanelId; fromSlot: DockSlotId } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<DockSlotId | null>(null);

  // Active dropdown menu for tab relocation
  const [openMoveMenu, setOpenMoveMenu] = useState<{ panelId: PanelId; slotId: DockSlotId } | null>(null);
  // Active dropdown menu for adding tab to a slot
  const [openAddMenuSlot, setOpenAddMenuSlot] = useState<DockSlotId | null>(null);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setOpenMoveMenu(null);
        setOpenAddMenuSlot(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Split Resize Handlers (Pointer Events: mouse, touch & pen) ---
  type SplitKey = keyof DockLayoutConfig['splitRatios'];
  // While dragging, ratios live in local state so only this grid re-renders;
  // the layout is committed once on release.
  const [draftRatios, setDraftRatios] = useState<DockLayoutConfig['splitRatios'] | null>(null);
  const [resizeAxis, setResizeAxis] = useState<'col' | 'row' | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const ratios = draftRatios ?? layout.splitRatios;

  const clampSplit = (v: number) => Math.round(Math.min(80, Math.max(20, v)));

  const commitRatios = (next: DockLayoutConfig['splitRatios']) => {
    onChangeLayout({ ...layoutRef.current, splitRatios: next });
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, key: SplitKey) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const isCol = key === 'colSplit';
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    handle.setPointerCapture(pointerId);

    const start = isCol ? e.clientX : e.clientY;
    const size = isCol ? container.clientWidth : container.clientHeight;
    const initial = layoutRef.current.splitRatios;
    let latest = initial;
    setResizeAxis(isCol ? 'col' : 'row');

    const onMove = (ev: PointerEvent) => {
      const delta = ((isCol ? ev.clientX : ev.clientY) - start) / size * 100;
      latest = { ...initial, [key]: clampSplit(initial[key] + delta) };
      setDraftRatios(latest);
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      setResizeAxis(null);
      setDraftRatios(null);
      if (latest !== initial) commitRatios(latest);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, key: SplitKey) => {
    const isCol = key === 'colSplit';
    const dec = isCol ? 'ArrowLeft' : 'ArrowUp';
    const inc = isCol ? 'ArrowRight' : 'ArrowDown';
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === dec) next = layout.splitRatios[key] - step;
    else if (e.key === inc) next = layout.splitRatios[key] + step;
    else if (e.key === 'Home') next = 20;
    else if (e.key === 'End') next = 80;
    if (next === null) return;
    e.preventDefault();
    commitRatios({ ...layout.splitRatios, [key]: clampSplit(next) });
  };

  const renderResizer = (key: SplitKey) => {
    const isCol = key === 'colSplit';
    const label = isCol
      ? (lang === 'en' ? 'Drag to resize column width' : '拖曳調整左右欄位寬度')
      : (lang === 'en' ? 'Drag to resize row height' : '拖曳調整上下窗格高度');
    return (
      <div
        role="separator"
        tabIndex={0}
        aria-orientation={isCol ? 'vertical' : 'horizontal'}
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={ratios[key]}
        aria-label={label}
        title={label}
        onPointerDown={(e) => handleResizeStart(e, key)}
        onKeyDown={(e) => handleResizeKeyDown(e, key)}
        className={`group/resizer flex-shrink-0 flex items-center justify-center z-20 touch-none transition-colors hover:bg-blue-500/20 active:bg-blue-500/40 focus-visible:outline-none focus-visible:bg-blue-500/30 ${
          isCol ? 'w-2 mx-0.5 h-full flex-col cursor-col-resize' : 'h-2 my-0.5 w-full cursor-row-resize'
        }`}
      >
        <div
          className={`rounded-full bg-slate-700/70 group-hover/resizer:bg-blue-400 group-focus-visible/resizer:bg-blue-400 transition-colors ${
            isCol ? 'h-12 w-1' : 'w-12 h-1'
          }`}
        />
      </div>
    );
  };

  // --- Tab & Slot Actions ---
  const handleSetActiveTab = (slotId: DockSlotId, tabId: PanelId) => {
    onChangeLayout({
      ...layout,
      slots: {
        ...layout.slots,
        [slotId]: {
          ...layout.slots[slotId],
          activeTab: tabId
        }
      }
    });
  };

  const handleCloseTab = (panelId: PanelId) => {
    const nextLayout = removePanelFromLayout(layout, panelId);
    onChangeLayout(nextLayout);
  };

  const handleMoveTab = (panelId: PanelId, targetSlot: DockSlotId) => {
    const nextLayout = movePanelToSlot(layout, panelId, targetSlot);
    onChangeLayout(nextLayout);
    setOpenMoveMenu(null);
  };

  const handleAddTabToSlot = (slotId: DockSlotId, panelId: PanelId) => {
    const nextLayout = movePanelToSlot(layout, panelId, slotId);
    onChangeLayout(nextLayout);
    setOpenAddMenuSlot(null);
  };

  // --- Drag and Drop Handlers ---
  const handleTabDragStart = (e: React.DragEvent, panelId: PanelId, slotId: DockSlotId) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ panelId, fromSlot: slotId }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPanel({ panelId, fromSlot: slotId });
  };

  const handleTabDragEnd = () => {
    setDraggedPanel(null);
    setDragOverSlot(null);
  };

  const handleSlotDragOver = (e: React.DragEvent, slotId: DockSlotId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotId) {
      setDragOverSlot(slotId);
    }
  };

  const handleSlotDragLeave = (e: React.DragEvent, slotId: DockSlotId) => {
    // dragleave also fires when moving onto a child element; ignore those
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    if (dragOverSlot === slotId) {
      setDragOverSlot(null);
    }
  };

  const handleSlotDrop = (e: React.DragEvent, targetSlotId: DockSlotId) => {
    e.preventDefault();
    setDragOverSlot(null);
    try {
      const data = e.dataTransfer.getData('text/plain');
      const payload = data ? JSON.parse(data) : draggedPanel;
      if (payload && payload.panelId) {
        const nextLayout = movePanelToSlot(layout, payload.panelId, targetSlotId);
        onChangeLayout(nextLayout);
      }
    } catch (err) {
      console.warn('Drag drop error:', err);
    }
    setDraggedPanel(null);
  };

  const handleTabDropReorder = (
    e: React.DragEvent,
    slotId: DockSlotId,
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    try {
      const data = e.dataTransfer.getData('text/plain');
      const payload = data ? JSON.parse(data) : draggedPanel;
      if (payload && payload.panelId) {
        if (payload.fromSlot === slotId) {
          const currentIndex = layout.slots[slotId].tabs.indexOf(payload.panelId);
          if (currentIndex !== -1 && currentIndex !== targetIndex) {
            const nextLayout = reorderTabsInSlot(layout, slotId, currentIndex, targetIndex);
            onChangeLayout(nextLayout);
          }
        } else {
          // Moved from another slot into this position
          const nextLayout = movePanelToSlot(layout, payload.panelId, slotId);
          onChangeLayout(nextLayout);
        }
      }
    } catch (err) {
      console.warn('Reorder drop error:', err);
    }
    setDraggedPanel(null);
  };

  // --- Render Single Dock Slot ---
  const renderDockSlot = (slotId: DockSlotId, heightStyle?: React.CSSProperties) => {
    const slot = layout.slots[slotId];
    const hasTabs = slot.tabs.length > 0;
    const isDragTarget = dragOverSlot === slotId;

    if (!hasTabs) {
      // If slot is empty but user is dragging, show a welcoming drop zone
      if (draggedPanel) {
        return (
          <div
            onDragOver={(e) => handleSlotDragOver(e, slotId)}
            onDragLeave={(e) => handleSlotDragLeave(e, slotId)}
            onDrop={(e) => handleSlotDrop(e, slotId)}
            className={`flex-1 min-h-[140px] m-1 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
              isDragTarget
                ? 'border-blue-400 bg-blue-500/20 text-blue-200 scale-[0.99]'
                : 'border-slate-800/80 bg-slate-950/40 text-slate-500'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center font-bold text-sm">
              {DOCK_SLOT_ICONS[slotId]}
            </div>
            <span className="text-xs font-medium">
              {lang === 'en' ? `Release to drop into [${getSlotName(slotId, lang)}]` : `釋放以放置於【${getSlotName(slotId, lang)}】`}
            </span>
          </div>
        );
      }
      return null;
    }

    const activeTab = slot.activeTab && slot.tabs.includes(slot.activeTab) ? slot.activeTab : slot.tabs[0];

    return (
      <div
        style={heightStyle}
        onDragOver={(e) => handleSlotDragOver(e, slotId)}
        onDragLeave={(e) => handleSlotDragLeave(e, slotId)}
        onDrop={(e) => handleSlotDrop(e, slotId)}
        className={`relative flex flex-col min-h-0 bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg transition-all ${
          isDragTarget ? 'ring-2 ring-blue-500 shadow-blue-500/20' : ''
        }`}
      >
        {/* Slot Tab Header */}
        <div className="h-8 min-h-[32px] bg-slate-950/95 border-b border-slate-800/90 px-1.5 flex items-center justify-between select-none z-30 flex-shrink-0">
          {/* Left: Tab List */}
          <div role="tablist" className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {slot.tabs.map((tabId, index) => {
              const meta = getPanelMeta(tabId, lang);
              const Icon = meta.icon;
              const isActive = tabId === activeTab;
              const isMoving = openMoveMenu?.panelId === tabId && openMoveMenu?.slotId === slotId;

              return (
                <div
                  key={tabId}
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, tabId, slotId)}
                  onDragEnd={handleTabDragEnd}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => handleTabDropReorder(e, slotId, index)}
                  onClick={() => handleSetActiveTab(slotId, tabId)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSetActiveTab(slotId, tabId);
                    } else if (e.key === 'Delete') {
                      e.preventDefault();
                      handleCloseTab(tabId);
                    }
                  }}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isActive}
                  className={`group/tab relative flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer flex-shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? `bg-slate-900 text-slate-100 border-slate-700/80 shadow-sm ${meta.borderActive}`
                      : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent'
                  }`}
                  title={`${meta.title} (${lang === 'en' ? 'Drag to merge or move pane' : '按住拖曳可合併或移動窗格'})`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                  <span className="truncate max-w-[90px] sm:max-w-[120px]">{meta.shortTitle}</span>

                  {/* Slot Relocate Button & Dropdown */}
                  <div className="relative" data-dropdown-container>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMoveMenu(isMoving ? null : { panelId: tabId, slotId });
                      }}
                      className={`p-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors ${
                        isMoving ? 'text-blue-400 bg-slate-800' : 'text-slate-500 opacity-60 group-hover/tab:opacity-100'
                      }`}
                      title={lang === 'en' ? 'Quickly move to another slot' : '快速移至其他窗格位置'}
                      aria-label={lang === 'en' ? 'Quickly move to another slot' : '快速移至其他窗格位置'}
                      aria-haspopup="menu"
                      aria-expanded={isMoving}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {/* Popover Move Menu */}
                    {isMoving && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1.5 w-48 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-scale-in"
                      >
                        <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 border-b border-slate-800 mb-1">
                          {t('moveToTarget', lang)}
                        </div>
                        {(['topLeft', 'bottomLeft', 'topRight', 'bottomRight'] as DockSlotId[]).map((targetSlot) => {
                          const isCurrent = targetSlot === slotId;
                          return (
                            <button
                              key={targetSlot}
                              type="button"
                              onClick={() => handleMoveTab(tabId, targetSlot)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                                isCurrent
                                  ? 'bg-blue-600/20 text-blue-300 font-semibold cursor-default'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="font-mono text-sm">{DOCK_SLOT_ICONS[targetSlot]}</span>
                                <span>{getSlotName(targetSlot, lang)}</span>
                              </span>
                              {isCurrent && <span className="text-[10px] text-blue-400">{t('currentSlot', lang)}</span>}
                            </button>
                          );
                        })}
                        <div className="pt-1 mt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              onToggleMaximizePanel(tabId);
                              setOpenMoveMenu(null);
                            }}
                            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>{t('maximizeSlot', lang)}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Close Tab Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tabId);
                    }}
                    className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title={lang === 'en' ? `Close "${meta.title}" tab` : `關閉「${meta.title}」標籤頁`}
                    aria-label={lang === 'en' ? `Close "${meta.title}" tab` : `關閉「${meta.title}」標籤頁`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Right: Slot Tools (+ Add Tab & Maximize) */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {/* Add Tab to Slot */}
            <div className="relative" data-dropdown-container>
              <button
                type="button"
                onClick={() => setOpenAddMenuSlot(openAddMenuSlot === slotId ? null : slotId)}
                className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
                  openAddMenuSlot === slotId
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={lang === 'en' ? 'Add/merge tabs into this slot' : '在此窗格加回/合併其他標籤頁'}
                aria-label={lang === 'en' ? 'Add/merge tabs into this slot' : '在此窗格加回/合併其他標籤頁'}
                aria-haspopup="menu"
                aria-expanded={openAddMenuSlot === slotId}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {openAddMenuSlot === slotId && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-scale-in"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 border-b border-slate-800 mb-1">
                    {t('addTabHere', lang)}
                  </div>
                  {ALL_PANELS.map((pId) => {
                    const pMeta = getPanelMeta(pId, lang);
                    const PIcon = pMeta.icon;
                    const isAlreadyHere = slot.tabs.includes(pId);

                    return (
                      <button
                        key={pId}
                        type="button"
                        disabled={isAlreadyHere}
                        onClick={() => handleAddTabToSlot(slotId, pId)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                          isAlreadyHere
                            ? 'text-slate-600 cursor-not-allowed opacity-50'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <PIcon className={`w-3.5 h-3.5 ${pMeta.color}`} />
                          <span>{pMeta.title}</span>
                        </span>
                        {isAlreadyHere && <span className="text-[10px] text-slate-500">{t('alreadyHere', lang)}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Maximize Slot */}
            <button
              type="button"
              onClick={() => onToggleMaximizePanel(activeTab)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t('maximizeSlot', lang)}
              aria-label={t('maximizeSlot', lang)}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Slot Panel Body */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-900 [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
          {activeTab ? renderPanel(activeTab) : null}
        </div>
      </div>
    );
  };

  // If a single panel is maximized, render it full workspace
  if (activeMaximizedPanel) {
    const meta = getPanelMeta(activeMaximizedPanel, lang);
    const Icon = meta?.icon || Video;
    return (
      <div className="dock-workbench w-full h-full p-2 flex flex-col bg-slate-950 animate-scale-in">
        {/* Maximized Header Bar */}
        <div className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-t-xl flex items-center justify-between text-xs font-medium text-slate-200">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${meta?.color || 'text-blue-400'}`} />
            <span className="font-bold">{meta?.title || (lang === 'en' ? 'Maximized View' : '全螢幕檢視')}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/40">
              {lang === 'en' ? 'Maximized Mode' : '全螢幕放大模式'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleMaximizePanel(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-sm"
            title={t('restoreSlot', lang)}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{t('restoreSlot', lang)}</span>
          </button>
        </div>
        {/* Maximized Body */}
        <div className="flex-1 min-h-0 bg-slate-900 border-x border-b border-slate-800 rounded-b-xl overflow-hidden [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
          {renderPanel(activeMaximizedPanel)}
        </div>
      </div>
    );
  }

  // --- Normal 4-Quadrant Dock Layout ---
  // Sizes use flex-grow ratios with a 0 basis, so the resizer bars are
  // subtracted first and the panes never sum to more than 100%.
  const { colSplit, leftRowSplit, rightRowSplit } = ratios;
  const paneFlex = (ratio: number, minPx: number, axis: 'w' | 'h'): React.CSSProperties => ({
    flex: `${ratio} 1 0px`,
    ...(axis === 'h' ? { minHeight: minPx } : { minWidth: minPx })
  });
  const FULL: React.CSSProperties = { flex: '1 1 0px', minHeight: 0 };

  const hasTopLeft = layout.slots.topLeft.tabs.length > 0;
  const hasBottomLeft = layout.slots.bottomLeft.tabs.length > 0;
  const hasTopRight = layout.slots.topRight.tabs.length > 0;
  const hasBottomRight = layout.slots.bottomRight.tabs.length > 0;

  const hasLeftCol = hasTopLeft || hasBottomLeft || draggedPanel !== null;
  const hasRightCol = hasTopRight || hasBottomRight || draggedPanel !== null;

  return (
    <div className="dock-workbench w-full h-full flex flex-col p-1 bg-slate-950 text-slate-100 overflow-hidden">
      {/* Main Dock Container */}
      <div ref={containerRef} className="flex-1 w-full min-h-0 flex relative overflow-hidden select-none">
        {/* Left Column */}
        {hasLeftCol && (
          <div
            style={hasRightCol ? paneFlex(colSplit, 200, 'w') : FULL}
            className="h-full flex flex-col min-w-0 relative"
          >
            {hasTopLeft
              ? renderDockSlot('topLeft', hasBottomLeft ? paneFlex(leftRowSplit, 120, 'h') : FULL)
              : draggedPanel
              ? renderDockSlot('topLeft')
              : null}

            {hasTopLeft && hasBottomLeft && renderResizer('leftRowSplit')}

            {hasBottomLeft
              ? renderDockSlot('bottomLeft', hasTopLeft ? paneFlex(100 - leftRowSplit, 120, 'h') : FULL)
              : draggedPanel
              ? renderDockSlot('bottomLeft')
              : null}
          </div>
        )}

        {/* Central Vertical Resizer (Between Left and Right Columns) */}
        {hasLeftCol && hasRightCol && renderResizer('colSplit')}

        {/* Right Column */}
        {hasRightCol && (
          <div
            style={hasLeftCol ? paneFlex(100 - colSplit, 200, 'w') : FULL}
            className="h-full flex flex-col min-w-0 relative"
          >
            {hasTopRight
              ? renderDockSlot('topRight', hasBottomRight ? paneFlex(rightRowSplit, 120, 'h') : FULL)
              : draggedPanel
              ? renderDockSlot('topRight')
              : null}

            {hasTopRight && hasBottomRight && renderResizer('rightRowSplit')}

            {hasBottomRight
              ? renderDockSlot('bottomRight', hasTopRight ? paneFlex(100 - rightRowSplit, 120, 'h') : FULL)
              : draggedPanel
              ? renderDockSlot('bottomRight')
              : null}
          </div>
        )}

        {/* Shield iframes (YouTube) from stealing pointer events while resizing */}
        {resizeAxis && (
          <div
            aria-hidden="true"
            className={`fixed inset-0 z-[100] ${resizeAxis === 'col' ? 'cursor-col-resize' : 'cursor-row-resize'}`}
          />
        )}
      </div>
    </div>
  );
};
