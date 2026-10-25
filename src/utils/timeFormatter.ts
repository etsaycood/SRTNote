/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number, includeHours = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0 || includeHours) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to MM:SS.mmm (for precise subtitle editing)
 */
export function formatTimePrecise(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  const [secPart, msPart] = secs.split('.');
  return `${mins.toString().padStart(2, '0')}:${secPart.padStart(2, '0')}.${msPart || '000'}`;
}

/**
 * Parse time string ("01:35", "01:35.500", "00:01:35,500") to seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    // HH:MM:SS.mmm
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    // MM:SS.mmm
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  } else if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  return 0;
}
