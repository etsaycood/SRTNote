import { LMStudioConfig, SubtitleItem } from '../types';
import { formatTime } from './timeFormatter';
import {
  smartSentenceCompress,
  encodeSentencesToIdPrompt,
  decodeIdsToTimestamps
} from './transcriptOptimizer';

export interface ModelInfo {
  id: string;
  name?: string;
}

export const DEFAULT_LM_STUDIO_CONFIG: LMStudioConfig = {
  // Use 127.0.0.1 as default or user's network IP
  baseUrl: 'http://127.0.0.1:1234/v1',
  model: '',
  temperature: 0.3,
  contextWindow: 4096,
  systemPrompt: `你是一位資深的影音內容智慧分析師與知識整理專家。
請閱讀以下帶有時間錨點標籤的逐字稿，為使用者整理出結構清晰、重點突出、具商業實用價值的「重點整理與精華摘要」。

格式要求：
1. 【核心主題與目標】精簡概括此影音/會議的目的與背景。
2. 【關鍵時間戳記與核心綱要】按時間順序列出關鍵段落。每個細部要點皆須標註該論點「剛開始被提及」的時間錨點標籤（格式如 [#ID]，例如 [#1]、[#12] 或 [MM:SS]），方便使用者直接點擊跳轉回顧。
3. 【決策事項與行動清單 (Action Items)】列出各講者提及的具體責任人、完成進度或下一步待辦事項，並附帶對應時間錨點。
4. 【重點洞察與技術/觀點摘要】歸納深入細節與結論。

規範與限制：
- 禁止自行推算、四捨五入或捏造逐字稿中不存在的標籤，必須 100% 沿用輸入逐字稿中實際出現的錨點標籤（如 [#1]、[#15]）。
- 若單一重點橫跨多個標籤，請取該觀點起始句的標籤，確保使用者點擊時能從開頭完整聽起。
- 請使用繁體中文、排版嚴謹且條理分明。`
};

/**
 * 快速預估文本 Token 數 (中文字元約 1.6 tokens, 英文字詞約 1.3 tokens)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkRegex = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g;
  const cjkMatches = text.match(cjkRegex) || [];
  const cjkCount = cjkMatches.length;
  const nonCjkText = text.replace(cjkRegex, ' ');
  const words = nonCjkText.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(cjkCount * 1.6 + words * 1.3);
}

/**
 * Validate and clean API Base URL
 */
export function validateApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl ? baseUrl.trim() : '';
  if (!trimmed) {
    throw new Error('API Base URL 不能為空');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    throw new Error('無效的 URL 格式，請確認是否包含 http:// 或 https://');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('僅支援 http 或 https 協議之端點');
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Fetch available models from LM Studio
 */
export async function fetchLMStudioModels(baseUrl: string): Promise<string[]> {
  const cleanBase = validateApiBaseUrl(baseUrl);
  const url = `${cleanBase}/models`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`連線回應錯誤 (HTTP ${response.status})，請確認 AI API 伺服器 (如 LM Studio / Ollama / vLLM) 是否已啟動。`);
    }

    const data = await response.json();
    if (data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id);
    }
    return [];
  } catch (err: any) {
    if (baseUrl.includes('localhost')) {
      throw new Error('無法連線至 localhost。若使用本機請嘗試 http://127.0.0.1:1234/v1，若為內網機器請使用如 http://192.168.x.x:1234/v1，並確認勾選 Enable CORS。');
    }
    throw new Error(err.message || `連線至 API 伺服器 (${baseUrl}) 失敗。請檢查：1. API 服務是否啟動 2. 是否開啟 CORS 跨域 3. 網路防火牆是否允許。`);
  }
}

/**
 * 智慧格式化逐字稿：先經由語意斷句＋轉折詞打點，再進行取樣與格式化 (Context Window Advice 方案 A & B)
 */
export function formatSubtitlesForPrompt(subtitles: SubtitleItem[], maxItems = 260): string {
  if (!subtitles || subtitles.length === 0) return '（暫無逐字稿內容）';

  const compressed = smartSentenceCompress(subtitles);
  const { promptText } = encodeSentencesToIdPrompt(compressed, maxItems);
  return promptText;
}

export type AIProcessingStage = 'prepare' | 'thinking' | 'streaming';

