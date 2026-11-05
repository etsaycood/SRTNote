import { parseTimeToSeconds } from './timeFormatter';

export interface MindMapTimestamp {
  raw: string;
  seconds: number;
}

export interface MindMapNode {
  id: string;
  label: string;
  timestamps: MindMapTimestamp[];
  children: MindMapNode[];
  depth: number;
  branchIndex: number;
  totalDescendants: number;
}

interface RawTreeNode {
  label: string;
  children: RawTreeNode[];
}

/**
 * 將常見的 LaTeX 符號轉為直觀的 Unicode 符號，讓心智圖節點文字乾淨易讀
 */
export function normalizeMathAndMarkdownText(input: string): string {
  if (!input) return '';
  let text = input.trim();

  // Replace common LaTeX arrows and operators (inside or outside $...$)
  const latexReplacements: [RegExp, string][] = [
    [/\$\\rightarrow\$|\\rightarrow|\\to\b/g, '→'],
    [/\$\\leftarrow\$|\\leftarrow|\\gets\b/g, '←'],
    [/\$\\leftrightarrow\$|\\leftrightarrow/g, '↔'],
    [/\$\\Rightarrow\$|\\Rightarrow|\\implies\b/g, '⇒'],
    [/\$\\Leftarrow\$|\\Leftarrow/g, '⇐'],
    [/\$\\Leftrightarrow\$|\\Leftrightarrow|\\iff\b/g, '⇔'],
    [/\$\\uparrow\$|\\uparrow/g, '↑'],
    [/\$\\downarrow\$|\\downarrow/g, '↓'],
    [/\$\\ge\$|\\ge\b|\\geq\b/g, '≥'],
    [/\$\\le\$|\\le\b|\\leq\b/g, '≤'],
    [/\$\\ne\$|\\ne\b|\\neq\b/g, '≠'],
    [/\$\\approx\$|\\approx\b/g, '≈'],
    [/\$\\times\$|\\times\b/g, '×'],
    [/\$\\div\$|\\div\b/g, '÷'],
    [/\$\\pm\$|\\pm\b/g, '±'],
    [/\$\\infty\$|\\infty\b/g, '∞']
  ];

  for (const [pattern, replacement] of latexReplacements) {
    text = text.replace(pattern, replacement);
  }

  // Strip remaining single $ wrappers around simple inline expressions
  text = text.replace(/\$([^$\n]+)\$/g, '$1');

  return text.trim();
}

/**
 * 清理 Mermaid mindmap 節點外框語法，例如：
 * root((主題)) -> 主題
 * id["節點 [01:23]"] -> 節點 [01:23]
 * ((圓形)) / {{六角}} / [[方框]] / (圓角)
 * 同時完整保留 [MM:SS] 時間戳記
 */
export function cleanMermaidNodeLabel(rawLine: string): string {
  let s = rawLine.trim();

  // Remove optional leading list marker if user mixed "- " inside mindmap
  s = s.replace(/^[-*+]\s+/, '');

  // Match optional nodeId prefix before shape brackets, e.g., root((...)), id1["..."], nodeA(...)
  const prefixMatch = s.match(/^[A-Za-z0-9_-]+\s*(\(\(.*\)\)|\{\{.*\}\}|\[\[.*\]\]|\[\(.*\)\]|\)\).*(\(\()|\(.*\)|\[.*\])$/);
  if (prefixMatch) {
    // Only strip prefix if it's not a timestamp like [01:23]
    const innerPart = prefixMatch[1];
    if (!/^\[\d{1,2}:\d{2}(?::\d{2})?\]$/.test(innerPart)) {
      s = innerPart;
    }
  }

  // Unwrap double/triple brackets: (((...))), ((...)), {{...}}, [[...]], [(...)], ))...((
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s
      .replace(/^\(\(\((.+)\)\)\)$/, '$1')
      .replace(/^\(\((.+)\)\)$/, '$1')
      .replace(/^\{\{(.+)\}\}$/, '$1')
      .replace(/^\[\[(.+)\]\]$/, '$1')
      .replace(/^\[\((.+)\)\]$/, '$1')
      .replace(/^\)\)(.+)\(\($/, '$1')
      .trim();
  }

  // Unwrap single outer (...) if the whole string is wrapped in (...)
  if (/^\([^()]+\)$/.test(s) && !/^\(\d{1,2}:\d{2}(?::\d{2})?\)$/.test(s)) {
    s = s.slice(1, -1).trim();
  }

  // Unwrap single outer [...] ONLY if it is not a standalone timestamp [MM:SS]
  // and does not start with a [MM:SS] timestamp at the beginning of the string
  if (
    /^\[.+\]$/.test(s) &&
    !/^\[\d{1,2}:\d{2}(?::\d{2})?\]$/.test(s) &&
    !/^\[\d{1,2}:\d{2}(?::\d{2})?\].+/.test(s)
  ) {
    s = s.slice(1, -1).trim();
  }

  // Unwrap surrounding quotes "..." or '...'
  s = s.replace(/^["'](.+)["']$/, '$1').trim();

  // Normalize (MM:SS) into [MM:SS] so timestamp badges work uniformly
  s = s.replace(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/g, '[$1]');

  return normalizeMathAndMarkdownText(s);
}

/**
 * 擷取文字中的所有 [MM:SS] 或 [HH:MM:SS] 時間戳記
 */
export function extractTimestamps(text: string): MindMapTimestamp[] {
  const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
  const results: MindMapTimestamp[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1];
    const seconds = parseTimeToSeconds(raw);
    results.push({ raw, seconds });
  }
  return results;
}

