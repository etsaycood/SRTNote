import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { SlideItem } from '../types';

// Set up PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export type PDFProgressCallback = (current: number, total: number, message: string) => void;

/**
 * Converts a PDF file into an array of SlideItem objects by rendering each page to canvas
 */
export async function convertPdfToSlides(
  file: File | ArrayBuffer,
  fileName = '簡報',
  totalDuration = 0,
  onProgress?: PDFProgressCallback
): Promise<SlideItem[]> {
  try {
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    const slides: SlideItem[] = [];
    const targetDuration = totalDuration > 0 ? totalDuration : numPages * 20;
    const step = numPages > 1 ? targetDuration / numPages : 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(pageNum, numPages, `正在轉換 PDF 投影片第 ${pageNum} / ${numPages} 頁...`);

      const page = await pdfDoc.getPage(pageNum);

      // Render at sharp HD resolution (target around 1600px width)
      const baseViewport = page.getViewport({ scale: 1.0 });
      const targetScale = Math.min(2.5, Math.max(1.0, 1600 / (baseViewport.width || 800)));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('無法取得 Canvas 繪製上下文');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page content
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // Convert to efficient Blob URL instead of giant Base64 Data URL to save memory & JSON size
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
      );
      const imageUrl = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.88);

      slides.push({
        id: `slide_${Date.now()}_${pageNum}`,
        pageNumber: pageNum,
        title: `${fileName.replace(/\.[^/.]+$/, '')} - 第 ${pageNum} 頁`,
        timestamp: Math.round((pageNum - 1) * step),
        imageUrl: imageUrl
      });
    }

    return slides;
  } catch (err: any) {
    console.error('PDF Conversion Error:', err);
    throw new Error(`PDF 解析失敗：${err.message || '檔案格式可能損毀或受密碼保護'}`);
  }
}
