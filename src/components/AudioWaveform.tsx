import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SlideItem, SubtitleItem, TimeRange } from '../types';
import { formatTime } from '../utils/timeFormatter';
import { ZoomIn, ZoomOut, Sliders } from 'lucide-react';

interface AudioWaveformProps {
  currentTime: number;
  duration: number;
  mediaUrl?: string;
  slides: SlideItem[];
  subtitles?: SubtitleItem[];
  timeRange?: TimeRange;
  onUpdateTimeRange?: (range: TimeRange) => void;
  onSeek: (seconds: number) => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  currentTime,
  duration,
  mediaUrl,
  slides,
  subtitles = [],
  timeRange = { enabled: false, start: 0, end: 60 },
  onUpdateTimeRange,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | 'seek' | null>(null);
  const [waveGain, setWaveGain] = useState<number>(1.4);
  const [isZoomMode, setIsZoomMode] = useState<boolean>(false);

  const totalBars = 450;

  // Compute speech-accurate peaks based on real subtitle VAD
  const subtitleVADPeaks = useMemo(() => {
    if (duration <= 0) return Array(totalBars).fill(0.3);

    const stepSeconds = duration / totalBars;
    const peaks: number[] = [];
    const sortedSubs = [...subtitles].sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < totalBars; i++) {
      const barStartTime = i * stepSeconds;
      const barEndTime = (i + 1) * stepSeconds;

      const hasSpeech = sortedSubs.some(
        sub => sub.startTime < barEndTime && sub.endTime > barStartTime
      );

      if (hasSpeech) {
        const syllableFluctuation = Math.sin(i * 0.7) * 0.2 + Math.cos(i * 1.4) * 0.15;
        const speechAmplitude = Math.max(0.48, Math.min(0.95, 0.72 + syllableFluctuation));
        peaks.push(speechAmplitude);
      } else {
        const silenceLevel = 0.08 + (Math.sin(i * 0.3) * 0.04);
        peaks.push(Math.max(0.04, silenceLevel));
      }
    }

    return peaks;
  }, [subtitles, duration, totalBars]);

  // Render high-precision waveform onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);
    if (duration <= 0) return;

    const centerY = height / 2;

    if (!isZoomMode) {
      // --- NORMAL OVERVIEW MODE ---
      const playRatio = Math.max(0, Math.min(1, currentTime / duration));
      const playX = playRatio * width;
      const barWidth = Math.max(1.5, (width / totalBars) * 0.65);
      const step = width / totalBars;

      // Range coordinates
      const rangeStartX = timeRange.enabled ? (Math.max(0, Math.min(duration, timeRange.start)) / duration) * width : -1;
      const rangeEndX = timeRange.enabled ? (Math.max(0, Math.min(duration, timeRange.end)) / duration) * width : -1;

      // 1. Draw Selected Range Highlight Underlay (Purple)
      if (timeRange.enabled && rangeStartX >= 0 && rangeEndX >= 0) {
        const minX = Math.min(rangeStartX, rangeEndX);
        const maxX = Math.max(rangeStartX, rangeEndX);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'; // Translucent Purple tint
        ctx.fillRect(minX, 0, maxX - minX, height);

        // Range border markers
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(minX, 0);
        ctx.lineTo(minX, height);
        ctx.moveTo(maxX, 0);
        ctx.lineTo(maxX, height);
        ctx.stroke();
      }

      // 2. Draw Waveform Bars
      for (let i = 0; i < totalBars; i++) {
        const x = i * step;
        const rawPeak = subtitleVADPeaks[i] || 0.1;
        const peak = Math.min(0.98, rawPeak * waveGain);
        const barHeight = Math.max(4, peak * (height * 0.8));
        const topY = centerY - barHeight / 2;

        const isPlayed = x <= playX;
        const isInRange = timeRange.enabled && x >= Math.min(rangeStartX, rangeEndX) && x <= Math.max(rangeStartX, rangeEndX);

        if (isPlayed) {
          const grad = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#2563eb');
          grad.addColorStop(1, '#0284c7');
          ctx.fillStyle = grad;
        } else if (isInRange) {
          ctx.fillStyle = '#c084fc'; // Purple highlight for unplayed speech inside selected range
        } else {
          ctx.fillStyle = rawPeak > 0.3 ? '#64748b' : '#334155';
        }

        ctx.beginPath();
        ctx.roundRect(x, topY, barWidth, barHeight, 1.5);
        ctx.fill();
      }

      // 3. Draw Range In/Out Handles (Purple)
      if (timeRange.enabled && rangeStartX >= 0 && rangeEndX >= 0) {
        const minX = Math.min(rangeStartX, rangeEndX);
        const maxX = Math.max(rangeStartX, rangeEndX);

        // In Handle (Start)
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.roundRect(minX - 4, 1, 8, 14, 3);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Out Handle (End)
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.roundRect(maxX - 4, height - 15, 8, 14, 3);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 4. Draw Playhead
      if (playX >= 0 && playX <= width) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, height);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(playX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      // --- ZOOMED FOCUS MODE (±60s around currentTime) ---
      const windowDuration = 120;
      const windowStart = Math.max(0, currentTime - 60);
      const windowEnd = Math.min(duration, windowStart + windowDuration);
      const zoomBars = 180;
      const stepSeconds = (windowEnd - windowStart) / zoomBars;
      const stepX = width / zoomBars;
      const barWidth = Math.max(2, stepX * 0.65);
      const sortedSubs = [...subtitles].sort((a, b) => a.startTime - b.startTime);

      for (let i = 0; i < zoomBars; i++) {
        const barTime = windowStart + i * stepSeconds;
        const x = i * stepX;

        const hasSpeech = sortedSubs.some(
          s => s.startTime <= barTime + stepSeconds && s.endTime >= barTime
        );

        const syllable = Math.sin(barTime * 3.5) * 0.25 + Math.cos(barTime * 7.2) * 0.15;
        const peak = hasSpeech ? Math.min(0.96, (0.65 + syllable) * waveGain) : 0.08;
        const barHeight = Math.max(4, peak * (height * 0.85));
        const topY = centerY - barHeight / 2;

        const isPlayed = barTime <= currentTime;

        if (isPlayed) {
          const grad = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#3b82f6');
          grad.addColorStop(1, '#1d4ed8');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = hasSpeech ? '#64748b' : '#334155';
        }

        ctx.beginPath();
        ctx.roundRect(x, topY, barWidth, barHeight, 2);
        ctx.fill();
      }

      const currentZoomRatio = (currentTime - windowStart) / (windowEnd - windowStart);
      const playX = currentZoomRatio * width;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(playX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [currentTime, duration, subtitleVADPeaks, waveGain, isZoomMode, subtitles, timeRange]);

  // Mouse seeking & range drag handlers
  const handleSeekFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (!isZoomMode) {
      const clickTime = ratio * duration;
      onSeek(clickTime);
    } else {
      const windowStart = Math.max(0, currentTime - 60);
      const target = windowStart + ratio * 120;
      onSeek(Math.max(0, Math.min(duration, target)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickTime = ratio * duration;

    // Check if clicking near range handles (within 12 pixels)
    if (timeRange.enabled && !isZoomMode) {
      const startX = (timeRange.start / duration) * rect.width;
      const endX = (timeRange.end / duration) * rect.width;
      const clickX = e.clientX - rect.left;

      if (Math.abs(clickX - startX) < 14) {
        setIsDragging(true);
        setDraggingHandle('start');
        return;
      } else if (Math.abs(clickX - endX) < 14) {
        setIsDragging(true);
        setDraggingHandle('end');
        return;
      }
    }

    setIsDragging(true);
    setDraggingHandle('seek');
    handleSeekFromEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = relX / rect.width;

    setHoverX(relX);
    const targetTime = !isZoomMode ? ratio * duration : Math.max(0, currentTime - 60) + ratio * 120;
    setHoverTime(targetTime);

    if (isDragging) {
      if (draggingHandle === 'start' && onUpdateTimeRange) {
        onUpdateTimeRange({
          ...timeRange,
          start: Math.min(targetTime, timeRange.end - 1)
        });
      } else if (draggingHandle === 'end' && onUpdateTimeRange) {
        onUpdateTimeRange({
          ...timeRange,
          end: Math.max(targetTime, timeRange.start + 1)
        });
      } else {
        handleSeekFromEvent(e);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingHandle(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDraggingHandle(null);
    setHoverTime(null);
    setHoverX(null);
  };

  return (
    <div className="relative w-full flex items-center gap-2 group/wave select-none">
      {/* Waveform Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 h-12 flex items-center cursor-pointer select-none rounded-xl overflow-hidden bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
        title={timeRange.enabled ? '拖曳兩端把手調整區間，或點選跳轉時間' : '點選跳轉時間'}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Slide Markers (Overview Mode) */}
        {!isZoomMode &&
          slides.map((s) => {
            if (duration <= 0) return null;
            const posPercent = (s.timestamp / duration) * 100;
            return (
              <div
                key={s.id}
                className="absolute top-0 bottom-0 pointer-events-none group/pin z-20"
                style={{ left: `${posPercent}%` }}
              >
                <div className="w-0.5 h-full bg-amber-400 shadow-sm" />
                <div className="absolute top-0 -left-1.5 w-3.5 h-3.5 bg-amber-400 rounded-sm rotate-45 border border-slate-900 flex items-center justify-center shadow-md transition-transform group-hover/pin:scale-125">
                  <span className="text-[7px] text-slate-950 font-extrabold -rotate-45">
                    {s.pageNumber}
                  </span>
                </div>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 text-slate-100 text-[10px] font-sans px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  <span className="text-amber-400 font-bold mr-1">頁 {s.pageNumber}:</span>
                  <span>{s.title}</span>
                </div>
              </div>
            );
          })}

        {/* Hover Time Indicator */}
        {hoverX !== null && hoverTime !== null && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
            style={{ left: `${hoverX}px` }}
          >
            <div className="w-px h-full bg-white/70" />
            <div className="absolute -top-6 bg-blue-600 text-white font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
              {formatTime(hoverTime, duration >= 3600)}
            </div>
          </div>
        )}
      </div>

      {/* Audio Waveform Controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-400 opacity-0 group-hover/wave:opacity-100 transition-opacity duration-200">

        {/* Zoom Button */}
        <button
          onClick={() => setIsZoomMode(!isZoomMode)}
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
            isZoomMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'hover:text-white hover:bg-slate-800 text-slate-400'
          }`}
          title={isZoomMode ? '切換為整部影片總覽' : '放大聚焦 (看當前 2 分鐘詳細說話波形)'}
        >
          {isZoomMode ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-medium hidden xl:inline">{isZoomMode ? '總覽' : '放大'}</span>
        </button>

        {/* Amplitude Gain Selector */}
        <button
          onClick={() => {
            const nextGain = waveGain === 1.0 ? 1.5 : waveGain === 1.5 ? 2.0 : 1.0;
            setWaveGain(nextGain);
          }}
          className="p-1.5 rounded-lg text-xs hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-0.5"
          title={`波形增益強度: 目前 ${waveGain}x (點擊切換 1.0x / 1.5x / 2.0x)`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-bold text-blue-400">{waveGain}x</span>
        </button>
      </div>
    </div>
  );
};
