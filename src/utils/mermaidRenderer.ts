import mermaid from 'mermaid';
import { parseTimeToSeconds } from './timeFormatter';

let isMermaidInitialized = false;

export function ensureMermaidInitialized() {
  if (isMermaidInitialized || typeof window === 'undefined') return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'JetBrains Mono, PingFang TC, Microsoft JhengHei, sans-serif',
    mindmap: {
      useMaxWidth: true
    }
  });
  isMermaidInitialized = true;
}

export interface MermaidRenderResult {
  svg: string;
  error?: string;
}

/**
 * Render mermaid diagram string to SVG and enhance nodes containing timestamps like [01:23]
 */
export async function renderMermaidWithTimestamps(
  code: string,
  diagramId: string
): Promise<MermaidRenderResult> {
  ensureMermaidInitialized();

  try {
    const cleanCode = code.trim();
    // Unique ID for mermaid render container
    const id = `mermaid-${diagramId}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg } = await mermaid.render(id, cleanCode);

    // Post-process SVG to detect timestamps in node text and add clickable class/data-time
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');

    if (!svgEl) {
      return { svg };
    }

    // Find all text and tspan elements
    const textNodes = Array.from(svgEl.querySelectorAll('text, tspan'));
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/;

    for (const node of textNodes) {
      const content = node.textContent || '';
      const match = content.match(timestampRegex);
      if (match) {
        const timeStr = match[1];
        // Find nearest grouping element (<g>) representing the mindmap or flowchart node
        const nodeGroup =
          node.closest('.mindmap-node, .node, .section, [class*="node"], [class*="section"]') ||
          node.parentElement;

        if (nodeGroup) {
          nodeGroup.classList.add('mermaid-timestamp-node');
          nodeGroup.setAttribute('data-time', timeStr);
          nodeGroup.setAttribute('title', `⏱️ 點擊跳轉至 [${timeStr}] 播放`);
          (nodeGroup as HTMLElement | SVGElement).style.cursor = 'pointer';
        }
      }
    }

    const serializer = new XMLSerializer();
    const enhancedSvg = serializer.serializeToString(svgEl);

    return { svg: enhancedSvg };
  } catch (err: any) {
    console.error('Mermaid render error:', err);
    return {
      svg: '',
      error: err.message || 'Mermaid 語法解析失敗'
    };
  }
}
