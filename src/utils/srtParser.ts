import { SubtitleItem } from '../types';
import { parseTimeToSeconds } from './timeFormatter';

/**
 * Parse an SRT or VTT string into SubtitleItem[]
 */
export function parseSubtitleContent(content: string): SubtitleItem[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const items: SubtitleItem[] = [];

  let currentItem: Partial<SubtitleItem> = {};
  let textLines: string[] = [];
  const timecodeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line indicates end of subtitle block
      if (currentItem.startTime !== undefined && currentItem.endTime !== undefined && textLines.length > 0) {
        const fullText = textLines.join('\n');
        const { speaker, text } = extractSpeaker(fullText);

        items.push({
          id: currentItem.id || `sub_${items.length + 1}`,
          startTime: currentItem.startTime,
          endTime: currentItem.endTime,
          speaker: speaker || '講者',
          text: text,
          color: getSpeakerColor(speaker || '講者')
        });
      }
      currentItem = {};
      textLines = [];
      continue;
    }

    // Ignore WEBVTT header
    if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
      continue;
    }

    const match = line.match(timecodeRegex);
    if (match) {
      // Line is a timecode
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      currentItem.startTime = parseTimeToSeconds(startStr);
      currentItem.endTime = parseTimeToSeconds(endStr);
      if (!currentItem.id) {
        currentItem.id = `sub_${items.length + 1}`;
      }
    } else if (currentItem.startTime !== undefined) {
      // It's subtitle text
      textLines.push(line);
    } else if (/^\d+$/.test(line)) {
      // Line index number
      currentItem.id = `sub_${line}`;
    }
  }

  // Handle final item if file didn't end with blank line
  if (currentItem.startTime !== undefined && currentItem.endTime !== undefined && textLines.length > 0) {
    const fullText = textLines.join('\n');
    const { speaker, text } = extractSpeaker(fullText);
    items.push({
      id: currentItem.id || `sub_${items.length + 1}`,
      startTime: currentItem.startTime,
      endTime: currentItem.endTime,
      speaker: speaker || '講者',
      text: text,
      color: getSpeakerColor(speaker || '講者')
    });
  }

  return items;
}

/**
 * Extract speaker from texts like "王經理: 各位好" or "【王經理】各位好" or "<v 王經理>各位好"
 */
function extractSpeaker(text: string): { speaker: string; text: string } {
  // WebVTT voice tag <v Speaker>text</v>
  const vttMatch = text.match(/<v\s+([^>]+)>(.*?)<\/v>/s);
  if (vttMatch) {
    return { speaker: vttMatch[1].trim(), text: vttMatch[2].trim() };
  }

  // Colon format "王經理：各位好" or "王經理: 各位好"
  const colonMatch = text.match(/^([^\n:：]{2,10})[:：]\s*(.*)$/s);
  if (colonMatch) {
    return { speaker: colonMatch[1].trim(), text: colonMatch[2].trim() };
  }

  // Bracket format "【王經理】各位好" or "[王經理] 各位好"
  const bracketMatch = text.match(/^[【\[]([^\n\]】]{2,10})[】\]]\s*(.*)$/s);
  if (bracketMatch) {
    return { speaker: bracketMatch[1].trim(), text: bracketMatch[2].trim() };
  }

  return { speaker: '', text };
}

const colorPalette = [
  'text-blue-500 dark:text-blue-400',
  'text-emerald-500 dark:text-emerald-400',
  'text-amber-500 dark:text-amber-400',
  'text-purple-500 dark:text-purple-400',
  'text-rose-500 dark:text-rose-400',
  'text-cyan-500 dark:text-cyan-400'
];
const speakerColorMap = new Map<string, string>();

export function getSpeakerColor(speaker: string): string {
  if (!speaker) return 'text-slate-500 dark:text-slate-400';
  if (!speakerColorMap.has(speaker)) {
    const colorIndex = speakerColorMap.size % colorPalette.length;
    speakerColorMap.set(speaker, colorPalette[colorIndex]);
  }
  return speakerColorMap.get(speaker)!;
}

/**
 * Export SubtitleItem[] to standard SRT format
 */
export function exportToSRT(items: SubtitleItem[]): string {
  return items.map((item, index) => {
    const start = formatSrtTime(item.startTime);
    const end = formatSrtTime(item.endTime);
    const speakerPrefix = item.speaker ? `${item.speaker}：` : '';
    return `${index + 1}\n${start} --> ${end}\n${speakerPrefix}${item.text}\n`;
  }).join('\n');
}

function formatSrtTime(sec: number): string {
  const totalMs = Math.round(sec * 1000);
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Intelligently parse raw pasted text into SubtitleItem[]
 * Supports:
 * 1. YouTube transcript format (time on one line, text on next line, or time and text together)
 * 2. Formats with [MM:SS] or MM:SS at line beginning
 * 3. Standard SRT / VTT formats
 */
export function parsePastedTranscript(rawText: string, defaultDuration = 0): SubtitleItem[] {
  if (!rawText || !rawText.trim()) return [];

  const trimmed = rawText.trim();
  // If standard SRT/VTT with '-->'
  if (trimmed.includes('-->')) {
    return parseSubtitleContent(trimmed);
  }

  const lines = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const items: { startTime: number; text: string; speaker?: string }[] = [];

  // Match timestamps like "0:00", "00:15", "1:23:45", "[01:23]"
  const timeOnlyRegex = /^\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\]?$/;
  const timeWithTextRegex = /^\[?((?:\d{1,2}:)?\d{1,2}:\d{2}(?:[,.]\d{1,3})?)\]?[\s:：]+(.+)$/;

  let pendingTime: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is just a timestamp (common in YouTube transcript copy)
    const timeOnlyMatch = line.match(timeOnlyRegex);
    if (timeOnlyMatch) {
      pendingTime = parseTimeToSeconds(timeOnlyMatch[1]);
      continue;
    }

    // Check if line starts with timestamp followed by text
    const timeWithTextMatch = line.match(timeWithTextRegex);
    if (timeWithTextMatch) {
      const time = parseTimeToSeconds(timeWithTextMatch[1]);
      const content = timeWithTextMatch[2].trim();
      const { speaker, text } = extractSpeaker(content);
      items.push({ startTime: time, text: text || content, speaker });
      pendingTime = null;
      continue;
    }

    // If we have a pending timestamp from previous line, this line is its text!
    if (pendingTime !== null) {
      const { speaker, text } = extractSpeaker(line);
      items.push({ startTime: pendingTime, text: text || line, speaker });
      pendingTime = null;
      continue;
    }

    // If no timestamp was found at all on this line or previous line:
    if (items.length > 0) {
      items[items.length - 1].text += ' ' + line;
    } else {
      // First line without time, default to 0s
      const { speaker, text } = extractSpeaker(line);
      items.push({ startTime: 0, text: text || line, speaker });
    }
  }

  // Convert to SubtitleItem with computed endTime
  return items.map((item, idx) => {
    const nextItem = items[idx + 1];
    let endTime: number;
    if (nextItem) {
      endTime = nextItem.startTime;
    } else if (defaultDuration > item.startTime) {
      endTime = defaultDuration;
    } else {
      // Estimate based on characters (approx. 5 chars per second, minimum 3s)
      endTime = item.startTime + Math.max(3, Math.ceil(item.text.length / 5));
    }

    const speakerName = item.speaker || '講者';
    return {
      id: `sub_${idx + 1}`,
      startTime: item.startTime,
      endTime: Math.max(item.startTime + 0.5, endTime),
      speaker: speakerName,
      text: item.text,
      color: getSpeakerColor(speakerName)
    };
  });
}

