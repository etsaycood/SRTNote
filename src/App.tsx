import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PanelId, LayoutPreset, SubtitleItem, SlideItem, ProjectConfig, LMStudioConfig, TimeRange, MediaType } from './types';
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
import { VideoPanel } from './components/panels/VideoPanel';
import { SlidePanel } from './components/panels/SlidePanel';
import { TranscriptPanel } from './components/panels/TranscriptPanel';
import { AISummaryPanel } from './components/panels/AISummaryPanel';
import { LMStudioModal } from './components/LMStudioModal';
import { SlideTimelineModal } from './components/SlideTimelineModal';
import { YouTubeModal } from './components/YouTubeModal';
import { PasteTranscriptModal } from './components/PasteTranscriptModal';

export default function App() {
  // --- Project State ---
  const [projectTitle, setProjectTitle] = useState(SAMPLE_PROJECT.title);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<MediaType>('audio');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>(SAMPLE_PROJECT.subtitles);
  const [slides, setSlides] = useState<SlideItem[]>(SAMPLE_PROJECT.slides);
  const [aiSummary, setAiSummary] = useState<string>(SAMPLE_PROJECT.aiSummary);

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
  const [isLooping, setIsLooping] = useState(false);

  // --- Selected A-B Time Range State ---
  const [timeRange, setTimeRange] = useState<TimeRange>({
    enabled: false,
    start: 0,
    end: 1800
  });

  // --- Panel Layout & Open State ---
  // Default positions: [TopLeft, TopRight, BottomLeft, BottomRight]
  const [panelPositions, setPanelPositions] = useState<PanelId[]>([
    'video',
    'slides',
    'transcript',
    'summary'
  ]);
  const [openPanels, setOpenPanels] = useState<PanelId[]>([
    'video',
    'slides',
    'transcript',
    'summary'
  ]);
  const [activeMaximizedPanel, setActiveMaximizedPanel] = useState<PanelId | null>(null);

  // --- Modals State ---
  const [isLMModalOpen, setIsLMModalOpen] = useState(false);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isPasteTranscriptModalOpen, setIsPasteTranscriptModalOpen] = useState(false);

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
        if (isLooping) {
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
  }, [mediaUrl, mediaType, isLooping]);

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
            if (isLooping) {
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
  }, [isPlaying, mediaUrl, duration, playbackRate, isLooping]);

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
  const currentSlideIndex = useMemo(() => {
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
        if (c.slides) setSlides(c.slides);
        if (c.aiSummary) setAiSummary(c.aiSummary);
        if (c.mediaDuration) setDuration(c.mediaDuration);
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
    const config: ProjectConfig = {
      version: '1.0.0',
      title: projectTitle,
      mediaType,
      youtubeUrl: mediaType === 'youtube' ? mediaUrl : undefined,
      mediaDuration: duration,
      subtitles,
      slides,
      aiSummary,
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
  const handleLoadYouTube = (url: string, videoId: string) => {
    revokeMediaUrl(mediaUrl);
    setMediaUrl(url);
    setMediaType('youtube');
    setIsPlaying(false);
    setCurrentTime(0);
    if (projectTitle === SAMPLE_PROJECT.title) {
      setProjectTitle(`YouTube: ${videoId}`);
    }
  };

  // --- Pasted Transcript Handler ---
  const handleImportPastedSubtitles = (newSubs: SubtitleItem[], append: boolean) => {
    if (append) {
      setSubtitles((prev) => [...prev, ...newSubs]);
    } else {
      setSubtitles(newSubs);
    }
    const maxSubTime = Math.max(...newSubs.map((s) => s.endTime || s.startTime || 0));
    if (maxSubTime > 0) {
      setDuration((prev) => Math.max(prev, Math.ceil(maxSubTime + 3)));
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
          if (parsed.subtitles) setSubtitles(parsed.subtitles);
          if (parsed.mediaType) setMediaType(parsed.mediaType);
          if (parsed.mediaType === 'youtube' && parsed.youtubeUrl) {
            setMediaUrl(parsed.youtubeUrl);
          }
          if (parsed.slides) {
            revokeSlideUrls(slides);
            setSlides(parsed.slides);
          }
          if (parsed.aiSummary) setAiSummary(parsed.aiSummary);
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
    setSlides(SAMPLE_PROJECT.slides);
    setAiSummary(SAMPLE_PROJECT.aiSummary);
    setDuration(SAMPLE_PROJECT.mediaDuration);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // --- Layout Handlers ---
  const handleSwapPanels = (idA: PanelId, idB: PanelId) => {
    setOpenPanels((prev) => {
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
    setPanelPositions((prev) => {
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
  };

  const handleClosePanel = (panelId: PanelId) => {
    setOpenPanels((prev) => prev.filter((id) => id !== panelId));
    if (activeMaximizedPanel === panelId) {
      setActiveMaximizedPanel(null);
    }
  };

  const handleOpenPanel = (panelId: PanelId) => {
    setOpenPanels((prev) => {
      if (prev.includes(panelId)) return prev;
      return [...prev, panelId];
    });
  };

  const handleTogglePanel = (panelId: PanelId) => {
    if (openPanels.includes(panelId)) {
      handleClosePanel(panelId);
    } else {
      handleOpenPanel(panelId);
    }
  };

  const handleOpenAllPanels = () => {
    const all: PanelId[] = ['video', 'slides', 'transcript', 'summary'];
    setOpenPanels(all);
    setPanelPositions(all);
  };

  const handleResetLayout = () => {
    const all: PanelId[] = ['video', 'slides', 'transcript', 'summary'];
    setOpenPanels(all);
    setPanelPositions(all);
    setActiveMaximizedPanel(null);
  };

  const toggleMaximizePanel = (panelId: PanelId) => {
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
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping((prev) => !prev)}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onDurationChange={handleDurationChange}
            onEnded={() => {
              if (isLooping) {
                handleSeek(timeRange.enabled ? timeRange.start : 0);
                setIsPlaying(true);
              } else {
                setIsPlaying(false);
              }
            }}
            onPlayPause={handlePlayPause}
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
            onSelectSlide={(idx) => {
              if (slides[idx]) handleSeek(slides[idx].timestamp);
            }}
            onSyncCurrentTime={handleSyncSlideCurrentTime}
            onOpenTimelineModal={() => setIsSlideModalOpen(true)}
            isMaximized={activeMaximizedPanel === 'slides'}
            onToggleMaximize={() => toggleMaximizePanel('slides')}
            onClose={() => handleClosePanel('slides')}
            onUploadSlides={handleUploadSlides}
            isConvertingPdf={isConvertingPdf}
            pdfProgress={pdfProgress}
            onDropFiles={processSlideFiles}
          />
        );

      case 'transcript':
        return (
          <TranscriptPanel
            subtitles={subtitles}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateSubtitles={setSubtitles}
            isMaximized={activeMaximizedPanel === 'transcript'}
            onToggleMaximize={() => toggleMaximizePanel('transcript')}
            onClose={() => handleClosePanel('transcript')}
            onUploadSubtitles={handleUploadSubtitles}
            onOpenPasteModal={() => setIsPasteTranscriptModalOpen(true)}
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
      />

      {/* 2. Main Resizable Workspace (Supports 0, 1, 2, 3, 4 panels) */}
      <main className="flex-1 w-full min-h-0 relative">
        <WorkspaceGrid
          openPanels={openPanels}
          activeMaximizedPanel={activeMaximizedPanel}
          onSwapPanels={handleSwapPanels}
          renderPanel={renderPanel}
          onReopenPanel={handleOpenPanel}
          onResetLayout={handleResetLayout}
        />
      </main>

      {/* 3. Bottom Master Playback Bar */}
      <footer className="w-full px-4 pb-3 pt-1 flex-shrink-0">
        <PlayerBar
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          volume={volume}
          isMuted={isMuted}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping((prev) => !prev)}
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
        />
      </footer>

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
        onUpdateSlides={setSlides}
        onSeek={handleSeek}
      />

      {/* 6. YouTube Modal */}
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onLoadYouTube={handleLoadYouTube}
      />

      {/* 7. Paste Transcript Modal */}
      <PasteTranscriptModal
        isOpen={isPasteTranscriptModalOpen}
        onClose={() => setIsPasteTranscriptModalOpen(false)}
        onImportSubtitles={handleImportPastedSubtitles}
        defaultDuration={duration}
      />
    </div>
  );
}
