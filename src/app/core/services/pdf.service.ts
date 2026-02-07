import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  async loadPdf(url: string, token?: string | null): Promise<any> {
    const options: any = { url };
    if (token) {
      options.httpHeaders = {
        Authorization: `Bearer ${token}`
      };
    }
    const loadingTask = pdfjsLib.getDocument(options);
    return await loadingTask.promise;
  }

  async loadPdfFromBlob(blob: Blob): Promise<any> {
    const data = await blob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
    return await loadingTask.promise;
  }

  async renderPage(pdfDoc: any, pageNum: number, canvas: HTMLCanvasElement, scale: number = 1.5): Promise<void> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  }

  async getTextItems(pdfDoc: any, pageNum: number, scale: number) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();
    const util = (pdfjsLib as any).Util;

    return textContent.items
      .filter((item: any) => item.str && item.str.trim().length > 0)
      .map((item: any) => {
        const tx = util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = tx[5];
        const height = Math.hypot(tx[2], tx[3]);
        const width = item.width * scale;
        return {
          text: item.str,
          x,
          y,
          width,
          height
        };
      });
  }

  async getPageSize(pdfDoc: any, pageNum: number): Promise<{ width: number; height: number }> {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  }

  downloadPdf(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