/**
 * 解析 Mermaid `mindmap` 縮排語法為樹狀結構
 */
function parseMermaidMindmapBlock(mindmapText: string, fallbackTitle: string): RawTreeNode {
  const lines = mindmapText.replace(/\r\n/g, '\n').split('\n');
  const stack: { indent: number; node: RawTreeNode }[] = [];
  const topNodes: RawTreeNode[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('%%') || /^mindmap\b/i.test(trimmed)) {
      continue;
    }
    if (/^```/.test(trimmed)) {
      continue;
    }

    // Calculate indentation (1 tab = 2 spaces)
    const expanded = rawLine.replace(/\t/g, '  ');
    const indent = expanded.match(/^\s*/)?.[0].length ?? 0;
    const label = cleanMermaidNodeLabel(trimmed);
    if (!label) continue;

    const newNode: RawTreeNode = { label, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      topNodes.push(newNode);
    } else {
      stack[stack.length - 1].node.children.push(newNode);
    }

    stack.push({ indent, node: newNode });
  }

  if (topNodes.length === 1) {
    return topNodes[0];
  }

  return {
    label: fallbackTitle || '核心主題',
    children: topNodes
  };
}

/**
 * 若單行項目形如 `[00:27] **後端完成度回報**：陳工程師回報...` 且長度較長，
 * 自動拆分為「重點標題節點」與「詳細說明子節點」，讓前 2~3 層視覺如 NotebookLM 般精煉！
 */
function splitKeyPointAndDetail(rawText: string): { title: string; detail?: string } {
  const normalized = normalizeMathAndMarkdownText(rawText)
    .replace(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/g, '[$1]');

  // Pattern 1: Optional [MM:SS] + **Bold Title** + (: or ： or — or -) + Detail
  const boldColonMatch = normalized.match(
    /^((?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)*)\*\*([^*]+)\*\*(?:\s*(\[\d{1,2}:\d{2}(?::\d{2})?\]))?\s*[:：－—-]\s*(.+)$/
  );
  if (boldColonMatch) {
    const prefixTime = boldColonMatch[1] || '';
    const boldTitle = boldColonMatch[2].trim();
    const midTime = boldColonMatch[3] ? ` ${boldColonMatch[3]}` : '';
    const detailText = boldColonMatch[4].trim().replace(/\*\*([^*]+)\*\*/g, '$1');
    if (detailText.length >= 6) {
      return {
        title: `${prefixTime}${boldTitle}${midTime}`.trim(),
        detail: detailText
      };
    }
  }

  // Pattern 2: Plain Title + ： + Detail (when title is short <= 24 chars and detail is >= 10 chars)
  const cleanNoBold = normalized.replace(/\*\*([^*]+)\*\*/g, '$1');
  const plainColonMatch = cleanNoBold.match(/^([^:：]{2,26})[：:]\s*(.{8,})$/);
  if (plainColonMatch && !/^\d+$/.test(plainColonMatch[1].trim())) {
    const left = plainColonMatch[1].trim();
    const right = plainColonMatch[2].trim();
    // Avoid splitting if left is just a URL scheme or time
    if (!/https?$/i.test(left)) {
      return {
        title: left,
        detail: right
      };
    }
  }

  return {
    title: cleanNoBold
  };
}

/**
 * 解析標準 Markdown（標題、清單項目、縮排與段落）為階層樹
 */
function parseMarkdownToRawTree(markdown: string, fallbackTitle: string): RawTreeNode {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  const root: RawTreeNode = {
    label: fallbackTitle || '重點整理心智圖',
    children: []
  };

  // Track heading stack: { level: 1..6, node: RawTreeNode }
  const headingStack: { level: number; node: RawTreeNode }[] = [{ level: 0, node: root }];
  // Track list item indentation stack under current heading
  let listStack: { indent: number; node: RawTreeNode }[] = [];

  let inCodeBlock = false;
  let hasSingleH1UsedAsRoot = false;

  // Count how many H1 (# ) exist in the document
  const h1Count = lines.filter((l) => /^#\s+/.test(l.trim())).length;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (/^```/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip empty lines, horizontal rules, or markdown table borders
    if (!trimmed || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed) || /^\|[-:| ]+\|$/.test(trimmed)) {
      continue;
    }

    // 1. Check Heading (# to ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = normalizeMathAndMarkdownText(
        headingMatch[2].replace(/\*\*([^*]+)\*\*/g, '$1')
      );

      listStack = [];

      // If there's only one H1 and root still has no children, adopt it as the root label
      if (level === 1 && h1Count === 1 && root.children.length === 0 && !hasSingleH1UsedAsRoot) {
        root.label = headingText;
        hasSingleH1UsedAsRoot = true;
        headingStack.length = 1;
        headingStack[0] = { level: 1, node: root };
        continue;
      }

      const headingNode: RawTreeNode = {
        label: headingText,
        children: []
      };

      while (headingStack.length > 1 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }

      headingStack[headingStack.length - 1].node.children.push(headingNode);
      headingStack.push({ level, node: headingNode });
      continue;
    }

    // 2. Check Bullet or Numbered List Item (-, *, +, 1., 2.)
    const listMatch = rawLine.replace(/\t/g, '  ').match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const itemText = listMatch[2].trim();
      const { title, detail } = splitKeyPointAndDetail(itemText);

      const itemNode: RawTreeNode = {
        label: title,
        children: detail ? [{ label: detail, children: [] }] : []
      };

      while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
        listStack.pop();
      }

      if (listStack.length === 0) {
        headingStack[headingStack.length - 1].node.children.push(itemNode);
      } else {
        listStack[listStack.length - 1].node.children.push(itemNode);
      }

      listStack.push({ indent, node: itemNode });
      continue;
    }

    // 3. Check Markdown Table Row: | col1 | col2 |
    if (/^\|.+\|$/.test(trimmed)) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => normalizeMathAndMarkdownText(c.replace(/\*\*([^*]+)\*\*/g, '$1')))
        .filter(Boolean);
      if (cells.length >= 2) {
        const rowTitle = cells[0];
        const rowDetail = cells.slice(1).join(' ｜ ');
        headingStack[headingStack.length - 1].node.children.push({
          label: rowTitle,
          children: rowDetail ? [{ label: rowDetail, children: [] }] : []
        });
      }
      continue;
    }

    // 4. Plain paragraph or blockquote (> ...)
    const cleanPara = trimmed.replace(/^>\s*/, '');
    const { title, detail } = splitKeyPointAndDetail(cleanPara);
    const paraNode: RawTreeNode = {
      label: title,
      children: detail ? [{ label: detail, children: [] }] : []
    };
    headingStack[headingStack.length - 1].node.children.push(paraNode);
  }

  // If root only has 1 child and root had generic fallback title, promote or keep clean
  return root;
}

