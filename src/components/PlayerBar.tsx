import React from 'react';
import { formatTime } from '../utils/timeFormatter';
import { SlideItem, SubtitleItem, TimeRange, LoopMode } from '../types';
import { AudioWaveform } from './AudioWaveform';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1
} from 'lucide-react';

interface PlayerBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  loopMode?: LoopMode;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  slides: SlideItem[];
  subtitles?: SubtitleItem[];
  mediaUrl?: string;
  timeRange?: TimeRange;
  onUpdateTimeRange?: (range: TimeRange) => void;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  isMobile?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
  loopMode,
  isLooping = false,
  onToggleLoop,
  slides,
  subtitles = [],
  mediaUrl,
  timeRange,
  onUpdateTimeRange,
  onPlayPause,
  onSeek,
  onChangePlaybackRate,
  onChangeVolume,
  onToggleMute,
  isMobile = false
}) => {
  const activeLoopMode: LoopMode = loopMode || (isLooping ? 'single' : 'off');
  const scrubberRef = React.useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [scrubTime, setScrubTime] = React.useState<number | null>(null);

  const handleSkip = (seconds: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(next);
  };

  // Helper for touch & mouse seeking on the simple YouTube scrubber
  const calculateScrubberTime = (clientX: number) => {
    if (!scrubberRef.current || duration <= 0) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, offsetX / rect.width));
    return ratio * duration;
  };

  const handleScrubberMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsScrubbing(true);
    const t = calculateScrubberTime(e.clientX);
    setScrubTime(t);
    onSeek(t);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const moveT = calculateScrubberTime(moveEvent.clientX);
      setScrubTime(moveT);
      onSeek(moveT);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      setScrubTime(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleScrubberTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    setIsScrubbing(true);
    const t = calculateScrubberTime(e.touches[0].clientX);
    setScrubTime(t);
    onSeek(t);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length > 0) {
        const moveT = calculateScrubberTime(moveEvent.touches[0].clientX);
        setScrubTime(moveT);
        onSeek(moveT);
      }
    };

    const onTouchEnd = () => {
      setIsScrubbing(false);
      setScrubTime(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  // --- 3. 手機模式下：模仿 YouTube 設計，只留撥放聲音及時間，還有簡易的時間軸 ---
  if (isMobile) {
    const showHours = duration >= 3600;
    const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

    return (
      <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl px-3.5 py-2 flex flex-col gap-1.5 z-30 select-none">
        {/* 簡易的時間軸 (YouTube-style minimal scrubber) */}
        <div
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          onTouchStart={handleScrubberTouchStart}
          className="relative w-full h-4 flex items-center cursor-pointer group touch-none"
          title="滑動或點選時間軸以跳轉"
        >
          {/* Track background */}
          <div className="w-full h-1 group-hover:h-1.5 bg-slate-800 rounded-full overflow-hidden transition-all relative">
            {/* Red Progress Fill (YouTube Red) */}
            <div
              className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrubber Thumb Knob */}
          <div
            className="absolute w-3.5 h-3.5 bg-red-600 rounded-full shadow-md -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125 group-active:scale-125 ring-2 ring-white/20"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Row: Play/Pause, Sound Toggle (撥放聲音), Time Display */}
        <div className="flex items-center justify-between px-0.5">
          {/* Left: Play/Pause & Sound Button */}
          <div className="flex items-center gap-2.5">
            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md shadow-blue-600/30 active:scale-95"
              title={isPlaying ? '暫停 (點擊切換)' : '播放 (點擊切換)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* 撥放聲音 (Mute/Unmute audio button) */}
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg transition-colors active:scale-95 flex items-center justify-center ${
                isMuted || volume === 0
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700'
              }`}
              title={isMuted ? '取消靜音 (目前：靜音)' : '靜音 (目前：播放聲音)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-200" />
              )}
            </button>
            {onToggleLoop && (
              <button
                onClick={onToggleLoop}
                className={`p-1.5 rounded-lg transition-colors active:scale-95 flex items-center justify-center ${
                  activeLoopMode === 'single'
                    ? 'text-blue-400 bg-blue-500/20'
                    : activeLoopMode === 'all'
                    ? 'text-purple-400 bg-purple-500/20'
                    : 'text-slate-400 hover:text-white bg-slate-800/80'
                }`}
                title={
                  activeLoopMode === 'single'
                    ? '重複播放：單曲循環'
                    : activeLoopMode === 'all'
                    ? '重複播放：全部循環'
                    : '重複播放：關閉'
                }
              >
                {activeLoopMode === 'single' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Right: 時間 (Time Display) */}
          <div className="font-mono text-xs text-slate-300 flex items-center gap-1 font-semibold bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <span className="text-white">{formatTime(displayTime, showHours)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatTime(duration, showHours)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl px-4 md:px-6 py-2.5 flex items-center gap-3 md:gap-5 z-30 select-none">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg shadow-blue-600/30 active:scale-95 group"
        title={isPlaying ? '暫停 (Space)' : '播放 (Space)'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Skip -5s / +5s & Repeat */}
      <div className="hidden sm:flex items-center gap-1 text-slate-400">
        <button
          onClick={() => handleSkip(-5)}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="倒退 5 秒"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleSkip(5)}
          className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="快進 5 秒"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        {onToggleLoop && (
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              activeLoopMode === 'single'
                ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm'
                : activeLoopMode === 'all'
                ? 'bg-purple-600/25 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'hover:text-white hover:bg-slate-800'
            }`}
            title={
              activeLoopMode === 'single'
                ? '重複播放：單曲循環 (點擊切換為全部循環)'
                : activeLoopMode === 'all'
                ? '重複播放：全部循環 (點擊關閉循環)'
                : '重複播放：關閉 (點擊開啟單曲循環)'
            }
          >
            {activeLoopMode === 'single' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {activeLoopMode === 'all' && (
              <span className="text-[9px] font-bold font-mono">ALL</span>
            )}
          </button>
        )}
      </div>

      {/* Dedicated High-Fidelity Audio Waveform Canvas */}
      <div className="flex-1 min-w-0 px-2 py-0.5">
        <AudioWaveform
          currentTime={currentTime}
          duration={duration}
          mediaUrl={mediaUrl}
          slides={slides}
          subtitles={subtitles}
          timeRange={timeRange}
          onUpdateTimeRange={onUpdateTimeRange}
          onSeek={onSeek}
        />
      </div>

      {/* Time Display */}
      {(() => {
        const showHours = duration >= 3600;
        return (
          <div className="font-mono text-xs tracking-tight flex items-center gap-1.5 flex-shrink-0 text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="font-bold text-white text-sm">{formatTime(currentTime, showHours)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatTime(duration, showHours)}</span>
          </div>
        );
      })()}

      {/* Divider */}
      <div className="w-px h-6 bg-slate-800 hidden md:block" />

      {/* Playback Speed dropdown */}
      <div className="hidden lg:flex items-center gap-1">
        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-mono"
          title="播放倍速"
        >
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2.0x</option>
        </select>
      </div>

      {/* Volume Slider */}
      <div className="hidden md:flex items-center gap-2 text-slate-400 group/vol">
        <button
          onClick={onToggleMute}
          className="hover:text-white transition-colors"
          title={isMuted ? '取消靜音' : '靜音'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
          className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          title={`音量: ${Math.round(volume * 100)}%`}
        />
      </div>
    </div>
  );
};
