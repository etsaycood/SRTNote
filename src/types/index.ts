export interface SubtitleItem {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  speaker: string;
  text: string;
  color?: string;
}

export interface TimeRange {
  enabled: boolean;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface SlideItem {
  id: string;
  pageNumber: number;
  title: string;
  timestamp: number; // in seconds when this slide should appear
  imageUrl?: string; // image blob url or data url
  notes?: string;
}

export interface LMStudioConfig {
  baseUrl: string; // e.g., http://localhost:1234/v1
  model: string;
  temperature: number;
  systemPrompt: string;
  presetId?: string;
  contextWindow?: number; // Maximum safe context window in tokens (e.g. 4096, 8192, 16384)
}

export type PanelId = 'video' | 'slides' | 'transcript' | 'summary' | 'mindmap';

export type DockSlotId = 'topLeft' | 'bottomLeft' | 'topRight' | 'bottomRight';

export interface DockSlotConfig {
  tabs: PanelId[];
  activeTab: PanelId;
}

export type DockLayoutPreset = 'study' | '2x2' | 'mindmap-focus' | 'notes-focus';

export interface DockLayoutConfig {
  slots: Record<DockSlotId, DockSlotConfig>;
  splitRatios: {
    colSplit: number;      // left vs right width % (20 to 80)
    leftRowSplit: number;  // topLeft vs bottomLeft height % (20 to 80)
    rightRowSplit: number; // topRight vs bottomRight height % (20 to 80)
  };
}

export type LayoutPreset = '2x2' | 'split-vertical' | 'slides-focus' | 'transcript-focus';

export interface PanelConfig {
  id: PanelId;
  title: string;
  visible: boolean;
  isMaximized: boolean;
}

export type MediaType = 'video' | 'audio' | 'youtube';

export type LoopMode = 'off' | 'single' | 'all';

export type ShareMode = 'current_note' | 'youtube_history';

export interface ProjectConfig {
  version: string;
  shareMode?: ShareMode;
  title: string;
  mediaType: MediaType;
  youtubeUrl?: string;
  youtubeId?: string;
  mediaFileName?: string;
  mediaDuration: number;
  subtitles: SubtitleItem[];
  subtitlesByMedia?: Record<string, SubtitleItem[]>;
  slides: SlideItem[];
  slidesByMedia?: Record<string, SlideItem[]>;
  youtubeHistory?: YouTubeHistoryItem[];
  playlistVideoIds?: string[];
  loopMode?: LoopMode;
  aiSummary: string;
  mindMapContent?: string;
  aiKeyPoints: { time: number; label: string; description: string }[];
  updatedAt: string;
}

export interface YouTubeHistoryItem {
  id: string; // 11-char Video ID
  url: string; // Full YouTube URL
  title?: string;
  addedAt: number; // Timestamp
  hasSubtitles?: boolean;
}
