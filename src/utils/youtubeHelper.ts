// YouTube Iframe Player API Helper
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/**
 * Extract 11-character video ID from any YouTube URL or string
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern matching: watch?v=, youtu.be/, embed/, shorts/, live/
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/|live\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

let ytApiPromise: Promise<any> | null = null;

/**
 * Dynamically load YouTube Iframe Player API
 */
export function loadYouTubeIframeAPI(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise((resolve) => {
    // Check if script tag already exists
    let scriptTag = document.getElementById('youtube-iframe-api') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'youtube-iframe-api';
      scriptTag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(scriptTag, firstScriptTag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') {
        previousOnReady();
      }
      resolve(window.YT);
    };

    // Polling fallback in case onYouTubeIframeAPIReady fired before callback assigned
    const checkInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve(window.YT);
      }
    }, 100);
  });

  return ytApiPromise;
}

/**
 * Extract multiple YouTube IDs or URLs from text (multi-line, comma, semicolon, or space separated)
 */
export function extractMultipleYouTubeVideos(text: string): { url: string; videoId: string }[] {
  if (!text) return [];
  const lines = text.split(/[\r\n,;]+/);
  const results: { url: string; videoId: string }[] = [];
  const seenIds = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tokens = trimmed.split(/\s+/);
    for (const token of tokens) {
      const id = extractYouTubeId(token);
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        const url = token.startsWith('http') ? token : `https://www.youtube.com/watch?v=${id}`;
        results.push({ url, videoId: id });
      }
    }
  }

  return results;
}

const YT_LIBRARY_STORAGE_KEY = 'srtnote_youtube_library';

import { YouTubeHistoryItem } from '../types';

export function getStoredYouTubeLibrary(): YouTubeHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(YT_LIBRARY_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveYouTubeToLibrary(item: { url: string; videoId: string; title?: string }): YouTubeHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredYouTubeLibrary();
    const filtered = current.filter((x) => x.id !== item.videoId);
    const updated: YouTubeHistoryItem = {
      id: item.videoId,
      url: item.url,
      title: item.title || `YouTube 影片 (${item.videoId})`,
      addedAt: Date.now()
    };
    const nextList = [updated, ...filtered].slice(0, 100);
    localStorage.setItem(YT_LIBRARY_STORAGE_KEY, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    return [];
  }
}

export function saveMultipleYouTubeToLibrary(
  items: { url: string; videoId: string; title?: string }[]
): YouTubeHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredYouTubeLibrary();
    const map = new Map<string, YouTubeHistoryItem>();

    for (const item of items) {
      map.set(item.videoId, {
        id: item.videoId,
        url: item.url,
        title: item.title || `YouTube 影片 (${item.videoId})`,
        addedAt: Date.now()
      });
    }

    for (const old of current) {
      if (!map.has(old.id)) {
        map.set(old.id, old);
      }
    }

    const nextList = Array.from(map.values())
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 100);
    localStorage.setItem(YT_LIBRARY_STORAGE_KEY, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    return [];
  }
}

export function removeYouTubeFromLibrary(videoId: string): YouTubeHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getStoredYouTubeLibrary();
    const nextList = current.filter((x) => x.id !== videoId);
    localStorage.setItem(YT_LIBRARY_STORAGE_KEY, JSON.stringify(nextList));
    return nextList;
  } catch (e) {
    return [];
  }
}

export function clearYouTubeLibrary(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(YT_LIBRARY_STORAGE_KEY);
  } catch (e) {}
}

export function saveCustomLibraryOrder(items: YouTubeHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(YT_LIBRARY_STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
  } catch (e) {}
}