/**
 * Generate AI Summary via AI API (LM Studio / Ollama / OpenAI compatible) with streaming support and activity watchdog.
 */
export async function streamLMStudioSummary({
  config,
  subtitles,
  abortController,
  onStage,
  onStatus,
  onChunk,
  onComplete,
  onError
}: {
  config: LMStudioConfig;
  subtitles: SubtitleItem[];
  abortController?: AbortController;
  onStage?: (stage: AIProcessingStage, details?: { charCount?: number; tokenCount?: number }) => void;
  onStatus?: (status: string) => void;
  onChunk: (chunk: string, fullText: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  let cleanBase: string;
  try {
    cleanBase = validateApiBaseUrl(config.baseUrl);
  } catch (err: any) {
    onError(err);
    return;
  }
  const url = `${cleanBase}/chat/completions`;

  // 1. 執行背景優化：智慧精煉與時間標記打點
  onStage?.('prepare');
  onStatus?.('正在準備逐字稿與時間錨點標籤...');

  const compressedSentences = smartSentenceCompress(subtitles, {
    maxSpanSec: 12.0,
    pauseThreshold: 0.6,
    filterFillers: true
  });

  // 2. 執行時間錨點映射
  const { promptText, idMap } = encodeSentencesToIdPrompt(
    compressedSentences,
    280
  );

  let targetModel = config.model;
  if (!targetModel) {
    try {
      const models = await fetchLMStudioModels(cleanBase);
      if (models.length > 0) {
        targetModel = models[0];
      }
    } catch (e) {
      // Continue with fallback
    }
  }

  const payload = {
    model: targetModel || 'default',
    messages: [
      { role: 'system', content: config.systemPrompt },
      {
        role: 'user',
        content: `以下為影音的逐字稿內容，每行開頭帶有時間錨點編號（如 #1、#2）：\n\n---\n${promptText}\n---\n\n請根據上述逐字稿進行深度的重點整理與核心決議提取。\n注意：請在每個重點標題與細部要點前標註該論點起始的時間錨點（格式如 [#1]、[#12]），嚴禁捏造不存在的編號。`
      }
    ],
    temperature: config.temperature,
    stream: true
  };

  onStage?.('thinking');
  onStatus?.(`已發送請求至 AI API 伺服器 (${targetModel || '模型'})，AI 正在進行思考推論...`);

  // Activity Watchdog Controller
  const controller = abortController || new AbortController();
  let inactivityTimer: any = null;

  const resetWatchdog = (timeoutMs = 90000) => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      controller.abort(new Error('API 連線逾時：超過 90 秒未收到任何字詞輸出。'));
    }, timeoutMs);
  };

  // Initially allow up to 180 seconds for prompt evaluation on large 31B+ models
  resetWatchdog(180000);

  let fullText = '';
  let tokenCount = 0;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      const errText = await response.text();
      throw new Error(`API 請求失敗 (${response.status}): ${errText || response.statusText}`);
    }

    if (!response.body) {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      throw new Error('ReadableStream not supported in this environment');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let lastFlushTime = 0;
    let pendingDelta = '';

    const flushStream = (force = false) => {
      const now = Date.now();
      if ((force && (pendingDelta || fullText)) || now - lastFlushTime >= 80) {
        lastFlushTime = now;
        const decodedFullText = decodeIdsToTimestamps(fullText, idMap);
        onChunk(pendingDelta, decodedFullText);
        pendingDelta = '';
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Activity detected! Reset watchdog timer
      resetWatchdog(90000);

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              pendingDelta += delta;
              tokenCount++;

              onStage?.('streaming', { charCount: fullText.length, tokenCount });

              // Throttle UI update every ~80ms to avoid locking the UI thread with constant React re-renders & regex parsing
              flushStream(false);

              if (tokenCount % 35 === 0) {
                onStatus?.(`正在即時串流輸出中 (已生成約 ${fullText.length} 字)...`);
              }
            }
          } catch (e) {
            // Ignore partial JSON chunks
          }
        }
      }
    }

    flushStream(true);

    if (inactivityTimer) clearTimeout(inactivityTimer);
    const finalDecoded = decodeIdsToTimestamps(fullText, idMap);
    onComplete(finalDecoded);
  } catch (err: any) {
    if (inactivityTimer) clearTimeout(inactivityTimer);

    // If user manually stopped generation, gracefully keep whatever was generated!
    if (controller.signal.aborted && (err.name === 'AbortError' || err.message?.includes('abort') || err.message?.includes('停止'))) {
      if (fullText.trim()) {
        const finalDecoded = decodeIdsToTimestamps(fullText, idMap);
        onStatus?.('使用者已手動停止生成，已保留目前內容。');
        onComplete(finalDecoded);
        return;
      }
    }

    console.error('AI API Streaming Error:', err);
    let msg = err.message || String(err);
    if (msg.includes('未收到')) {
      msg = 'API 運算停滯 (超過 90 秒無新字輸出)。建議在 AI 服務中檢查 GPU 負載。';
    } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      msg = `無法連線到 API 伺服器 (${config.baseUrl})。請確認本機或遠端 API Server (如 LM Studio / Ollama) 處於運行狀態，且「Enable CORS」已勾選。`;
    }
    onError(new Error(msg));
  }
}

