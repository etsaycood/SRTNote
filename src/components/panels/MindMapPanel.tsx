import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MindMapNode, parseTextToMindMap } from '../../utils/mindMapParser';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  GripVertical,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Edit3,
  Check,
  Search,
  Focus,
  Layers,
  Copy,
  Download,
  Upload
} from 'lucide-react';

interface MindMapPanelProps {
  mindMapContent: string;
  projectTitle: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onUpdateMindMap: (newContent: string) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose?: () => void;
}

interface PositionedNode {
  node: MindMapNode;
  x: number;
  y: number; // Vertical center Y of the card
  width: number;
  height: number;
  subtreeHeight: number;
  isExpanded: boolean;
  parentX?: number;
  parentY?: number;
  parentWidth?: number;
}

interface BranchPalette {
  name: string;
  stroke: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  accentBar: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glow: string;
}

const BRANCH_PALETTES: BranchPalette[] = [
  {
    name: 'indigo',
    stroke: '#6366f1',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-indigo-500/45',
    cardHoverBorder: 'hover:border-indigo-400',
    accentBar: 'bg-indigo-500',
    badgeBg: 'bg-indigo-500/20 hover:bg-indigo-500/35',
    badgeText: 'text-indigo-200',
    badgeBorder: 'border-indigo-500/50',
    glow: 'ring-indigo-500/50 shadow-indigo-500/20'
  },
  {
    name: 'emerald',
    stroke: '#10b981',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-emerald-500/45',
    cardHoverBorder: 'hover:border-emerald-400',
    accentBar: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20 hover:bg-emerald-500/35',
    badgeText: 'text-emerald-200',
    badgeBorder: 'border-emerald-500/50',
    glow: 'ring-emerald-500/50 shadow-emerald-500/20'
  },
  {
    name: 'amber',
    stroke: '#f59e0b',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-amber-500/45',
    cardHoverBorder: 'hover:border-amber-400',
    accentBar: 'bg-amber-500',
    badgeBg: 'bg-amber-500/20 hover:bg-amber-500/35',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-500/50',
    glow: 'ring-amber-500/50 shadow-amber-500/20'
  },
  {
    name: 'purple',
    stroke: '#a855f7',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-purple-500/45',
    cardHoverBorder: 'hover:border-purple-400',
    accentBar: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20 hover:bg-purple-500/35',
    badgeText: 'text-purple-200',
    badgeBorder: 'border-purple-500/50',
    glow: 'ring-purple-500/50 shadow-purple-500/20'
  },
  {
    name: 'rose',
    stroke: '#f43f5e',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-rose-500/45',
    cardHoverBorder: 'hover:border-rose-400',
    accentBar: 'bg-rose-500',
    badgeBg: 'bg-rose-500/20 hover:bg-rose-500/35',
    badgeText: 'text-rose-200',
    badgeBorder: 'border-rose-500/50',
    glow: 'ring-rose-500/50 shadow-rose-500/20'
  },
  {
    name: 'cyan',
    stroke: '#06b6d4',
    cardBg: 'bg-slate-900/95',
    cardBorder: 'border-cyan-500/45',
    cardHoverBorder: 'hover:border-cyan-400',
    accentBar: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/20 hover:bg-cyan-500/35',
    badgeText: 'text-cyan-200',
    badgeBorder: 'border-cyan-500/50',
    glow: 'ring-cyan-500/50 shadow-cyan-500/20'
  }
];

/**
 * 估算節點卡片尺寸（確保多行文字不會重疊）
 */
function estimateNodeDimensions(node: MindMapNode): { width: number; height: number } {
  const width = node.depth === 0 ? 230 : node.depth === 1 ? 245 : 265;

  // Count visual width: CJK characters count as 2 units, ASCII as 1 unit
  let visualUnits = 0;
  for (const ch of node.label) {
    visualUnits += ch.charCodeAt(0) > 255 ? 2 : 1;
  }

  const unitsPerLine = node.depth === 0 ? 22 : 26;
  const lines = Math.max(1, Math.ceil(visualUnits / unitsPerLine));
  const height = Math.max(48, 28 + lines * 22);

  return { width, height };
}

