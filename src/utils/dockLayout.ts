import { DockLayoutConfig, DockLayoutPreset, DockSlotId, PanelId } from '../types';

export const ALL_PANELS: PanelId[] = ['video', 'slides', 'transcript', 'summary', 'mindmap'];

export const DOCK_SLOT_NAMES: Record<DockSlotId, string> = {
  topLeft: '左上窗格',
  bottomLeft: '左下窗格',
  topRight: '右上窗格',
  bottomRight: '右下窗格'
};

export const DOCK_SLOT_ICONS: Record<DockSlotId, string> = {
  topLeft: '↖',
  bottomLeft: '↙',
  topRight: '↗',
  bottomRight: '↘'
};

export const DOCK_LAYOUT_PRESETS: Record<
  DockLayoutPreset,
  { name: string; description: string; icon: string; config: DockLayoutConfig }
> = {
  study: {
    name: '研討學習模式',
    description: '左上[影音+簡報]、左下[即時字幕]、右側全高[心智圖+重點整理]',
    icon: '🧠',
    config: {
      slots: {
        topLeft: {
          tabs: ['video', 'slides'],
          activeTab: 'video'
        },
        bottomLeft: {
          tabs: ['transcript'],
          activeTab: 'transcript'
        },
        topRight: {
          tabs: ['mindmap', 'summary'],
          activeTab: 'mindmap'
        },
        bottomRight: {
          tabs: [],
          activeTab: 'summary'
        }
      },
      splitRatios: {
        colSplit: 52,
        leftRowSplit: 54,
        rightRowSplit: 50
      }
    }
  },
  '2x2': {
    name: '經典四宮格',
    description: '左上影音、右上簡報、左下逐字稿、右下重點整理',
    icon: '📊',
    config: {
      slots: {
        topLeft: {
          tabs: ['video'],
          activeTab: 'video'
        },
        topRight: {
          tabs: ['slides'],
          activeTab: 'slides'
        },
        bottomLeft: {
          tabs: ['transcript'],
          activeTab: 'transcript'
        },
        bottomRight: {
          tabs: ['summary'],
          activeTab: 'summary'
        }
      },
      splitRatios: {
        colSplit: 50,
        leftRowSplit: 50,
        rightRowSplit: 50
      }
    }
  },
  'mindmap-focus': {
    name: '心智圖專注',
    description: '左側精簡影音與字幕，右側寬螢幕全高展開心智圖',
    icon: '🗺️',
    config: {
      slots: {
        topLeft: {
          tabs: ['video', 'slides'],
          activeTab: 'video'
        },
        bottomLeft: {
          tabs: ['transcript'],
          activeTab: 'transcript'
        },
        topRight: {
          tabs: ['mindmap'],
          activeTab: 'mindmap'
        },
        bottomRight: {
          tabs: ['summary'],
          activeTab: 'summary'
        }
      },
      splitRatios: {
        colSplit: 38,
        leftRowSplit: 52,
        rightRowSplit: 70
      }
    }
  },
  'notes-focus': {
    name: '筆記專注模式',
    description: '左側全高影音，右側上下對照字幕與重點整理',
    icon: '📝',
    config: {
      slots: {
        topLeft: {
          tabs: ['video', 'slides'],
          activeTab: 'video'
        },
        bottomLeft: {
          tabs: [],
          activeTab: 'slides'
        },
        topRight: {
          tabs: ['transcript'],
          activeTab: 'transcript'
        },
        bottomRight: {
          tabs: ['summary', 'mindmap'],
          activeTab: 'summary'
        }
      },
      splitRatios: {
        colSplit: 48,
        leftRowSplit: 50,
        rightRowSplit: 50
      }
    }
  }
};

const STORAGE_KEY = 'srtnote_dock_layout_v3';

export function getDefaultDockLayout(): DockLayoutConfig {
  return JSON.parse(JSON.stringify(DOCK_LAYOUT_PRESETS.study.config));
}

export function loadDockLayoutFromStorage(): DockLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDockLayout();
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.slots &&
      parsed.slots.topLeft &&
      parsed.slots.bottomLeft &&
      parsed.slots.topRight &&
      parsed.slots.bottomRight &&
      parsed.splitRatios
    ) {
      return parsed as DockLayoutConfig;
    }
  } catch (e) {
    console.warn('Failed to parse saved dock layout, falling back to default:', e);
  }
  return getDefaultDockLayout();
}

export function saveDockLayoutToStorage(layout: DockLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (e) {
    console.warn('Failed to save dock layout to storage:', e);
  }
}

/**
 * Move a panel from whatever slot it is currently in to a target slot.
 * Ensures no duplicate tabs across slots and sets it active in target slot.
 */
