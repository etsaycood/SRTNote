import React, { useRef, useEffect } from 'react';
import { Video, Mic, Maximize2, Minimize2, X, Upload, GripVertical } from 'lucide-react';

interface VideoPanelProps {
  mediaUrl?: string;
  mediaType: 'video' | 'audio';
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate?: number;
  volume?: number;
  isMuted?: boolean;
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
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onPlayPause,
  isMaximized,
  onToggleMaximize,
  onClose,
  currentSpeaker,
  currentSubtitleText,
  onUploadMedia
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync external currentTime with video element
  useEffect(() => {
    if (videoRef.current) {
      // If the difference is noticeable, seek the video
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
        videoRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  // Sync play/pause with video element
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync playback rate, volume, muted with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [playbackRate, volume, isMuted]);

  // When mediaUrl changes, reset or check video metadata
  useEffect(() => {
    if (videoRef.current && mediaUrl) {
      videoRef.current.load();
    }
  }, [mediaUrl]);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Audio Spectrum visualizer canvas animation when playing pure audio or demo
  useEffect(() => {
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

        const x = i * (barWidth + gap) + gap / 2;
        const y = (height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#6366f1');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
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
  }, [isPlaying]);

  const handleVideoMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const vid = e.currentTarget;
    if (vid.duration && !isNaN(vid.duration) && isFinite(vid.duration)) {
      onDurationChange?.(vid.duration);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-lg">
      {/* Top Header Badge & Controls */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-md pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span title="拖曳以調換位置" className="cursor-grab active:cursor-grabbing flex items-center">
            <GripVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          </span>
          {mediaType === 'video' && mediaUrl ? (
            <Video className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-xs font-bold tracking-wider text-slate-200">
            {mediaType === 'video' && mediaUrl ? '視訊畫面 (Video)' : '即時語音頻譜 (Audio Studio)'}
          </span>
          {isPlaying && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Panel Action Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-md pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <label className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors" title="上傳或替換影音">
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
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden cursor-pointer"
        onClick={onPlayPause}
      >
        {mediaType === 'video' && mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
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
            playsInline
          />
        ) : (
          /* Audio Studio Visualizer */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 select-none">
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