/**
 * Built-in Simulated AI Summary Generator
 */
export async function streamSimulatedSummary({
  subtitles,
  onChunk,
  onComplete
}: {
  subtitles: SubtitleItem[];
  onChunk: (chunk: string, fullText: string) => void;
  onComplete: (fullText: string) => void;
}): Promise<void> {
  if (!subtitles || subtitles.length === 0) {
    const fallback = '## ⚠️ 無法分析\n目前尚未載入逐字稿內容，請先上傳字幕檔或開啟資料夾。';
    onComplete(fallback);
    return;
  }

  // 套用方案 A：語意斷句，確保提取的是完整論述句子
  const compressed = smartSentenceCompress(subtitles);
  const sentenceList = compressed.length > 0 ? compressed : subtitles.map((s, idx) => ({
    id: `#${idx + 1}`,
    startTime: s.startTime,
    endTime: s.endTime,
    speaker: s.speaker,
    text: s.text,
    rawTimeFormatted: `[${formatTime(s.startTime, s.startTime >= 3600)}]`
  }));

  const speakers = Array.from(new Set(sentenceList.map(s => s.speaker).filter(Boolean)));
  const firstSub = sentenceList[0];
  const lastSub = sentenceList[sentenceList.length - 1];

  const keyPoints: { time: string; text: string; speaker: string }[] = [];
  const pointCount = Math.min(7, Math.max(3, sentenceList.length));
  const step = Math.floor(sentenceList.length / pointCount);

  for (let i = 0; i < pointCount; i++) {
    const index = Math.min(sentenceList.length - 1, i * step);
    const item = sentenceList[index];
    const timeFormatted = formatTime(item.startTime, item.startTime >= 3600);
    keyPoints.push({
      time: timeFormatted,
      text: item.text,
      speaker: item.speaker || '發言者'
    });
  }

  const generatedMarkdown = `## 📌 會議/課程核心主題與目標
本場影音內容跨越 **[${formatTime(firstSub.startTime, firstSub.startTime >= 3600)}]** 至 **[${formatTime(lastSub.startTime, lastSub.startTime >= 3600)}]**，主要由 **${speakers.join('、') || '主講人'}** 主講。核心主題聚焦於核心進度回報、技術架構安全防護、資料庫相容性轉接與發布里程碑確認。

---

## ⏱️ 關鍵時間戳記與核心綱要
${keyPoints.map(kp => `- [${kp.time}] **${kp.speaker}重點報告**：${kp.text}`).join('\n')}

---

## 🎯 決策事項與行動清單 (Action Items)
1. **${speakers[0] || '專案負責人'}**：確認各模組時程銜接，確保整合測試依期啟動。
2. **${speakers[1] || '技術團隊'}**：針對資料相容性與性能指標進行轉接優化與高併發測試。
3. **全員**：於本週預定里程碑完成回報，並進入下一階段發布流程。

---

## 💡 智慧洞察與備註
> 本摘要已提取整場影音最關鍵時間錨點。點擊上方任何 [MM:SS] 或 [HH:MM:SS] 時間膠囊標籤，即可立即將影音與簡報跳轉至該片段回顧。`;

  const chunks = generatedMarkdown.split(/(?<=\n| )/);
  let accumulated = '';

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    accumulated += chunk;
    onChunk(chunk, accumulated);
    await new Promise(r => setTimeout(r, 18));
  }

  onComplete(accumulated);
}
