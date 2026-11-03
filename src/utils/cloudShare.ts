import { ProjectConfig } from '../types';

export type CloudProvider = 'p' | 'd' | 'j';

export interface CloudProviderMeta {
  prefix: CloudProvider;
  name: string;
  maxSizeDesc: string;
  maxBytes: number;
  getWebViewUrl: (id: string) => string;
  getRawUrl: (id: string) => string;
}

export const CLOUD_PROVIDERS: Record<CloudProvider, CloudProviderMeta> = {
  p: {
    prefix: 'p',
    name: 'Pastes.dev',
    maxSizeDesc: '上限 ~10 MB',
    maxBytes: 10 * 1024 * 1024,
    getWebViewUrl: (id: string) => `https://pastes.dev/${id}`,
    getRawUrl: (id: string) => `https://api.pastes.dev/${id}`
  },
  d: {
    prefix: 'd',
    name: 'dpaste.com',
    maxSizeDesc: '上限 ~1 MB (保存 365 天)',
    maxBytes: 1 * 1024 * 1024,
    getWebViewUrl: (id: string) => `https://dpaste.com/${id}`,
    getRawUrl: (id: string) => `https://dpaste.com/${id}.txt`
  },
  j: {
    prefix: 'j',
    name: 'JSONBlob',
    maxSizeDesc: '上限 ~100 KB',
    maxBytes: 100 * 1024,
    getWebViewUrl: (id: string) => `https://jsonblob.com/${id}`,
    getRawUrl: (id: string) => `https://jsonblob.com/api/jsonBlob/${id}`
  }
};

export interface ShareUploadResult {
  provider: CloudProvider;
  providerName: string;
  id: string;
  shareParam: string; // e.g., "p_mPzfKTvCbI"
  shareUrl: string;   // Full SRTNote share link
  githubPagesUrl: string; // Canonical https://etsaycood.github.io/SRTNote/?s=...
  webViewUrl: string; // e.g., https://pastes.dev/mPzfKTvCbI
  rawUrl: string;     // e.g., https://api.pastes.dev/mPzfKTvCbI
  byteSize: number;
}

/**
 * Format byte size to human-readable KB / MB
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Upload JSON string to Pastes.dev (p_)
 */
