import React, { useRef, useEffect, useState } from 'react';
import { MediaType } from '../../types';
import { extractYouTubeId, loadYouTubeIframeAPI } from '../../utils/youtubeHelper';
import { Video, Mic, Maximize2, Minimize2, X, Upload, GripVertical, Link as LinkIcon, Repeat } from 'lucide-react';
import { YoutubeIcon } from '../icons/YoutubeIcon';

interface VideoPanelProps {
  mediaUrl?: string;
  mediaType: MediaType;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate?: number;
  volume?: number;
  isMuted?: boolean;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded: () => void;
  onPlayPause: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onClose?: () => void;
  currentSpeaker?: string;
  currentSubtitleText?: string;
  onUploadMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenYouTubeModal?: () => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  mediaUrl,
  mediaType,
  isPlaying,
  currentTime,
  duration,
  playbackRate = 1,
  volume = 1,
  isMuted = false,
  isLooping = false,
  onToggleLoop,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onPlayPause,
  isMaximized,
  onToggleMaximize,
  onClose,
  currentSpeaker,
  currentSubtitleText,
  onUploadMedia,
  onOpenYouTubeModal
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const [ytError, setYtError] = useState<string | null>(null);

  const youtubeVideoId = mediaType === 'youtube' ? extractYouTubeId(mediaUrl || '') : null;