/**
 * 收集小於指定深度的所有節點 ID（用於預設展開前 N 層）
 * expandLevel = 2 代表展開 depth 0 與 depth 1 的節點，使畫面上顯示第 0、1、2 共三階節點
 */
function collectExpandedIdsByLevel(root: MindMapNode, expandLevel: number): Set<string> {
  const set = new Set<string>();
  const walk = (n: MindMapNode) => {
    if (n.depth < expandLevel && n.children.length > 0) {
      set.add(n.id);
    }
    for (const c of n.children) {
      walk(c);
    }
  };
  walk(root);
  return set;
}

/**
 * 收集整棵樹所有父節點 ID（用於全部展開）
 */
function collectAllParentIds(root: MindMapNode): Set<string> {
  const set = new Set<string>();
  const walk = (n: MindMapNode) => {
    if (n.children.length > 0) {
      set.add(n.id);
      for (const c of n.children) {
        walk(c);
      }
    }
  };
  walk(root);
  return set;
}

export const MindMapPanel: React.FC<MindMapPanelProps> = ({
  mindMapContent,
  projectTitle,
  currentTime,
  onSeek,
  onUpdateMindMap,
  isMaximized,
  onToggleMaximize,
  onClose
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Parse Markdown or Mermaid mindmap into hierarchical tree
  const rootNode = useMemo(() => {
    return parseTextToMindMap(mindMapContent, projectTitle);
  }, [mindMapContent, projectTitle]);

  // Default expand level: 2 (shows Root + Level 1 + Level 2; Level 3+ collapsed)
  const [activeExpandPreset, setActiveExpandPreset] = useState<number | 'all'>(2);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    collectExpandedIdsByLevel(rootNode, 2)
  );

  // Re-initialize expanded state when mindMapContent structure changes significantly
  const prevContentRef = useRef<string>(mindMapContent);
  useEffect(() => {
    if (prevContentRef.current !== mindMapContent) {
      prevContentRef.current = mindMapContent;
      setExpandedIds(
        activeExpandPreset === 'all'
          ? collectAllParentIds(rootNode)
          : collectExpandedIdsByLevel(rootNode, activeExpandPreset)
      );
    }
  }, [mindMapContent, rootNode, activeExpandPreset]);

  // Pan & Zoom State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 48, y: 180 });
  const [zoom, setZoom] = useState<number>(0.92);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSmoothTransition, setIsSmoothTransition] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0
  });
  const didMoveRef = useRef<boolean>(false);

  // Selected / Focused Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const pendingFocusNodeIdRef = useRef<string | null>(null);

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);

  // Quick Editor Modal/Drawer State
  const [isEditingSource, setIsEditingSource] = useState<boolean>(false);
  const [draftText, setDraftText] = useState<string>(mindMapContent);

  useEffect(() => {
    setDraftText(mindMapContent);
  }, [mindMapContent]);

  // Compute Horizontal Tree Layout for currently expanded nodes
  const layout = useMemo(() => {
    const HORIZONTAL_GAP = 76;
    const VERTICAL_GAP = 18;

    const nodes: PositionedNode[] = [];
    const depthXOffsets: number[] = [0];

    // Determine max width at each depth first
    const maxWidthsByDepth: Record<number, number> = {};
    const measureWidths = (n: MindMapNode) => {
      const { width } = estimateNodeDimensions(n);
      maxWidthsByDepth[n.depth] = Math.max(maxWidthsByDepth[n.depth] || 0, width);
      if (expandedIds.has(n.id)) {
        for (const c of n.children) {
          measureWidths(c);
        }
      }
    };
    measureWidths(rootNode);

    for (let d = 1; d <= 12; d++) {
      const prevWidth = maxWidthsByDepth[d - 1] || 245;
      depthXOffsets[d] = depthXOffsets[d - 1] + prevWidth + HORIZONTAL_GAP;
    }

    // Bottom-up subtree height calculation
    const subtreeHeights = new Map<string, { width: number; height: number; subtreeH: number }>();

    const computeSubtreeH = (n: MindMapNode): number => {
      const { width, height } = estimateNodeDimensions(n);
      const isExp = expandedIds.has(n.id) && n.children.length > 0;
      if (!isExp) {
        const h = height + VERTICAL_GAP;
        subtreeHeights.set(n.id, { width, height, subtreeH: h });
        return h;
      }

      let childrenTotalH = 0;
      for (const c of n.children) {
        childrenTotalH += computeSubtreeH(c);
      }
      const subtreeH = Math.max(height + VERTICAL_GAP, childrenTotalH);
      subtreeHeights.set(n.id, { width, height, subtreeH });
      return subtreeH;
    };

    computeSubtreeH(rootNode);

    // Top-down coordinate assignment
    const assignCoords = (
      n: MindMapNode,
      topY: number,
      parentInfo?: { x: number; y: number; width: number }
    ): number => {
      const dims = subtreeHeights.get(n.id)!;
      const x = depthXOffsets[n.depth] ?? n.depth * 310;
      const isExp = expandedIds.has(n.id) && n.children.length > 0;

      let centerY = topY + dims.subtreeH / 2;

      if (isExp && n.children.length > 0) {
        let curChildTop = topY;
        const childCenters: number[] = [];
        for (const c of n.children) {
          const childDims = subtreeHeights.get(c.id)!;
          const cCenter = assignCoords(c, curChildTop, {
            x,
            y: centerY, // temporary, updated below
            width: dims.width
          });
          childCenters.push(cCenter);
          curChildTop += childDims.subtreeH;
        }
        // Align parent vertical center to midpoint between first and last child center
        centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;

        // Update direct children's parentY to match exact parent centerY
        for (const positioned of nodes) {
          if (n.children.some((ch) => ch.id === positioned.node.id)) {
            positioned.parentY = centerY;
          }
        }
      }

      nodes.push({
        node: n,
        x,
        y: centerY,
        width: dims.width,
        height: dims.height,
        subtreeHeight: dims.subtreeH,
        isExpanded: isExp,
        parentX: parentInfo?.x,
        parentY: parentInfo?.y,
        parentWidth: parentInfo?.width
      });

      return centerY;
    };

    assignCoords(rootNode, 0);

    // Compute overall bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of nodes) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + p.width);
      minY = Math.min(minY, p.y - p.height / 2);
      maxY = Math.max(maxY, p.y + p.height / 2);
    }

    if (!isFinite(minX)) {
      minX = 0;
      maxX = 300;
      minY = 0;
      maxY = 200;
    }

    return {
      nodes,
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
        width: Math.max(100, maxX - minX),
        height: Math.max(100, maxY - minY)
      }
    };
  }, [rootNode, expandedIds]);

  // Fit entire mindmap into viewport
  const fitToView = useCallback(
    (animate: boolean = true) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const vw = vp.clientWidth || 600;
      const vh = vp.clientHeight || 450;

      const paddingX = 64;
      const paddingY = 88;
      const availW = Math.max(200, vw - paddingX * 2);
      const availH = Math.max(160, vh - paddingY * 2);

      const scaleX = availW / (layout.bounds.width + 40);
      const scaleY = availH / (layout.bounds.height + 40);
      const newZoom = Math.min(1.15, Math.max(0.32, Math.min(scaleX, scaleY)));

      const centerX = (layout.bounds.minX + layout.bounds.maxX) / 2;
      const centerY = (layout.bounds.minY + layout.bounds.maxY) / 2;

      const newPanX = vw / 2 - centerX * newZoom;
      const newPanY = vh / 2 - centerY * newZoom + 12;

      if (animate) {
        setIsSmoothTransition(true);
        window.setTimeout(() => setIsSmoothTransition(false), 360);
      }
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      setFocusedNodeId(null);
    },
    [layout.bounds]
  );

  // Auto fit on initial mount or maximize toggle
  useEffect(() => {
    const t = window.setTimeout(() => {
      fitToView(false);
    }, 60);
    return () => clearTimeout(t);
  }, [isMaximized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Execute pending focus calculation once layout reflects newly expanded children
  useEffect(() => {
    const targetId = pendingFocusNodeIdRef.current;
    if (!targetId) return;
    pendingFocusNodeIdRef.current = null;

    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth || 600;
    const vh = vp.clientHeight || 450;

    const targetPos = layout.nodes.find((p) => p.node.id === targetId);
    if (!targetPos) return;

    const childPositions = layout.nodes.filter((p) =>
      targetPos.node.children.some((c) => c.id === p.node.id)
    );

    let minX = targetPos.x;
    let maxX = targetPos.x + targetPos.width;
    let minY = targetPos.y - targetPos.height / 2;
    let maxY = targetPos.y + targetPos.height / 2;

    for (const cp of childPositions) {
      minX = Math.min(minX, cp.x);
      maxX = Math.max(maxX, cp.x + cp.width);
      minY = Math.min(minY, cp.y - cp.height / 2);
      maxY = Math.max(maxY, cp.y + cp.height / 2);
    }

    const boxW = Math.max(260, maxX - minX + 100);
    const boxH = Math.max(160, maxY - minY + 100);

    const targetZoom = Math.min(
      1.45,
      Math.max(0.85, Math.min((vw - 80) / boxW, (vh - 110) / boxH))
    );

    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;

    setIsSmoothTransition(true);
    window.setTimeout(() => setIsSmoothTransition(false), 380);

    setZoom(targetZoom);
    setPan({
      x: vw / 2 - boxCenterX * targetZoom,
      y: vh / 2 - boxCenterY * targetZoom + 10
    });
  }, [layout]);

  // Focus & Zoom in on a specific node (and its immediate visible children)
  const handleFocusNode = useCallback(
    (targetNode: MindMapNode, expandChildren: boolean = true) => {
      setSelectedNodeId(targetNode.id);
      setFocusedNodeId(targetNode.id);
      pendingFocusNodeIdRef.current = targetNode.id;

      if (expandChildren && targetNode.children.length > 0 && !expandedIds.has(targetNode.id)) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(targetNode.id);
          return next;
        });
      } else {
        // Trigger focus immediately if layout doesn't need to change
        const vp = viewportRef.current;
        if (!vp) return;
        const vw = vp.clientWidth || 600;
        const vh = vp.clientHeight || 450;
        const targetPos = layout.nodes.find((p) => p.node.id === targetNode.id);
        if (!targetPos) return;
        pendingFocusNodeIdRef.current = null;

        const childPositions = layout.nodes.filter((p) =>
          targetNode.children.some((c) => c.id === p.node.id)
        );

        let minX = targetPos.x;
        let maxX = targetPos.x + targetPos.width;
        let minY = targetPos.y - targetPos.height / 2;
        let maxY = targetPos.y + targetPos.height / 2;

        for (const cp of childPositions) {
          minX = Math.min(minX, cp.x);
          maxX = Math.max(maxX, cp.x + cp.width);
          minY = Math.min(minY, cp.y - cp.height / 2);
          maxY = Math.max(maxY, cp.y + cp.height / 2);
        }

        const boxW = Math.max(260, maxX - minX + 100);
        const boxH = Math.max(160, maxY - minY + 100);

        const targetZoom = Math.min(
          1.45,
          Math.max(0.85, Math.min((vw - 80) / boxW, (vh - 110) / boxH))
        );

        const boxCenterX = (minX + maxX) / 2;
        const boxCenterY = (minY + maxY) / 2;

        setIsSmoothTransition(true);
        window.setTimeout(() => setIsSmoothTransition(false), 380);

        setZoom(targetZoom);
        setPan({
          x: vw / 2 - boxCenterX * targetZoom,
          y: vh / 2 - boxCenterY * targetZoom + 10
        });
      }
    },
    [expandedIds, layout.nodes]
  );

  // Toggle expand/collapse of a single node
  const handleToggleNodeExpand = (e: React.MouseEvent, node: MindMapNode) => {
    e.stopPropagation();
    if (node.children.length === 0) return;

    const willExpand = !expandedIds.has(node.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });

    // If expanding a node, select it
    if (willExpand) {
      setSelectedNodeId(node.id);
    }
  };

  // Preset Expand Depth Handlers
  const handleApplyExpandPreset = (preset: number | 'all') => {
    setActiveExpandPreset(preset);
    if (preset === 'all') {
      setExpandedIds(collectAllParentIds(rootNode));
    } else {
      setExpandedIds(collectExpandedIdsByLevel(rootNode, preset));
    }
    window.setTimeout(() => fitToView(true), 50);
  };

  // Mouse Wheel Zoom (centered on cursor)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;

    const rect = vp.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.min(2.4, Math.max(0.25, zoom * zoomFactor));

    // Keep the world point under cursor stationary
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    const nextPanX = mouseX - worldX * nextZoom;
    const nextPanY = mouseY - worldY * nextZoom;

    setIsSmoothTransition(false);
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  // Canvas Drag Panning (Mouse & Touch)
  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan when clicking background or non-button area
    if ((e.target as HTMLElement).closest('button, input, textarea')) {
      return;
    }
    setIsDragging(true);
    setIsSmoothTransition(false);
    didMoveRef.current = false;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) {
      return;
    }
    if (e.touches.length === 1) {
      setIsDragging(true);
      setIsSmoothTransition(false);
      didMoveRef.current = false;
      dragStartRef.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        didMoveRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.clientX;
        const dy = e.touches[0].clientY - dragStartRef.current.clientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          didMoveRef.current = true;
        }
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy
        });
      }
    };

    const onEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  // Zoom button helpers
  const handleZoomBy = (factor: number) => {
    const vp = viewportRef.current;
    const vw = vp?.clientWidth || 600;
    const vh = vp?.clientHeight || 450;
    const cx = vw / 2;
    const cy = vh / 2;

    const nextZoom = Math.min(2.4, Math.max(0.25, zoom * factor));
    const worldX = (cx - pan.x) / zoom;
    const worldY = (cy - pan.y) / zoom;

    setIsSmoothTransition(true);
    window.setTimeout(() => setIsSmoothTransition(false), 260);
    setZoom(nextZoom);
    setPan({
      x: cx - worldX * nextZoom,
      y: cy - worldY * nextZoom
    });
  };

  // Render node label with interactive [MM:SS] timestamp buttons
  const renderLabelWithTimestamps = (node: MindMapNode) => {
    const parts = node.label.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]$/);
      if (match) {
        const rawTime = match[1];
        const tsObj = node.timestamps.find((t) => t.raw === rawTime);
        const seconds = tsObj ? tsObj.seconds : 0;
        const isCurrentTimeNear =
          currentTime > 0 && Math.abs(currentTime - seconds) <= 8;

        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(seconds);
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] font-mono font-semibold transition-all active:scale-95 ${
              isCurrentTimeNear
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40 ring-1 ring-amber-300'
                : 'bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 hover:text-white border border-blue-500/40'
            }`}
            title={`點擊跳轉至影片 ${rawTime}`}
          >
            <span>⏱️</span>
            <span>{rawTime}</span>
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Save edited source text
  const handleSaveDraft = () => {
    onUpdateMindMap(draftText);
    setIsEditingSource(false);
  };

  const handleCopyMindMap = () => {
    navigator.clipboard.writeText(mindMapContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMindMap = () => {
    const blob = new Blob([mindMapContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle || 'mindmap'}_mindmap.mmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadMindMapFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onUpdateMindMap(text);
          setIsEditingSource(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInsertSampleMindmap = () => {
    const sampleMermaid = `mindmap
  root((${projectTitle || '核心主題'}))
    第一階段：背景與目標 [00:00]
      核心痛點分析 [00:15]
        舊架構維護成本高
        高併發效能瓶頸
      改版預期效益 [00:45]
    第二階段：技術方案與實作 [01:20]
      後端微服務重構 [01:40]
        資料庫轉接層 (Adapter)
        Redis 高速快取
      前端響應式設計系統 [02:30]
    第三階段：測試與上線時程 [03:10]
      週五全模組整合壓測 [03:30]
      下週二正式發布上線 [04:00]`;
    setDraftText(sampleMermaid);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg select-none">
      {/* Top Floating Header Bar */}
      <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Panel Title Badge */}
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/70 shadow-md">
            <span title="拖曳以調換面板位置" className="cursor-grab active:cursor-grabbing flex items-center">
              <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            </span>
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold tracking-wider text-slate-100">互動心智圖</span>
          </div>

          {/* Expand Level Quick Controls (預設展開前 2~3 層) */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-md text-[11px]">
            <span className="px-1.5 text-slate-400 hidden sm:inline-flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>展開:</span>
            </span>
            <button
              type="button"
              onClick={() => handleApplyExpandPreset(1)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                activeExpandPreset === 1
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="僅展開第 1 層主分支"
            >
              1層
            </button>
            <button
              type="button"
              onClick={() => handleApplyExpandPreset(2)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                activeExpandPreset === 2
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="預設：展開前 2 層分支"
            >
              2層
            </button>
            <button
              type="button"
              onClick={() => handleApplyExpandPreset(3)}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                activeExpandPreset === 3
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="展開前 3 層分支"
            >
              3層
            </button>
            <button
              type="button"
              onClick={() => handleApplyExpandPreset('all')}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                activeExpandPreset === 'all'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="展開全部階層節點"
            >
              全展開
            </button>
          </div>

          {/* Search & Source Edit / File Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-md">
            <button
              type="button"
              onClick={() => setShowSearchBar((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showSearchBar || searchQuery
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="搜尋並高亮心智圖節點"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsEditingSource((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isEditingSource
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="獨立編輯或貼上心智圖語法 (不影響重點整理)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">貼上/編輯</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMindMap}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="複製心智圖原始語法"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleDownloadMindMap}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="下載心智圖語法檔 (.mmd)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="上傳心智圖語法檔 (.mmd/.md/.txt)"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".mmd,.md,.txt"
                onChange={handleUploadMindMapFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Right: Maximize & Close */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-md">
          <button
            type="button"
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMaximized ? '還原視窗大小' : '最大化心智圖'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="關閉心智圖面板"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optional Search Input Bar */}
      {showSearchBar && (
        <div className="absolute top-14 left-4 z-30 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-xl">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="輸入關鍵字搜尋節點..."
            autoFocus
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-44"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white text-xs"
            >
              清除
            </button>
          )}
        </div>
      )}

      {/* Focused Node Banner (When user zooms into a specific node) */}
      {focusedNodeId && (
        <div className="absolute top-14 right-4 z-30 flex items-center gap-2 bg-indigo-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/50 shadow-xl text-xs text-indigo-200 animate-fade-in">
          <Focus className="w-3.5 h-3.5 text-indigo-400" />
          <span>已聚焦放大節點</span>
          <button
            type="button"
            onClick={() => fitToView(true)}
            className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors"
          >
            返回全景
          </button>
        </div>
      )}

      {/* Source Editor Overlay Drawer */}
      {isEditingSource && (
        <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col p-4 pt-16 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                編輯心智圖來源（支援 Markdown `# / -` 或直接貼上 NotebookLM / Mermaid `mindmap` 縮排語法）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInsertSampleMindmap}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs transition-colors"
              >
                插入 Mermaid mindmap 範本
              </button>
              <button
                type="button"
                onClick={() => setIsEditingSource(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>套用並渲染心智圖</span>
              </button>
            </div>
          </div>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="在此貼上帶有 [MM:SS] 時間戳記的 Markdown 重點整理，或 Mermaid mindmap 語法..."
            className="flex-1 w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 text-xs font-mono text-slate-100 leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>
      )}

      {/* Interactive Mind Map Canvas Viewport */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onTouchStart={handleTouchStart}
        className={`relative flex-1 w-full h-full overflow-hidden touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* World Transform Layer (shared by SVG curves and HTML node cards) */}
        <div
          className={`absolute top-0 left-0 origin-top-left ${
            isSmoothTransition ? 'transition-transform duration-300 ease-out' : ''
          }`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`
          }}
        >
          {/* 1. SVG Cubic Bézier Edges Layer */}
          <svg
            className="overflow-visible pointer-events-none absolute top-0 left-0"
            width={1}
            height={1}
          >
            {layout.nodes.map((item) => {
              if (
                item.parentX === undefined ||
                item.parentY === undefined ||
                item.parentWidth === undefined
              ) {
                return null;
              }
              const startX = item.parentX + item.parentWidth;
              const startY = item.parentY;
              const endX = item.x;
              const endY = item.y;
              const midX = startX + (endX - startX) * 0.5;

              const palette =
                BRANCH_PALETTES[item.node.branchIndex % BRANCH_PALETTES.length];

              const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

              return (
                <path
                  key={`edge_${item.node.id}`}
                  d={pathData}
                  fill="none"
                  stroke={palette.stroke}
                  strokeWidth={item.node.depth === 1 ? 2.6 : 1.9}
                  strokeOpacity={0.72}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* 2. HTML Node Cards Layer */}
          {layout.nodes.map((item) => {
            const { node, x, y, width, isExpanded } = item;
            const isRoot = node.depth === 0;
            const hasChildren = node.children.length > 0;
            const palette =
              BRANCH_PALETTES[node.branchIndex % BRANCH_PALETTES.length];
            const isSelected = selectedNodeId === node.id;
            const isSearchMatch =
              searchQuery.trim().length > 0 &&
              node.label.toLowerCase().includes(searchQuery.trim().toLowerCase());

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (didMoveRef.current) return;
                  setSelectedNodeId(node.id);
                  // If collapsed and has children, clicking card expands it cleanly
                  if (hasChildren && !isExpanded) {
                    handleToggleNodeExpand(e, node);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleFocusNode(node, true);
                }}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  transform: 'translateY(-50%)'
                }}
                className={`absolute rounded-xl border transition-all duration-200 cursor-pointer group/node shadow-lg ${
                  isRoot
                    ? 'bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-900 border-indigo-400/70 shadow-indigo-500/20 px-4 py-3'
                    : `${palette.cardBg} ${palette.cardBorder} ${palette.cardHoverBorder} px-3.5 py-2.5`
                } ${
                  isSelected
                    ? `ring-2 ${palette.glow}`
                    : ''
                } ${
                  isSearchMatch
                    ? 'ring-2 ring-amber-400 bg-amber-950/70 border-amber-400'
                    : ''
                }`}
              >
                {/* Left Colored Accent Strip for non-root nodes */}
                {!isRoot && (
                  <div
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${palette.accentBar}`}
                  />
                )}

                {/* Card Content */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`leading-snug break-words flex-1 ${
                      isRoot
                        ? 'text-sm font-extrabold text-white tracking-wide'
                        : node.depth === 1
                        ? 'text-xs font-bold text-slate-100'
                        : 'text-xs font-medium text-slate-200'
                    }`}
                  >
                    {renderLabelWithTimestamps(node)}
                  </div>

                  {/* Quick Focus/Zoom button on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusNode(node, true);
                    }}
                    className="opacity-0 group-hover/node:opacity-100 p-1 rounded-lg bg-slate-800/90 hover:bg-cyan-600 text-slate-300 hover:text-white transition-all flex-shrink-0"
                    title="聚焦放大此節點 (或雙擊節點)"
                  >
                    <Focus className="w-3 h-3" />
                  </button>
                </div>

                {/* Right-side Expand / Collapse Badge (NotebookLM style) */}
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleNodeExpand(e, node)}
                    className={`absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full border shadow-md transition-all active:scale-90 ${
                      isExpanded
                        ? 'w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                        : `px-2 h-6 text-[11px] font-bold ${palette.badgeBg} ${palette.badgeText} ${palette.badgeBorder}`
                    }`}
                    title={
                      isExpanded
                        ? '點擊收合子分支'
                        : `點擊展開 ${node.children.length} 個子項目 (共 ${node.totalDescendants} 個後代節點)`
                    }
                  >
                    {isExpanded ? (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <span>{node.children.length}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating Hint & Zoom Controls */}
      <div className="absolute bottom-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Interactive Hint */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 pointer-events-auto">
          <span>💡 點擊右側數字收合/展開 ・ 雙擊節點聚焦放大 ・ 點擊 ⏱️ 跳轉時間軸</span>
        </div>

        {/* Right: Zoom & Fit Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-lg pointer-events-auto ml-auto">
          <button
            type="button"
            onClick={() => handleZoomBy(0.84)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="縮小畫布"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSmoothTransition(true);
              window.setTimeout(() => setIsSmoothTransition(false), 260);
              setZoom(1);
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors min-w-[48px] text-center"
            title="重設為 100% 縮放比例"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => handleZoomBy(1.18)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="放大畫布"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => fitToView(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-cyan-300 hover:text-white hover:bg-cyan-600/30 transition-colors"
            title="自動適應視窗大小 (置中全景)"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">適應視窗</span>
          </button>
        </div>
      </div>
    </div>
  );
};
