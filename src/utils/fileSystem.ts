import { ProjectConfig, SubtitleItem, SlideItem } from '../types';
import { parseSubtitleContent } from './srtParser';

export interface LoadedFolderData {
  folderName: string;
  dirHandle?: FileSystemDirectoryHandle;
  mediaFile?: File;
  mediaUrl?: string;
  mediaType: 'video' | 'audio';
  subtitleFile?: File;
  subtitles?: SubtitleItem[];
  slideFiles: { name: string; url: string; pageNumber: number }[];
  pdfFile?: File;
  config?: ProjectConfig;
}

/**
 * Open a local directory using File System Access API
 */
export async function openDirectoryPicker(): Promise<LoadedFolderData | null> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('您的瀏覽器不支援本機資料夾讀取 API，請使用 Chrome / Edge 瀏覽器，或使用右側的上傳按鈕。');
  }

  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });

    const result: LoadedFolderData = {
      folderName: dirHandle.name,
      dirHandle,
      mediaType: 'audio',
      slideFiles: []
    };

    const imageFiles: { name: string; file: File }[] = [];

    // Scan directory contents
    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        const lowerName = name.toLowerCase();

        // 1. Check for sync_config.json
        if (lowerName === 'sync_config.json' || lowerName === 'project.json') {
          try {
            const text = await file.text();
            result.config = JSON.parse(text);
          } catch (e) {
            console.warn('Failed to parse config file:', e);
          }
        }
        // 2. Check for media (video / audio)
        else if (/\.(mp4|webm|mkv|mov)$/i.test(lowerName) && !result.mediaFile) {
          result.mediaFile = file;
          result.mediaUrl = URL.createObjectURL(file);
          result.mediaType = 'video';
        } else if (/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(lowerName) && !result.mediaFile) {
          result.mediaFile = file;
          result.mediaUrl = URL.createObjectURL(file);
          result.mediaType = 'audio';
        }
        // 3. Check for subtitles
        else if (/\.(srt|vtt)$/i.test(lowerName) && !result.subtitleFile) {
          result.subtitleFile = file;
          const text = await file.text();
          result.subtitles = parseSubtitleContent(text);
        }
        // 4. Check for presentation PDF
        else if (/\.pdf$/i.test(lowerName) && !result.pdfFile) {
          result.pdfFile = file;
        }
        // 5. Check for slide images (png, jpg, jpeg, webp)
        else if (/\.(png|jpe?g|webp|svg)$/i.test(lowerName)) {
          imageFiles.push({ name, file });
        }
      }
    }

    // Sort slide images naturally (e.g., slide1.png, slide2.png, slide10.png)
    if (imageFiles.length > 0) {
      imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      result.slideFiles = imageFiles.map((img, index) => ({
        name: img.name,
        url: URL.createObjectURL(img.file),
        pageNumber: index + 1
      }));
    }

    return result;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null; // User cancelled
    }
    throw err;
  }
}

/**
 * Save project configuration back to the directory handle
 */
export async function saveConfigToDirectory(dirHandle: FileSystemDirectoryHandle, config: ProjectConfig): Promise<boolean> {
  try {
    const fileHandle = await dirHandle.getFileHandle('sync_config.json', { create: true });
    const writable = await (fileHandle as any).createWritable();
    const jsonStr = JSON.stringify(config, null, 2);
    await writable.write(jsonStr);
    await writable.close();
    return true;
  } catch (e) {
    console.error('Failed to save config to directory:', e);
    throw e;
  }
}

/**
 * Download config JSON directly (fallback when not using File System Access API)
 */
export function downloadConfigJSON(config: ProjectConfig, filename = 'sync_config.json') {
  const jsonStr = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
