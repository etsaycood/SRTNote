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
}

export type PanelId = 'video' | 'slides' | 'transcript' | 'summary';

export type LayoutPreset = '2x2' | 'split-vertical' | 'slides-focus' | 'transcript-focus';

export interface PanelConfig {
  id: PanelId;
  title: string;
  visible: boolean;
  isMaximized: boolean;
}

export type MediaType = 'video' | 'audio' | 'youtube';

export interface ProjectConfig {
  version: string;
  title: string;
  mediaType: MediaType;
  youtubeUrl?: string;
  youtubeId?: string;
  mediaFileName?: string;
  mediaDuration: number;
  subtitles: SubtitleItem[];
  slides: SlideItem[];
  aiSummary: string;
  aiKeyPoints: { time: number; label: string; description: string }[];
  updatedAt: string;
}