async function uploadToPastesDev(jsonStr: string): Promise<string> {
  const response = await fetch('https://api.pastes.dev/post', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/json'
    },
    body: jsonStr
  });

  if (!response.ok) {
    throw new Error(`Pastes.dev 上傳失敗 (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (data && data.key) {
    return String(data.key).trim();
  }

  const loc = response.headers.get('location');
  if (loc) {
    return loc.replace(/^\/+/, '').trim();
  }

  throw new Error('Pastes.dev 未回傳有效代號');
}

/**
 * Upload JSON string to dpaste.com (d_)
 */
async function uploadToDpaste(jsonStr: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append('content', jsonStr);
  formData.append('syntax', 'json');
  formData.append('expiry_days', '365');

  const response = await fetch('https://dpaste.com/api/v2/', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`dpaste.com 上傳失敗 (HTTP ${response.status})`);
  }

  const text = (await response.text()).trim();
  // Expected response: https://dpaste.com/D8EUHD2CU
  const match = text.match(/dpaste\.com\/([A-Za-z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  throw new Error('dpaste.com 未回傳有效代號');
}

/**
 * Upload JSON string to JSONBlob (j_)
 */
async function uploadToJsonBlob(jsonStr: string): Promise<string> {
  const response = await fetch('https://jsonblob.com/api/jsonBlob', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: jsonStr
  });

  if (!response.ok) {
    throw new Error(`JSONBlob 上傳失敗 (HTTP ${response.status})`);
  }

  const blobIdHeader = response.headers.get('x-jsonblob-id') || response.headers.get('X-jsonblob-id');
  if (blobIdHeader) {
    return blobIdHeader.trim();
  }

  const location = response.headers.get('location') || response.headers.get('Location');
  if (location) {
    const parts = location.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.trim();
  }

  throw new Error('JSONBlob 未回傳有效代號 (可能受瀏覽器 CORS Header 限制)');
}

/**
 * Build share URLs for a given provider prefix and ID
 */
export function buildShareResult(
  provider: CloudProvider,
  id: string,
  byteSize: number
): ShareUploadResult {
  const meta = CLOUD_PROVIDERS[provider];
  const shareParam = `${provider}_${id}`;

  // Construct current environment share link
  let currentBase = 'https://etsaycood.github.io/SRTNote/';
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    currentBase = url.toString();
  }

  const shareUrl = `${currentBase}${currentBase.includes('?') ? '&' : '?'}s=${shareParam}`;
  const githubPagesUrl = `https://etsaycood.github.io/SRTNote/?s=${shareParam}`;

  return {
    provider,
    providerName: meta.name,
    id,
    shareParam,
    shareUrl,
    githubPagesUrl,
    webViewUrl: meta.getWebViewUrl(id),
    rawUrl: meta.getRawUrl(id),
    byteSize
  };
}

/**
 * Upload share config with automatic size-based provider selection and fallback
 */
export async function uploadShareConfig(
  config: ProjectConfig,
  preferredProvider: CloudProvider | 'auto' = 'auto'
): Promise<ShareUploadResult> {
  const jsonStr = JSON.stringify(config);
  const byteSize = new Blob([jsonStr]).size;

  // Determine provider priority order based on content size or user selection
  let order: CloudProvider[] = [];
  if (preferredProvider !== 'auto') {
    order = [preferredProvider];
  } else if (byteSize > 900 * 1024) {
    // > 900 KB: only Pastes.dev reliably supports up to 10MB
    order = ['p', 'd'];
  } else if (byteSize > 90 * 1024) {
    // 90 KB ~ 900 KB: Pastes.dev first, dpaste second
    order = ['p', 'd'];
  } else {
    // <= 90 KB: Pastes.dev -> dpaste -> JSONBlob
    order = ['p', 'd', 'j'];
  }

  const errors: string[] = [];

  for (const provider of order) {
    try {
      let id = '';
      if (provider === 'p') {
        id = await uploadToPastesDev(jsonStr);
      } else if (provider === 'd') {
        id = await uploadToDpaste(jsonStr);
      } else if (provider === 'j') {
        id = await uploadToJsonBlob(jsonStr);
      }

      if (id) {
        return buildShareResult(provider, id, byteSize);
      }
    } catch (err: any) {
      errors.push(`${CLOUD_PROVIDERS[provider].name}: ${err.message || err}`);
    }
  }

  throw new Error(`無法建立雲端分享連結（${errors.join('；')}）`);
}

/**
 * Parse ?s= parameter (e.g. "p_mPzfKTvCbI", "d_D8EUHD2CU", "j_123456")
 */
export function parseShareParam(param: string): {
  provider: CloudProvider;
  id: string;
  rawUrl: string;
  webViewUrl: string;
  providerName: string;
} | null {
  if (!param) return null;
  const trimmed = param.trim();
  const match = trimmed.match(/^([pdj])_([A-Za-z0-9_-]+)$/);
  if (!match) return null;

  const provider = match[1] as CloudProvider;
  const id = match[2];
  const meta = CLOUD_PROVIDERS[provider];
  if (!meta) return null;

  return {
    provider,
    id,
    rawUrl: meta.getRawUrl(id),
    webViewUrl: meta.getWebViewUrl(id),
    providerName: meta.name
  };
}

/**
 * Fetch and parse shared ProjectConfig from cloud storage
 */
export async function fetchSharedConfig(shareParam: string): Promise<{
  config: ProjectConfig;
  meta: NonNullable<ReturnType<typeof parseShareParam>>;
}> {
  const parsed = parseShareParam(shareParam);
  if (!parsed) {
    throw new Error(`無效的分享參數格式 (${shareParam})，應為 p_代號、d_代號 或 j_代號`);
  }

  const response = await fetch(parsed.rawUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*'
    }
  });

  if (!response.ok) {
    throw new Error(
      `無法從 ${parsed.providerName} 讀取分享內容 (HTTP ${response.status})，連結可能已過期或代號不存在。`
    );
  }

  const text = await response.text();
  try {
    const config = JSON.parse(text) as ProjectConfig;
    if (!config || typeof config !== 'object') {
      throw new Error('JSON 內容為空或非物件');
    }
    return { config, meta: parsed };
  } catch (err) {
    throw new Error(`雲端檔案內容不是有效的 SRTNote JSON 格式`);
  }
}
