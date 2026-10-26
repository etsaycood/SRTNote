import React from 'react';
import { formatTime } from '../utils/timeFormatter';
import { SlideItem, SubtitleItem, TimeRange } from '../types';
import { AudioWaveform } from './AudioWaveform';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat
} from 'lucide-react';

interface PlayerBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
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
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
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
  onToggleMute
}) => {
  const handleSkip = (seconds: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(next);
  };

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
              isLooping
                ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'hover:text-white hover:bg-slate-800'
            }`}
            title={isLooping ? '關閉重複播放 (已開啟循環)' : '開啟重複播放 (單曲循環)'}
          >
            <Repeat className="w-4 h-4" />
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
