import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PanelId,
  LayoutPreset,
  SubtitleItem,
  SlideItem,
  ProjectConfig,
  LMStudioConfig,
  TimeRange,
  MediaType,
  LoopMode,
  ShareMode,
  DockLayoutConfig,
  DockLayoutPreset
} from './types';
import {
  loadDockLayoutFromStorage,
  saveDockLayoutToStorage,
  getDefaultDockLayout,
  DOCK_LAYOUT_PRESETS,
  removePanelFromLayout,
  addOrFocusPanel,
  getOpenPanelsFromLayout,
  ALL_PANELS
} from './utils/dockLayout';
import {
  getSavedTheme,
  applyTheme,
  getSavedLanguage,
  setSavedLanguage,
  Theme,
  Language
} from './utils/i18n';
import { SAMPLE_PROJECT } from './mock/sampleProject';
import { DEFAULT_LM_STUDIO_CONFIG } from './utils/lmStudioClient';
import { parseSubtitleContent } from './utils/srtParser';
import { convertPdfToSlides } from './utils/pdfParser';
import {
  openDirectoryPicker,
  saveConfigToDirectory,
  downloadConfigJSON,
  LoadedFolderData
} from './utils/fileSystem';

import { Navbar } from './components/Navbar';
import { PlayerBar } from './components/PlayerBar';
import { WorkspaceGrid } from './components/WorkspaceGrid';
import { MobileWorkspaceGrid } from './components/MobileWorkspaceGrid';
import { VideoPanel } from './components/panels/VideoPanel';
import { SlidePanel } from './components/panels/SlidePanel';
import { TranscriptPanel } from './components/panels/TranscriptPanel';
import { AISummaryPanel } from './components/panels/AISummaryPanel';
import { MindMapPanel } from './components/panels/MindMapPanel';
import { LMStudioModal } from './components/LMStudioModal';
import { SlideTimelineModal } from './components/SlideTimelineModal';
import { YouTubeModal } from './components/YouTubeModal';
import { extractYouTubeId, mergeSharedYouTubeLibrary } from './utils/youtubeHelper';
import { PasteTranscriptModal } from './components/PasteTranscriptModal';
import { ShareModal } from './components/ShareModal';
import { fetchSharedConfig } from './utils/cloudShare';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, X, ListVideo, ChevronUp } from 'lucide-react';

// Helper to detect non-PC devices (mobile phones or tablets)
const detectNonPC = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowScreen = window.innerWidth <= 820;
  return isMobileUA || (hasTouch && isNarrowScreen);
};