/**
 * 計算並裝飾完整 MindMapNode 樹（加上唯一 ID、depth、branchIndex、totalDescendants 與時間戳）
 */
function enrichTree(
  raw: RawTreeNode,
  depth: number = 0,
  branchIndex: number = 0,
  pathPrefix: string = 'node_0'
): MindMapNode {
  const children: MindMapNode[] = raw.children.map((child, idx) => {
    const childBranchIdx = depth === 0 ? idx : branchIndex;
    return enrichTree(child, depth + 1, childBranchIdx, `${pathPrefix}_${idx}`);
  });

  const totalDescendants = children.reduce(
    (sum, c) => sum + 1 + c.totalDescendants,
    0
  );

  return {
    id: pathPrefix,
    label: raw.label,
    timestamps: extractTimestamps(raw.label),
    children,
    depth,
    branchIndex,
    totalDescendants
  };
}

/**
 * 主入口：自動判斷輸入內容為 Mermaid mindmap、含 mermaid 區塊之 Markdown、純縮排大綱或一般 Markdown，
 * 並轉換為 NotebookLM 風格的互動式心智圖樹狀資料結構。
 */
export function parseTextToMindMap(text: string, fallbackTitle: string = '重點整理'): MindMapNode {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return enrichTree({
      label: fallbackTitle || '尚無重點內容',
      children: []
    });
  }

  // Case 1: Contains ```mermaid mindmap ... ``` block
  const fencedMermaidMatch = trimmed.match(/```(?:mermaid)?\s*\n(\s*mindmap\b[\s\S]*?)```/i);
  if (fencedMermaidMatch) {
    const rawTree = parseMermaidMindmapBlock(fencedMermaidMatch[1], fallbackTitle);
    return enrichTree(rawTree);
  }

  // Case 2: Raw text starting with "mindmap"
  const firstNonEmpty = trimmed.split('\n').find((l) => l.trim().length > 0)?.trim() || '';
  if (/^mindmap\b/i.test(firstNonEmpty)) {
    const rawTree = parseMermaidMindmapBlock(trimmed, fallbackTitle);
    return enrichTree(rawTree);
  }

  // Case 3: Pure indented text without any markdown headings (#) or list markers (-, *, 1.)
  const hasMarkdownSyntax = /^(#{1,6}|\s*[-*+]|\s*\d+[.)])\s+/m.test(trimmed);
  const hasMultipleIndentedLines =
    trimmed.split('\n').filter((l) => /^\s{2,}\S/.test(l.replace(/\t/g, '  '))).length >= 2;

  if (!hasMarkdownSyntax && hasMultipleIndentedLines) {
    const rawTree = parseMermaidMindmapBlock(trimmed, fallbackTitle);
    return enrichTree(rawTree);
  }

  // Case 4: Standard Markdown (headings, lists, paragraphs, tables)
  const rawTree = parseMarkdownToRawTree(trimmed, fallbackTitle);
  return enrichTree(rawTree);
}