export function movePanelToSlot(
  layout: DockLayoutConfig,
  panelId: PanelId,
  targetSlotId: DockSlotId
): DockLayoutConfig {
  const newSlots: Record<DockSlotId, { tabs: PanelId[]; activeTab: PanelId }> = {
    topLeft: { ...layout.slots.topLeft, tabs: [...layout.slots.topLeft.tabs] },
    bottomLeft: { ...layout.slots.bottomLeft, tabs: [...layout.slots.bottomLeft.tabs] },
    topRight: { ...layout.slots.topRight, tabs: [...layout.slots.topRight.tabs] },
    bottomRight: { ...layout.slots.bottomRight, tabs: [...layout.slots.bottomRight.tabs] }
  };

  // Remove panelId from all slots
  (Object.keys(newSlots) as DockSlotId[]).forEach((slotId) => {
    const slot = newSlots[slotId];
    if (slot.tabs.includes(panelId)) {
      slot.tabs = slot.tabs.filter((t) => t !== panelId);
      if (slot.activeTab === panelId) {
        slot.activeTab = slot.tabs[0] || ('' as PanelId);
      }
    }
  });

  // Add panelId to target slot
  const targetSlot = newSlots[targetSlotId];
  if (!targetSlot.tabs.includes(panelId)) {
    targetSlot.tabs.push(panelId);
  }
  targetSlot.activeTab = panelId;

  return {
    ...layout,
    slots: newSlots
  };
}

/**
 * Remove a panel from whichever slot it is currently in (closing it).
 */
export function removePanelFromLayout(
  layout: DockLayoutConfig,
  panelId: PanelId
): DockLayoutConfig {
  const newSlots: Record<DockSlotId, { tabs: PanelId[]; activeTab: PanelId }> = {
    topLeft: { ...layout.slots.topLeft, tabs: [...layout.slots.topLeft.tabs] },
    bottomLeft: { ...layout.slots.bottomLeft, tabs: [...layout.slots.bottomLeft.tabs] },
    topRight: { ...layout.slots.topRight, tabs: [...layout.slots.topRight.tabs] },
    bottomRight: { ...layout.slots.bottomRight, tabs: [...layout.slots.bottomRight.tabs] }
  };

  (Object.keys(newSlots) as DockSlotId[]).forEach((slotId) => {
    const slot = newSlots[slotId];
    if (slot.tabs.includes(panelId)) {
      slot.tabs = slot.tabs.filter((t) => t !== panelId);
      if (slot.activeTab === panelId) {
        slot.activeTab = slot.tabs[0] || ('' as PanelId);
      }
    }
  });

  return {
    ...layout,
    slots: newSlots
  };
}

/**
 * Add a panel to a recommended slot if not open, or bring to front if already open.
 */
export function addOrFocusPanel(
  layout: DockLayoutConfig,
  panelId: PanelId
): DockLayoutConfig {
  // Check if panel is already open in any slot
  const slotEntries = Object.entries(layout.slots) as [DockSlotId, { tabs: PanelId[]; activeTab: PanelId }][];
  for (const [slotId, slot] of slotEntries) {
    if (slot.tabs.includes(panelId)) {
      return {
        ...layout,
        slots: {
          ...layout.slots,
          [slotId]: {
            ...slot,
            activeTab: panelId
          }
        }
      };
    }
  }

  // If not open, determine best default slot
  let targetSlot: DockSlotId = 'topLeft';
  if (panelId === 'video' || panelId === 'slides') {
    targetSlot = 'topLeft';
  } else if (panelId === 'transcript') {
    targetSlot = 'bottomLeft';
  } else if (panelId === 'mindmap' || panelId === 'summary') {
    targetSlot = 'topRight';
  }

  return movePanelToSlot(layout, panelId, targetSlot);
}

/**
 * Reorder tabs within a single slot.
 */
export function reorderTabsInSlot(
  layout: DockLayoutConfig,
  slotId: DockSlotId,
  fromIndex: number,
  toIndex: number
): DockLayoutConfig {
  const slot = layout.slots[slotId];
  if (!slot || fromIndex < 0 || toIndex < 0 || fromIndex >= slot.tabs.length || toIndex >= slot.tabs.length) {
    return layout;
  }
  const newTabs = [...slot.tabs];
  const [removed] = newTabs.splice(fromIndex, 1);
  newTabs.splice(toIndex, 0, removed);

  return {
    ...layout,
    slots: {
      ...layout.slots,
      [slotId]: {
        ...slot,
        tabs: newTabs
      }
    }
  };
}

/**
 * Extract list of all currently open panels across all slots.
 */
export function getOpenPanelsFromLayout(layout: DockLayoutConfig): PanelId[] {
  const open = new Set<PanelId>();
  (Object.keys(layout.slots) as DockSlotId[]).forEach((slotId) => {
    layout.slots[slotId].tabs.forEach((tab) => open.add(tab));
  });
  return Array.from(open);
}