export default function App() {
  // --- Project State ---
  const [projectTitle, setProjectTitle] = useState(SAMPLE_PROJECT.title);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<MediaType>('audio');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>(SAMPLE_PROJECT.subtitles);
  const [subtitlesByMedia, setSubtitlesByMedia] = useState<Record<string, SubtitleItem[]>>({});
  const [slides, setSlides] = useState<SlideItem[]>(SAMPLE_PROJECT.slides);
  const [slidesByMedia, setSlidesByMedia] = useState<Record<string, SlideItem[]>>({});
  const [isSlideSyncEnabled, setIsSlideSyncEnabled] = useState<boolean>(true);
  const [manualSlideIndex, setManualSlideIndex] = useState<number>(0);
  const [aiSummary, setAiSummary] = useState<string>(SAMPLE_PROJECT.aiSummary);
  const [mindMapContent, setMindMapContent] = useState<string>(SAMPLE_PROJECT.mindMapContent || '');

  // PDF Conversion State
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  // Directory Handle for File System Access API
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | undefined>(undefined);
  const [folderName, setFolderName] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(SAMPLE_PROJECT.mediaDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [playlistQueue, setPlaylistQueue] = useState<string[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const playlistQueueRef = useRef(playlistQueue);
  playlistQueueRef.current = playlistQueue;
  const currentPlaylistIndexRef = useRef(currentPlaylistIndex);
  currentPlaylistIndexRef.current = currentPlaylistIndex;
  const loopModeRef = useRef(loopMode);
  loopModeRef.current = loopMode;

  // --- Selected A-B Time Range State ---
  const [timeRange, setTimeRange] = useState<TimeRange>({
    enabled: false,
    start: 0,
    end: 1800
  });

  // --- Mobile Mode State ---
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('srtnote_mobile_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return detectNonPC();
  });

  // --- Dock Layout (Desktop Workbench) State ---
  const [dockLayout, setDockLayout] = useState<DockLayoutConfig>(() => {
    return loadDockLayoutFromStorage();
  });
  const [mobilePanels, setMobilePanels] = useState<PanelId[]>(() => {
    return ['video', 'transcript'];
  });
  const [activeMaximizedPanel, setActiveMaximizedPanel] = useState<PanelId | null>(null);

  // --- Bottom PlayerBar Visibility State ---
  const [showPlayerBar, setShowPlayerBar] = useState<boolean>(() => {
    const saved = localStorage.getItem('srtnote_show_player_bar');
    return saved !== null ? saved === 'true' : true;
  });

  const handleTogglePlayerBar = () => {
    setShowPlayerBar((prev) => {
      const next = !prev;
      localStorage.setItem('srtnote_show_player_bar', String(next));
      return next;
    });
  };

  // --- Theme (Dark / Light) State ---
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  // --- Language (zh / en) State ---
  const [lang, setLang] = useState<Language>(getSavedLanguage);
  const handleToggleLanguage = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    setSavedLanguage(next);
  };

  const openPanels = useMemo(() => {
    if (isMobileMode) {
      return mobilePanels;
    }
    return getOpenPanelsFromLayout(dockLayout);
  }, [isMobileMode, mobilePanels, dockLayout]);

  const panelPositions = openPanels;

  // Auto-detect resize if user hasn't explicitly locked preference
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('srtnote_mobile_mode');
      if (saved === null) {
        setIsMobileMode(detectNonPC());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleMobileMode = () => {
    setIsMobileMode((prev) => {
      const next = !prev;
      localStorage.setItem('srtnote_mobile_mode', String(next));
      if (next) {
        // Switching to mobile mode: ensure video and transcript are open
        setMobilePanels((current) => {
          const hasVideo = current.includes('video');
          const hasTranscript = current.includes('transcript');
          if (!hasVideo && !hasTranscript) {
            return ['video', 'transcript'];
          }
          return current;
        });
      }
      return next;
    });
  };

  // --- Modals State ---
  const [isLMModalOpen, setIsLMModalOpen] = useState(false);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isPasteTranscriptModalOpen, setIsPasteTranscriptModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalInitialMode, setShareModalInitialMode] = useState<ShareMode>('current_note');
  const [sharedBanner, setSharedBanner] = useState<{
    type: 'loading' | 'success' | 'error';
    message: string;
    rawUrl?: string;
    webViewUrl?: string;
    isHistoryShare?: boolean;
  } | null>(null);

  const handleOpenShareModal = (mode: ShareMode = 'current_note') => {
    setShareModalInitialMode(mode);
    setIsShareModalOpen(true);
  };

  // --- Auto-load Cloud Shared Project when ?s=prefix_id is present in URL ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('s');
    if (!shareParam) return;

    // 選項 1-A：當開啟分享連結時，自動將「同步簡報」面板關閉隱藏
    setDockLayout((prev) => removePanelFromLayout(prev, 'slides'));
    setMobilePanels((prev) => prev.filter((id) => id !== 'slides'));

    let cancelled = false;
    setSharedBanner({
      type: 'loading',
      message: `正在從雲端讀取分享內容 (?s=${shareParam})...`
    });

    fetchSharedConfig(shareParam)
      .then(({ config, meta }) => {
        if (cancelled) return;

        // 內容不包含簡報
        setSlides([]);
        setSlidesByMedia({});

        // 若分享內容包含當時版面配置，套用並儲存該版面（若無簡報則自動自版面移除簡報窗格）
        if (config.dockLayout) {
          const layoutToApply = (!config.slides || config.slides.length === 0)
            ? removePanelFromLayout(config.dockLayout, 'slides')
            : config.dockLayout;
          setDockLayout(layoutToApply);
          saveDockLayoutToStorage(layoutToApply);
        }

        // 若分享內容包含播放列顯隱狀態，同步套用
        if (typeof config.showPlayerBar === 'boolean') {
          setShowPlayerBar(config.showPlayerBar);
          try {
            localStorage.setItem('srtnote_show_player_bar', String(config.showPlayerBar));
          } catch {}
        }

        if (config.title) setProjectTitle(config.title);
        if (config.youtubeHistory && config.youtubeHistory.length > 0) {
          mergeSharedYouTubeLibrary(config.youtubeHistory);
        }
        if (config.subtitlesByMedia) setSubtitlesByMedia(config.subtitlesByMedia);
        if (Array.isArray(config.subtitles)) setSubtitles(config.subtitles);
        if (Array.isArray(config.playlistVideoIds)) setPlaylistQueue(config.playlistVideoIds);
        if (config.loopMode) setLoopMode(config.loopMode);
        if (typeof config.aiSummary === 'string') setAiSummary(config.aiSummary);
        if (typeof config.mindMapContent === 'string') setMindMapContent(config.mindMapContent);
        if (config.mediaDuration && config.mediaDuration > 0) {
          setDuration(config.mediaDuration);
        }

        const ytUrl =
          config.youtubeUrl ||
          (config.youtubeId ? `https://www.youtube.com/watch?v=${config.youtubeId}` : undefined) ||
          (config.youtubeHistory && config.youtubeHistory[0]?.url);

        if (ytUrl) {
          setMediaType('youtube');
          setMediaUrl(ytUrl);
        } else if (config.mediaType) {
          setMediaType(config.mediaType === 'youtube' ? 'audio' : config.mediaType);
          setMediaUrl(undefined);
        }

        setCurrentTime(0);
        setIsPlaying(false);

        const isHistory = config.shareMode === 'youtube_history';
        setSharedBanner({
          type: 'success',
          message: isHistory
            ? `已從 ${meta.providerName} 載入分享的 YouTube 影片紀錄（共 ${config.youtubeHistory?.length || 0} 部影片，已自動隱藏簡報視窗）`
            : `已從 ${meta.providerName} 載入分享專案「${config.title || '未命名'}」（已自動隱藏簡報視窗）`,
          rawUrl: meta.rawUrl,
          webViewUrl: meta.webViewUrl,
          isHistoryShare: isHistory
        });
      })
      .catch((err: any) => {
        if (cancelled) return;
        setSharedBanner({
          type: 'error',
          message: err.message || '讀取雲端分享連結失敗'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // --- LM Studio Config State ---
  const [lmConfig, setLmConfig] = useState<LMStudioConfig>(() => {
    const saved = localStorage.getItem('lm_studio_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_LM_STUDIO_CONFIG;
  });

  const handleSaveLMConfig = (newConfig: LMStudioConfig) => {
    setLmConfig(newConfig);
    localStorage.setItem('lm_studio_config', JSON.stringify(newConfig));
  };

  // Helper to safely revoke old object URLs
  const revokeMediaUrl = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
  };

  const revokeSlideUrls = (slideList: SlideItem[]) => {
    slideList.forEach((s) => {
      if (s.imageUrl && s.imageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(s.imageUrl);
        } catch (e) {}
      }
    });
  };

  // Cleanup object URLs on unmount
  const mediaUrlRef = useRef(mediaUrl);
  mediaUrlRef.current = mediaUrl;
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  useEffect(() => {
    return () => {
      revokeMediaUrl(mediaUrlRef.current);
      revokeSlideUrls(slidesRef.current);
    };
  }, []);

  // --- Audio Element Ref (for real sound when media file is attached) ---
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize or update audio playback
  useEffect(() => {
    if (mediaType === 'audio' && mediaUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(mediaUrl);
      } else {
        audioRef.current.src = mediaUrl;
      }

      const audio = audioRef.current;
      const onLoadedMeta = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };
      const onTime = () => setCurrentTime(audio.currentTime);
      const onEnd = () => {
        if (loopMode === 'single' || loopMode === 'all') {
          audio.currentTime = 0;
          audio.play().catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      };

      audio.addEventListener('loadedmetadata', onLoadedMeta);
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('ended', onEnd);

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', onLoadedMeta);
        audio.removeEventListener('timeupdate', onTime);
        audio.removeEventListener('ended', onEnd);
      };
    }
  }, [mediaUrl, mediaType, loopMode]);

  // Sync Audio Playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else if (!isPlaying && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, playbackRate, volume, isMuted]);

  // Simulated Timer Clock (runs if no real audio/video element is dictating time)
  useEffect(() => {
    let timer: number;
    if (isPlaying && !mediaUrl) {
      const stepMs = 100;
      timer = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + (stepMs / 1000) * playbackRate;
          if (next >= duration) {
            if (loopMode === 'single' || loopMode === 'all') {
              return 0;
            }
            setIsPlaying(false);
            return duration;
          }
          return next;
        });
      }, stepMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, mediaUrl, duration, playbackRate, loopMode]);

  // --- Play/Pause Toggle ---
  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  // --- Handle video / audio real duration change ---
  const handleDurationChange = (newDuration: number) => {
    if (newDuration && !isNaN(newDuration) && isFinite(newDuration) && newDuration > 0) {
      setDuration(Math.round(newDuration));
    }
  };

  // --- Seek to time ---
  const handleSeek = (newTime: number) => {
    const targetTime = Math.max(0, newTime);
    if (targetTime > duration) {
      setDuration(targetTime + 5);
    }
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // --- Compute current active Slide ---
  const autoSlideIndex = useMemo(() => {
    if (!slides || slides.length === 0) return 0;
    let foundIndex = 0;
    for (let i = 0; i < slides.length; i++) {
      if (currentTime >= slides[i].timestamp) {
        foundIndex = i;
      } else {
        break;
      }
    }
    return foundIndex;
  }, [slides, currentTime]);

  // Keep manualSlideIndex in sync with autoSlideIndex when sync is enabled
  useEffect(() => {
    if (isSlideSyncEnabled) {
      setManualSlideIndex(autoSlideIndex);
    }
  }, [isSlideSyncEnabled, autoSlideIndex]);

  const currentSlideIndex = isSlideSyncEnabled ? autoSlideIndex : manualSlideIndex;

  const handleSelectSlide = (idx: number) => {
    setManualSlideIndex(idx);
    if (isSlideSyncEnabled && slides[idx]) {
      handleSeek(slides[idx].timestamp);
    }
  };

  // --- Compute current active Subtitle ---
  const activeSubtitle = useMemo(() => {
    return subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
    );
  }, [subtitles, currentTime]);

  // Set current time for current slide timestamp
  const handleSyncSlideCurrentTime = () => {
    const currentSlide = slides[currentSlideIndex];
    if (currentSlide) {
      const updated = slides.map((s, idx) =>
        idx === currentSlideIndex ? { ...s, timestamp: Math.floor(currentTime) } : s
      );
      setSlides(updated);
      if (mediaType === 'youtube' && mediaUrl) {
        const vid = extractYouTubeId(mediaUrl);
        if (vid) {
          setSlidesByMedia((prev) => ({
            ...prev,
            [vid]: updated
          }));
        }
      }
    }
  };

  const handleUpdateSlides = (newSlides: SlideItem[]) => {
    setSlides(newSlides);
    if (mediaType === 'youtube' && mediaUrl) {
      const vid = extractYouTubeId(mediaUrl);
      if (vid) {
        setSlidesByMedia((prev) => ({
          ...prev,
          [vid]: newSlides
        }));
      }
    }
  };

  // --- Open Folder using File System Access API ---
  const handleOpenFolder = async () => {
    try {
      const data = await openDirectoryPicker();
      if (!data) return; // User cancelled

      setDirHandle(data.dirHandle);
      setFolderName(data.folderName);

      // If directory contains sync_config.json, restore everything from it
      if (data.config) {
        const c = data.config;
        if (c.title) setProjectTitle(c.title);
        if (c.subtitles) setSubtitles(c.subtitles);
        if (c.subtitlesByMedia) setSubtitlesByMedia(c.subtitlesByMedia);
        if (c.slides) setSlides(c.slides);
        if (c.slidesByMedia) setSlidesByMedia(c.slidesByMedia);
        if (c.aiSummary) setAiSummary(c.aiSummary);
        if (c.mindMapContent) setMindMapContent(c.mindMapContent);
        if (c.mediaDuration) setDuration(c.mediaDuration);
        if (c.dockLayout) {
          setDockLayout(c.dockLayout);
          saveDockLayoutToStorage(c.dockLayout);
        }
        if (typeof c.showPlayerBar === 'boolean') {
          setShowPlayerBar(c.showPlayerBar);
          try {
            localStorage.setItem('srtnote_show_player_bar', String(c.showPlayerBar));
          } catch {}
        }
      }

      // If media file detected in folder
      if (data.mediaUrl) {
        revokeMediaUrl(mediaUrl);
        setMediaUrl(data.mediaUrl);
        setMediaType(data.mediaType);
      }

      // If subtitles detected in folder
      let maxSubTime = 0;
      if (data.subtitles && data.subtitles.length > 0) {
        if (!data.config || !data.config.subtitles) {
          setSubtitles(data.subtitles);
        }
        // Auto-adapt duration to maximum subtitle timestamp
        maxSubTime = Math.max(...data.subtitles.map(s => s.endTime || s.startTime || 0));
        if (maxSubTime > 0 && (!data.config || !data.config.mediaDuration)) {
          setDuration(maxSubTime);
        }
      }

      // Determine effective duration for evenly distributing slides
      const effectiveDuration = data.config?.mediaDuration || maxSubTime || duration || 60;

      // If slide images detected in folder
      if (data.slideFiles.length > 0 && (!data.config || !data.config.slides)) {
        revokeSlideUrls(slides);
        const count = data.slideFiles.length;
        const step = count > 1 ? effectiveDuration / count : 0;
        const newSlides: SlideItem[] = data.slideFiles.map((sf, idx) => ({
          id: `slide_${idx + 1}`,
          pageNumber: sf.pageNumber,
          title: sf.name.replace(/\.[^/.]+$/, ''),
          timestamp: Math.round(idx * step),
          imageUrl: sf.url
        }));
        setSlides(newSlides);
      } else if (data.pdfFile && (!data.config || !data.config.slides)) {
        // If a PDF presentation is found in the folder
        try {
          setIsConvertingPdf(true);
          setPdfProgress('正在解析資料夾內的 PDF 簡報...');
          const pdfSlides = await convertPdfToSlides(
            data.pdfFile,
            data.pdfFile.name,
            effectiveDuration,
            (_cur, _tot, msg) => {
              setPdfProgress(msg);
            }
          );
          if (pdfSlides.length > 0) {
            setSlides(pdfSlides);
          }
        } catch (err: any) {
          console.error('Failed to parse folder PDF presentation:', err);
        } finally {
          setIsConvertingPdf(false);
          setPdfProgress('');
        }
      }

      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err: any) {
      alert(err.message || '無法開啟資料夾');
    }
  };

  // --- Save Project Configuration ---
  const handleSaveConfig = async () => {
    setIsSaving(true);
    const activeYtId = mediaType === 'youtube' && mediaUrl ? extractYouTubeId(mediaUrl) : null;
    const config: ProjectConfig = {
      version: '1.1.0',
      title: projectTitle,
      mediaType,
      youtubeUrl: mediaType === 'youtube' ? mediaUrl : undefined,
      youtubeId: activeYtId || undefined,
      mediaDuration: duration,
      subtitles,
      subtitlesByMedia: {
        ...subtitlesByMedia,
        ...(activeYtId ? { [activeYtId]: subtitles } : {})
      },
      slides,
      slidesByMedia: {
        ...slidesByMedia,
        ...(activeYtId ? { [activeYtId]: slides } : {})
      },
      playlistVideoIds: playlistQueue.length > 0 ? playlistQueue : undefined,
      loopMode,
      dockLayout,
      showPlayerBar,
      aiSummary,
      mindMapContent,
      aiKeyPoints: [],
      updatedAt: new Date().toISOString()
    };

    try {
      if (dirHandle) {
        await saveConfigToDirectory(dirHandle, config);
      } else {
        downloadConfigJSON(config, `${projectTitle || 'project'}_sync_config.json`);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('儲存設定檔失敗：' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // --- File Upload Handlers (Standard inputs) ---
  const handleUploadMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      revokeMediaUrl(mediaUrl);
      const url = URL.createObjectURL(file);
      const isVid = file.type.startsWith('video') || /\.(mp4|webm|mkv|mov)$/i.test(file.name);
      setMediaUrl(url);
      setMediaType(isVid ? 'video' : 'audio');
      setCurrentTime(0);
    }
  };

  // --- YouTube Loader Handler ---
  const handleLoadYouTube = (url: string, videoId: string, autoPlay: boolean = false) => {
    // Cache current subtitles and slides for previous YouTube video before switching
    if (mediaType === 'youtube' && mediaUrl) {
      const prevId = extractYouTubeId(mediaUrl);
      if (prevId) {
        setSubtitlesByMedia((prev) => ({
          ...prev,
          [prevId]: subtitles
        }));
        setSlidesByMedia((prev) => ({
          ...prev,
          [prevId]: slides
        }));
      }
    }

    revokeMediaUrl(mediaUrl);
    setMediaUrl(url);
    setMediaType('youtube');
    setIsPlaying(autoPlay);
    setCurrentTime(0);

    // Rule 1-A: If subtitles exist for new videoId, switch to them; else clear subtitles
    const existingSubs = subtitlesByMedia[videoId];
    if (existingSubs && existingSubs.length > 0) {
      setSubtitles(existingSubs);
      const maxSubTime = Math.max(...existingSubs.map((s) => s.endTime || s.startTime || 0));
      if (maxSubTime > 0) {
        setDuration((prev) => Math.max(prev, Math.ceil(maxSubTime + 3)));
      }
    } else {
      setSubtitles([]);
    }

    // Slide sync with media: If slides exist for new videoId, switch to them; else clear slides
    const existingSlides = slidesByMedia[videoId];
    if (existingSlides && existingSlides.length > 0) {
      setSlides(existingSlides);
    } else {
      setSlides([]);
    }

    if (projectTitle === SAMPLE_PROJECT.title || projectTitle.startsWith('YouTube:')) {
      setProjectTitle(`YouTube: ${videoId}`);
    }
  };

  // --- Playlist & Rotation Handlers ---
  const handleStartPlaylist = (videoIds: string[]) => {
    if (!videoIds || videoIds.length === 0) return;
    setPlaylistQueue(videoIds);
    playlistQueueRef.current = videoIds;
    setCurrentPlaylistIndex(0);
    currentPlaylistIndexRef.current = 0;
    const firstId = videoIds[0];
    handleLoadYouTube(`https://www.youtube.com/watch?v=${firstId}`, firstId, true);
  };

  // --- Playback Ended Handler (Single Loop vs All Loop vs Next in Playlist) ---
  const handleEnded = () => {
    const queue = playlistQueueRef.current;
    const curIdx = currentPlaylistIndexRef.current;
    const curLoop = loopModeRef.current;

    if (curLoop === 'single') {
      handleSeek(timeRange.enabled ? timeRange.start : 0);
      setIsPlaying(true);
      return;
    }

    // If there is an active playlist, seamlessly advance and autoplay next video
    if (queue.length > 0) {
      const nextIndex = curIdx + 1;
      if (nextIndex < queue.length) {
        setCurrentPlaylistIndex(nextIndex);
        currentPlaylistIndexRef.current = nextIndex;
        const nextId = queue[nextIndex];
        handleLoadYouTube(`https://www.youtube.com/watch?v=${nextId}`, nextId, true);
        return;
      } else if (curLoop === 'all') {
        // Loop back to beginning of playlist and autoplay
        setCurrentPlaylistIndex(0);
        currentPlaylistIndexRef.current = 0;
        const firstId = queue[0];
        handleLoadYouTube(`https://www.youtube.com/watch?v=${firstId}`, firstId, true);
        return;
      }
    } else if (curLoop === 'all') {
      handleSeek(timeRange.enabled ? timeRange.start : 0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying(false);
  };

  // --- Toggle Loop Mode (Order B: off -> single -> all -> off) ---
  const handleToggleLoopMode = () => {
    setLoopMode((prev) => {
      if (prev === 'off') return 'single';
      if (prev === 'single') return 'all';
      return 'off';
    });
  };

  // --- Pasted Transcript Handler ---
  const handleImportPastedSubtitles = (newSubs: SubtitleItem[], append: boolean) => {
    const updatedSubs = append ? [...subtitles, ...newSubs] : newSubs;
    setSubtitles(updatedSubs);
    if (mediaType === 'youtube' && mediaUrl) {
      const vid = extractYouTubeId(mediaUrl);
      if (vid) {
        setSubtitlesByMedia((prev) => ({
          ...prev,
          [vid]: updatedSubs
        }));
      }
    }
    const maxSubTime = Math.max(...newSubs.map((s) => s.endTime || s.startTime || 0));
    if (maxSubTime > 0) {
      setDuration((prev) => Math.max(prev, Math.ceil(maxSubTime + 3)));
    }
  };

  const handleUpdateSubtitles = (newSubs: SubtitleItem[]) => {
    setSubtitles(newSubs);
    if (mediaType === 'youtube' && mediaUrl) {
      const vid = extractYouTubeId(mediaUrl);
      if (vid) {
        setSubtitlesByMedia((prev) => ({
          ...prev,
          [vid]: newSubs
        }));
      }
    }
  };

  const handleUploadSubtitles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const parsed = parseSubtitleContent(text);
          if (parsed.length > 0) {
            setSubtitles(parsed);
            if (mediaType === 'youtube' && mediaUrl) {
              const vid = extractYouTubeId(mediaUrl);
              if (vid) {
                setSubtitlesByMedia((prev) => ({
                  ...prev,
                  [vid]: parsed
                }));
              }
            }
            const maxSubTime = Math.max(...parsed.map(s => s.endTime || s.startTime || 0));
            if (maxSubTime > 0) {
              setDuration(prev => Math.max(prev, maxSubTime));
            }
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const processSlideFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const effectiveDuration = duration > 0 ? duration : 60;

    // Check if user provided a PDF presentation
    const pdfFile = fileList.find(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfFile) {
      try {
        setIsConvertingPdf(true);
        setPdfProgress('正在載入 PDF 簡報檔案...');
        const pdfSlides = await convertPdfToSlides(
          pdfFile,
          pdfFile.name,
          effectiveDuration,
          (_cur, _tot, msg) => {
            setPdfProgress(msg);
          }
        );
        if (pdfSlides.length > 0) {
          revokeSlideUrls(slides);
          setSlides(pdfSlides);
          if (mediaType === 'youtube' && mediaUrl) {
            const vid = extractYouTubeId(mediaUrl);
            if (vid) {
              setSlidesByMedia((prev) => ({
                ...prev,
                [vid]: pdfSlides
              }));
            }
          }
        }
      } catch (err: any) {
        alert(err.message || 'PDF 解析失敗');
      } finally {
        setIsConvertingPdf(false);
        setPdfProgress('');
      }
      return;
    }

    // Filter image files
    const imgFiles = fileList.filter((f) => f.type.startsWith('image/'));
    if (imgFiles.length > 0) {
      revokeSlideUrls(slides);
      imgFiles.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      const count = imgFiles.length;
      const step = count > 1 ? effectiveDuration / count : 0;
      const newSlides: SlideItem[] = imgFiles.map((f, idx) => ({
        id: `slide_${Date.now()}_${idx}`,
        pageNumber: idx + 1,
        title: f.name.replace(/\.[^/.]+$/, ''),
        timestamp: Math.round(idx * step),
        imageUrl: URL.createObjectURL(f)
      }));
      setSlides(newSlides);
      if (mediaType === 'youtube' && mediaUrl) {
        const vid = extractYouTubeId(mediaUrl);
        if (vid) {
          setSlidesByMedia((prev) => ({
            ...prev,
            [vid]: newSlides
          }));
        }
      }
    } else {
      alert('請上傳 PDF 簡報檔案或投影片圖片 (PNG, JPG, WebP)');
    }
  };

  const handleUploadSlides = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSlideFiles(e.target.files);
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed: ProjectConfig = JSON.parse(event.target?.result as string);
          if (parsed.title) setProjectTitle(parsed.title);
          if (parsed.youtubeHistory && parsed.youtubeHistory.length > 0) {
            mergeSharedYouTubeLibrary(parsed.youtubeHistory);
          }
          if (parsed.subtitles) setSubtitles(parsed.subtitles);
          if (parsed.subtitlesByMedia) setSubtitlesByMedia(parsed.subtitlesByMedia);
          if (parsed.playlistVideoIds) setPlaylistQueue(parsed.playlistVideoIds);
          if (parsed.loopMode) setLoopMode(parsed.loopMode);
          if (parsed.mediaType) setMediaType(parsed.mediaType);
          if (parsed.mediaType === 'youtube' && parsed.youtubeUrl) {
            setMediaUrl(parsed.youtubeUrl);
          }
          if (parsed.slides) {
            revokeSlideUrls(slides);
            setSlides(parsed.slides);
          }
          if (parsed.slidesByMedia) setSlidesByMedia(parsed.slidesByMedia);
          if (parsed.aiSummary) setAiSummary(parsed.aiSummary);
          if (parsed.mindMapContent) setMindMapContent(parsed.mindMapContent);
          if (parsed.mediaDuration) setDuration(parsed.mediaDuration);
        } catch (err) {
          alert('設定檔格式不符合 JSON 規範');
        }
      };
      reader.readAsText(file);
    }
  };

  // --- Reset to Demo Project ---
  const handleLoadDemoProject = () => {
    revokeMediaUrl(mediaUrl);
    revokeSlideUrls(slides);
    setProjectTitle(SAMPLE_PROJECT.title);
    setMediaUrl(undefined);
    setMediaType('audio');
    setSubtitles(SAMPLE_PROJECT.subtitles);
    setSubtitlesByMedia({});
    setPlaylistQueue([]);
    setCurrentPlaylistIndex(0);
    setLoopMode('off');
    setSlides(SAMPLE_PROJECT.slides);
    setSlidesByMedia({});
    setIsSlideSyncEnabled(true);
    setAiSummary(SAMPLE_PROJECT.aiSummary);
    setMindMapContent(SAMPLE_PROJECT.mindMapContent || '');
    setDuration(SAMPLE_PROJECT.mediaDuration);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // --- Layout Handlers ---
  const handleSwapPanels = (idA: PanelId, idB: PanelId) => {
    if (isMobileMode) {
      setMobilePanels((prev) => {
        const copy = [...prev];
        const idxA = copy.indexOf(idA);
        const idxB = copy.indexOf(idB);
        if (idxA !== -1 && idxB !== -1) {
          const temp = copy[idxA];
          copy[idxA] = copy[idxB];
          copy[idxB] = temp;
        }
        return copy;
      });
    }
  };

  const handleClosePanel = (panelId: PanelId) => {
    if (isMobileMode) {
      setMobilePanels((prev) => prev.filter((id) => id !== panelId));
    } else {
      setDockLayout((prev) => {
        const next = removePanelFromLayout(prev, panelId);
        saveDockLayoutToStorage(next);
        return next;
      });
    }
    if (activeMaximizedPanel === panelId) {
      setActiveMaximizedPanel(null);
    }
  };

  const handleOpenPanel = (panelId: PanelId) => {
    if (isMobileMode) {
      setMobilePanels((prev) => (prev.includes(panelId) ? prev : [...prev, panelId]));
    } else {
      setDockLayout((prev) => {
        const next = addOrFocusPanel(prev, panelId);
        saveDockLayoutToStorage(next);
        return next;
      });
    }
  };

  const handleTogglePanel = (panelId: PanelId) => {
    if (openPanels.includes(panelId)) {
      handleClosePanel(panelId);
    } else {
      handleOpenPanel(panelId);
    }
  };

  const handleOpenAllPanels = () => {
    if (isMobileMode) {
      setMobilePanels(['video', 'slides', 'transcript', 'summary', 'mindmap']);
    } else {
      setDockLayout((prev) => {
        let next = { ...prev };
        ALL_PANELS.forEach((p) => {
          next = addOrFocusPanel(next, p);
        });
        saveDockLayoutToStorage(next);
        return next;
      });
    }
  };

  const handleResetLayout = () => {
    if (isMobileMode) {
      setMobilePanels(['video', 'transcript']);
      setActiveMaximizedPanel(null);
    } else {
      const defaultLayout = getDefaultDockLayout();
      setDockLayout(defaultLayout);
      saveDockLayoutToStorage(defaultLayout);
      setActiveMaximizedPanel(null);
    }
  };

  const handleSelectPreset = (presetKey: DockLayoutPreset) => {
    const presetConfig = JSON.parse(JSON.stringify(DOCK_LAYOUT_PRESETS[presetKey].config));
    setDockLayout(presetConfig);
    saveDockLayoutToStorage(presetConfig);
    setActiveMaximizedPanel(null);
  };

  const handleDockLayoutChange = (newLayout: DockLayoutConfig) => {
    setDockLayout(newLayout);
    saveDockLayoutToStorage(newLayout);
  };

  const toggleMaximizePanel = (panelId: PanelId | null) => {
    setActiveMaximizedPanel((prev) => (prev === panelId ? null : panelId));
  };

  // --- Render Panel by ID ---
  const renderPanel = (panelId: PanelId) => {
    switch (panelId) {
      case 'video':
        return (
          <VideoPanel
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            volume={volume}
            isMuted={isMuted}
            loopMode={loopMode}
            onToggleLoopMode={handleToggleLoopMode}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onDurationChange={handleDurationChange}
            onEnded={handleEnded}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onToggleMute={() => setIsMuted(!isMuted)}
            isMaximized={activeMaximizedPanel === 'video'}
            onToggleMaximize={() => toggleMaximizePanel('video')}
            onClose={() => handleClosePanel('video')}
            currentSpeaker={activeSubtitle?.speaker}
            currentSubtitleText={activeSubtitle?.text}
            onUploadMedia={handleUploadMedia}
            onOpenYouTubeModal={() => setIsYouTubeModalOpen(true)}
          />
        );

      case 'slides':
        return (
          <SlidePanel
            slides={slides}
            currentSlideIndex={currentSlideIndex}
            currentTime={currentTime}
            onSelectSlide={handleSelectSlide}
            onSyncCurrentTime={handleSyncSlideCurrentTime}
            onOpenTimelineModal={() => setIsSlideModalOpen(true)}
            isMaximized={activeMaximizedPanel === 'slides'}
            onToggleMaximize={() => toggleMaximizePanel('slides')}
            onClose={() => handleClosePanel('slides')}
            onUploadSlides={handleUploadSlides}
            isConvertingPdf={isConvertingPdf}
            pdfProgress={pdfProgress}
            onDropFiles={processSlideFiles}
            isSlideSyncEnabled={isSlideSyncEnabled}
            onToggleSlideSync={() => setIsSlideSyncEnabled((prev) => !prev)}
            currentMediaId={mediaType === 'youtube' && mediaUrl ? extractYouTubeId(mediaUrl) || undefined : undefined}
          />
        );

      case 'transcript':
        return (
          <TranscriptPanel
            subtitles={subtitles}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateSubtitles={handleUpdateSubtitles}
            isMaximized={activeMaximizedPanel === 'transcript'}
            onToggleMaximize={() => toggleMaximizePanel('transcript')}
            onClose={() => handleClosePanel('transcript')}
            onUploadSubtitles={handleUploadSubtitles}
            onOpenPasteModal={() => setIsPasteTranscriptModalOpen(true)}
            currentMediaId={mediaType === 'youtube' && mediaUrl ? extractYouTubeId(mediaUrl) || undefined : undefined}
            theme={theme}
          />
        );

      case 'summary':
        return (
          <AISummaryPanel
            summary={aiSummary}
            subtitles={subtitles}
            lmConfig={lmConfig}
            currentTime={currentTime}
            duration={duration}
            timeRange={timeRange}
            onUpdateTimeRange={setTimeRange}
            onUpdateSummary={setAiSummary}
            onSeek={handleSeek}
            onOpenLMConfig={() => setIsLMModalOpen(true)}
            onUpdateLMConfig={handleSaveLMConfig}
            isMaximized={activeMaximizedPanel === 'summary'}
            onToggleMaximize={() => toggleMaximizePanel('summary')}
            onClose={() => handleClosePanel('summary')}
          />
        );

      case 'mindmap':
        return (
          <MindMapPanel
            mindMapContent={mindMapContent}
            projectTitle={projectTitle}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateMindMap={setMindMapContent}
            isMaximized={activeMaximizedPanel === 'mindmap'}
            onToggleMaximize={() => toggleMaximizePanel('mindmap')}
            onClose={() => handleClosePanel('mindmap')}
            theme={theme}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Navbar */}
      <Navbar
        projectTitle={projectTitle}
        folderName={folderName}
        hasDirHandle={!!dirHandle}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        openPanels={openPanels}
        panelPositions={panelPositions}
        onUpdateTitle={setProjectTitle}
        onOpenFolder={handleOpenFolder}
        onSaveConfig={handleSaveConfig}
        onOpenLMConfig={() => setIsLMModalOpen(true)}
        onLoadDemoProject={handleLoadDemoProject}
        onResetLayout={handleResetLayout}
        onTogglePanel={handleTogglePanel}
        onOpenAllPanels={handleOpenAllPanels}
        onSwapPanels={handleSwapPanels}
        onUploadMedia={handleUploadMedia}
        onUploadSubtitles={handleUploadSubtitles}
        onUploadSlides={handleUploadSlides}
        onImportConfig={handleImportConfig}
        onOpenYouTubeModal={() => setIsYouTubeModalOpen(true)}
        onOpenPasteModal={() => setIsPasteTranscriptModalOpen(true)}
        onOpenShareModal={() => handleOpenShareModal('current_note')}
        isMobileMode={isMobileMode}
        onToggleMobileMode={handleToggleMobileMode}
        onSelectPreset={handleSelectPreset}
        showPlayerBar={showPlayerBar}
        onTogglePlayerBar={handleTogglePlayerBar}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
      />

      {/* Cloud Share Status Banner */}
      {sharedBanner && (
        <div
          className={`px-4 py-2 border-b text-xs flex items-center justify-between gap-3 flex-shrink-0 animate-fade-in ${
            sharedBanner.type === 'loading'
              ? 'bg-blue-950/80 border-blue-800/80 text-blue-200'
              : sharedBanner.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800/70 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {sharedBanner.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-blue-400 flex-shrink-0" />}
            {sharedBanner.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {sharedBanner.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            <span className="truncate font-medium">{sharedBanner.message}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {sharedBanner.isHistoryShare && (
              <button
                type="button"
                onClick={() => setIsYouTubeModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] transition-colors shadow-sm"
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>開啟影片紀錄清單</span>
              </button>
            )}
            {sharedBanner.rawUrl && (
              <a
                href={sharedBanner.rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono transition-colors"
                title="檢視雲端伺服器上的原始 JSON 檔案"
              >
                <span>原始 JSON</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setSharedBanner(null)}
              className="p-1 rounded hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
              title="關閉提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Resizable Workspace (Desktop Grid or Mobile Top/Bottom Panes) */}
      <main className="flex-1 w-full min-h-0 relative">
        {isMobileMode ? (
          <MobileWorkspaceGrid
            openPanels={openPanels}
            activeMaximizedPanel={activeMaximizedPanel}
            renderPanel={renderPanel}
            onToggleMaximize={toggleMaximizePanel}
            onClosePanel={handleClosePanel}
            onReopenPanel={handleOpenPanel}
            onResetLayout={handleResetLayout}
          />
        ) : (
          <WorkspaceGrid
            layout={dockLayout}
            onChangeLayout={handleDockLayoutChange}
            renderPanel={renderPanel}
            activeMaximizedPanel={activeMaximizedPanel}
            onToggleMaximizePanel={toggleMaximizePanel}
            onResetLayout={handleResetLayout}
            onSelectPreset={handleSelectPreset}
            openPanels={openPanels}
            onSwapPanels={handleSwapPanels}
            onReopenPanel={handleOpenPanel}
            lang={lang}
          />
        )}
      </main>

      {/* 3. Bottom Master Playback Bar (Hidden when collapsed or in mobile mode with video) */}
      {showPlayerBar && (!isMobileMode || mediaType === 'audio') && (
        <footer className="w-full px-2 sm:px-4 pb-1.5 sm:pb-2 pt-0.5 flex-shrink-0 animate-fade-in">
          <PlayerBar
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            volume={volume}
            isMuted={isMuted}
            loopMode={loopMode}
            onToggleLoop={handleToggleLoopMode}
            slides={slides}
            subtitles={subtitles}
            mediaUrl={mediaUrl}
            timeRange={timeRange}
            onUpdateTimeRange={setTimeRange}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onChangePlaybackRate={setPlaybackRate}
            onChangeVolume={setVolume}
            onToggleMute={() => setIsMuted(!isMuted)}
            isMobile={isMobileMode}
            onToggleCollapse={handleTogglePlayerBar}
            lang={lang}
          />
        </footer>
      )}

      {/* 4. LM Studio Modal */}
      <LMStudioModal
        isOpen={isLMModalOpen}
        onClose={() => setIsLMModalOpen(false)}
        config={lmConfig}
        onSave={handleSaveLMConfig}
      />

      {/* 5. Slide Timeline Modal */}
      <SlideTimelineModal
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
        slides={slides}
        currentTime={currentTime}
        duration={duration}
        onUpdateSlides={handleUpdateSlides}
        onSeek={handleSeek}
      />

      {/* 6. YouTube Modal */}
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onLoadYouTube={handleLoadYouTube}
        currentVideoId={mediaType === 'youtube' && mediaUrl ? extractYouTubeId(mediaUrl) || undefined : undefined}
        playlistQueue={playlistQueue}
        onStartPlaylist={handleStartPlaylist}
        subtitlesByMedia={subtitlesByMedia}
        slidesByMedia={slidesByMedia}
        onOpenShareHistory={() => handleOpenShareModal('youtube_history')}
      />

      {/* 7. Paste Transcript Modal */}
      <PasteTranscriptModal
        isOpen={isPasteTranscriptModalOpen}
        onClose={() => setIsPasteTranscriptModalOpen(false)}
        onImportSubtitles={handleImportPastedSubtitles}
        defaultDuration={duration}
      />

      {/* 8. Cloud Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        initialMode={shareModalInitialMode}
        projectTitle={projectTitle}
        mediaType={mediaType}
        mediaUrl={mediaUrl}
        duration={duration}
        subtitles={subtitles}
        subtitlesByMedia={subtitlesByMedia}
        playlistQueue={playlistQueue}
        loopMode={loopMode}
        dockLayout={dockLayout}
        showPlayerBar={showPlayerBar}
        aiSummary={aiSummary}
        mindMapContent={mindMapContent}
      />
    </div>
  );
}