  // Initialize or reload YouTube player when mediaType is 'youtube' and videoId changes
  useEffect(() => {
    if (mediaType !== 'youtube' || !youtubeVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        isYtReadyRef.current = false;
      }
      return;
    }

    let isMounted = true;
    setYtError(null);

    loadYouTubeIframeAPI().then((YT) => {
      if (!isMounted || !youtubeContainerRef.current) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }

      ytPlayerRef.current = new YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            isYtReadyRef.current = true;
            try {
              const d = event.target.getDuration();
              if (d && d > 0 && Math.abs(d - duration) > 1) {
                onDurationChange?.(d);
              }
              event.target.setVolume(isMuted ? 0 : volume * 100);
              event.target.setPlaybackRate(playbackRate);
            } catch (e) {}
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0
            if (event.data === 1 && !isPlaying) {
              onPlayPause();
            } else if (event.data === 2 && isPlaying) {
              onPlayPause();
            } else if (event.data === 0) {
              if (isLooping) {
                try {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } catch (e) {}
              }
              onEnded();
            }
          },
          onError: () => {
            if (isMounted) {
              setYtError('無法播放此 YouTube 影片（可能是私人影片、版權限制或禁止嵌入）');
            }
          }
        }
      });
    }).catch(() => {
      if (isMounted) {
        setYtError('無法載入 YouTube 播放器 API，請檢查網路連線');
      }
    });

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        isYtReadyRef.current = false;
      }
    };
  }, [mediaType, youtubeVideoId]);

  // Sync external currentTime with video element or YouTube player
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
        videoRef.current.currentTime = currentTime;
      }
    } else if (mediaType === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        const curYtTime = ytPlayerRef.current.getCurrentTime();
        if (Math.abs(curYtTime - currentTime) > 0.6) {
          ytPlayerRef.current.seekTo(currentTime, true);
        }
      } catch (e) {}
    }
  }, [currentTime, mediaType]);

  // Sync play/pause with video element or YouTube player
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else if (mediaType === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (isPlaying && state !== 1 && state !== 3) {
          ytPlayerRef.current.playVideo();
        } else if (!isPlaying && state === 1) {
          ytPlayerRef.current.pauseVideo();
        }
      } catch (e) {}
    }
  }, [isPlaying, mediaType]);

  // Sync playback rate, volume, muted with video element or YouTube player
  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    } else if (mediaType === 'youtube' && ytPlayerRef.current && isYtReadyRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(playbackRate);
        ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
        if (isMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch (e) {}
    }
  }, [playbackRate, volume, isMuted, mediaType]);

  // Regular polling when YouTube is playing to update SyncNote global currentTime & duration
  useEffect(() => {
    if (mediaType !== 'youtube' || !isPlaying) return;

    const timer = setInterval(() => {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            onTimeUpdate(t);
          }
          const d = ytPlayerRef.current.getDuration();
          if (d && typeof d === 'number' && !isNaN(d) && Math.abs(d - duration) > 1) {
            onDurationChange?.(d);
          }
        } catch (e) {}
      }
    }, 120);

    return () => clearInterval(timer);
  }, [mediaType, isPlaying, duration, onTimeUpdate, onDurationChange]);

  // When mediaUrl changes for video element, reload
  useEffect(() => {
    if (videoRef.current && mediaType === 'video' && mediaUrl) {
      videoRef.current.load();
    }
  }, [mediaUrl, mediaType]);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Audio Spectrum visualizer canvas animation when playing pure audio or demo
  useEffect(() => {
    if (mediaType === 'video' || mediaType === 'youtube') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      const barCount = 48;
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;
      const curTime = currentTimeRef.current;

      for (let i = 0; i < barCount; i++) {
        const t = (curTime * 4) + (i * 0.2) + phase;
        const amplitude = isPlaying ? (Math.sin(t) * 0.4 + Math.cos(t * 1.5) * 0.3 + 0.4) : 0.08;
        const barHeight = Math.max(6, amplitude * (height * 0.65));

        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#6366f1');
        gradient.addColorStop(1, '#a855f7');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.05;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, mediaType]);

  const handleVideoMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const vid = e.currentTarget;
    if (vid.duration && !isNaN(vid.duration) && isFinite(vid.duration)) {
      onDurationChange?.(vid.duration);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg">
      {/* Top Header Badge & Controls (Grouped together next to title) */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-md">
          <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
            <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </span>
          {mediaType === 'youtube' ? (
            <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
          ) : mediaType === 'video' && mediaUrl ? (
            <Video className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-xs font-bold tracking-wider text-slate-200">
            {mediaType === 'youtube'
              ? 'YouTube 影音'
              : mediaType === 'video' && mediaUrl
              ? '視訊畫面'
              : '語音頻譜'}
          </span>
          {isPlaying && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Panel Action Buttons: Positioned directly next to title */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md">
          {/* Repeat / Loop Playback Button */}
          {onToggleLoop && (
            <button
              onClick={onToggleLoop}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                isLooping
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isLooping ? '重複播放：已開啟 (單曲循環)' : '重複播放：未開啟 (點擊開啟循環)'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          )}

          {/* YouTube Link Button */}
          {onOpenYouTubeModal && (
            <button
              onClick={onOpenYouTubeModal}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors flex items-center justify-center"
              title="貼上 YouTube 影片網址"
            >
              <YoutubeIcon className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Local Upload */}
          <label className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors" title="上傳或替換本機影音檔">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept="video/*,audio/*" onChange={onUploadMedia} className="hidden" />
          </label>

          <button
            onClick={onToggleMaximize}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMaximized ? '還原視窗' : '最大化視窗'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
              title="關閉此面板（可由右上角加回）"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
        {mediaType === 'youtube' && youtubeVideoId ? (
          /* YouTube Player View */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {ytError ? (
              <div className="text-center p-6 text-xs text-rose-300 max-w-sm">
                <p className="font-semibold mb-2">{ytError}</p>
                <button
                  onClick={onOpenYouTubeModal}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  更換其他 YouTube 網址
                </button>
              </div>
            ) : (
              <div ref={youtubeContainerRef} className="w-full h-full" />
            )}
          </div>
        ) : mediaType === 'video' && mediaUrl ? (
          /* Local Video View */
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onPlayPause}
            onLoadedMetadata={handleVideoMetadataLoaded}
            onDurationChange={handleVideoMetadataLoaded}
            onTimeUpdate={(e) => {
              onTimeUpdate(e.currentTarget.currentTime);
              const d = e.currentTarget.duration;
              if (d && !isNaN(d) && isFinite(d) && Math.abs(d - duration) > 1) {
                onDurationChange?.(d);
              }
            }}
            onEnded={onEnded}
            loop={isLooping}
            playsInline
          />
        ) : (
          /* Audio Studio Visualizer / Empty State */
          <div
            className="relative w-full h-full flex flex-col items-center justify-center p-6 select-none cursor-pointer"
            onClick={onPlayPause}
          >
            {/* Visualizer Canvas */}
            <canvas
              ref={canvasRef}
              width={640}
              height={180}
              className="w-full max-w-lg h-36 object-contain z-10"
            />


            {/* Current Live Subtitle Banner Overlay */}
            {currentSubtitleText && (
              <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col items-center pointer-events-none">
                <div className="max-w-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-5 py-2.5 rounded-2xl shadow-2xl text-center">
                  {currentSpeaker && (
                    <span className="text-xs font-bold text-blue-400 mr-2 uppercase tracking-wide">
                      {currentSpeaker} :
                    </span>
                  )}
                  <span className="text-sm font-medium text-slate-100">
                    {currentSubtitleText}
                  </span>
                </div>
              </div>
            )}

            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-radial-glow pointer-events-none opacity-20" />
          </div>
        )}
      </div>
    </div>
  );
};
