import { Component, ElementRef, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { PdfService } from '../../core/services/pdf.service';
import { Document } from '../../core/models/document.model';
import { firstValueFrom } from 'rxjs';

interface TextBlock {
  page: number;
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

interface TextRun {
  id: number;
  text: string;
  editedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  fontSizePx: number;
  fontSizePdf: number;
}

interface SelectionEdit {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSizePx: number;
  fontSizePdf: number;
}

interface ImageBlock {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.css'
})
export class EditorComponent implements OnInit {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('textRunEl') textRunElements!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('htmlEditor', { static: false }) htmlEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('htmlFrame', { static: false }) htmlFrame!: ElementRef<HTMLIFrameElement>;

  document: Document | null = null;
  pdfDoc: any = null;
  currentPage = 1;
  totalPages = 0;
  scale = 1.2;
  loading = false;
  documentId!: number;
  canvasWidth = 0;
  canvasHeight = 0;
  pageWidthPdf = 0;
  pageHeightPdf = 0;

  placeImageNext = false;
  textFontSize = 14;
  imageWidth = 140;
  imageHeight = 80;
  selectedImageDataUrl: string | null = null;

  textBlocks: TextBlock[] = [];
  imageBlocks: ImageBlock[] = [];
  saving = false;
  textRuns: TextRun[] = [];
  selectionEdits: SelectionEdit[] = [];
  isSelecting = false;
  selectionStart: { x: number; y: number } | null = null;
  selectionEnd: { x: number; y: number } | null = null;
  selectedRuns: TextRun[] = [];
  activeSelectionEdit: SelectionEdit | null = null;
  showTextLayer = false;
  htmlLoading = false;
  htmlReady = false;
  htmlContent = '';
  htmlDoc = '';
  htmlDocSafe: SafeHtml | null = null;
  isBoldActive = false;
  isItalicActive = false;
  isUnderlineActive = false;
  fullPageLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private pdfService: PdfService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.documentId = +this.route.snapshot.params['id'];
    this.loadDocument();
  }

  loadDocument() {
    this.loading = true;
    this.documentService.getDocument(this.documentId).subscribe({
      next: (doc) => {
        this.document = doc;
        this.loadEditableHtml();
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.loading = false;
      }
    });
  }

  loadEditableHtml() {
    this.htmlLoading = true;
    this.documentService.getEditableHtml(this.documentId).subscribe({
      next: (html) => {
        this.htmlContent = html || '';
        this.htmlDoc = this.wrapHtmlDocument(this.htmlContent);
        this.htmlDocSafe = this.sanitizer.bypassSecurityTrustHtml(this.htmlDoc);
        this.htmlLoading = false;
        this.htmlReady = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading editable HTML:', error);
        this.htmlLoading = false;
        this.loading = false;
      }
    });
  }

  onFrameLoad() {
    const frame = this.htmlFrame?.nativeElement;
    if (!frame || !frame.contentDocument) return;
    const doc = frame.contentDocument;
    doc.open();
    doc.write(this.htmlDoc);
    doc.close();
    doc.designMode = 'on';
    doc.addEventListener('selectionchange', () => this.updateFormatState());
    doc.addEventListener('keyup', () => this.updateFormatState());
    doc.addEventListener('mouseup', () => this.updateFormatState());
  }

  execEditorCommand(command: string) {
    const frame = this.htmlFrame?.nativeElement;
    const doc = frame?.contentDocument;
    if (!doc) return;
    doc.execCommand(command, false);
    doc.body?.focus();
    this.updateFormatState();
  }

  updateFormatState() {
    const frame = this.htmlFrame?.nativeElement;
    const doc = frame?.contentDocument;
    if (!doc) return;
    this.isBoldActive = doc.queryCommandState('bold');
    this.isItalicActive = doc.queryCommandState('italic');
    this.isUnderlineActive = doc.queryCommandState('underline');
  }

  wrapHtmlDocument(bodyHtml: string): string {
    const lower = bodyHtml.toLowerCase();
    if (lower.includes('<html')) {
      return bodyHtml.replace(/<head>/i, `<head>${this.getEditorBaseStyles()}`);
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${this.getEditorBaseStyles()}</head><body>${bodyHtml}</body></html>`;
  }

  getEditorBaseStyles(): string {
    return `<style>
      body { font-family: Arial, sans-serif; color: #212529; background: #f1f3f5; margin: 0; padding: 24px 0; }
      .page { width: 794px; min-height: 1123px; margin: 0 auto 24px auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid #e9ecef; padding: 48px 56px; box-sizing: border-box; page-break-after: always; }
      p { margin: 0 0 12px 0; white-space: pre-wrap; word-break: break-word; }
      p:last-child { margin-bottom: 0; }
      @media (max-width: 900px) { .page { width: 100%; min-height: auto; padding: 24px; } }
    </style>`;
  }

  async loadPdf() {
    try {
      const blob = await firstValueFrom(this.documentService.downloadDocument(this.documentId));
      if (!blob) {
        throw new Error('Failed to download document');
      }
      const freshBlob = new Blob([blob], { type: 'application/pdf' });
      this.pdfDoc = await this.pdfService.loadPdfFromBlob(freshBlob);
      this.totalPages = this.pdfDoc.numPages;
      this.loading = false;
      setTimeout(() => {
        this.renderPage();
      }, 0);
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.loading = false;
    }
  }

  async renderPage() {
    if (!this.pdfDoc || !this.pdfCanvas) return;
    await this.pdfService.renderPage(
      this.pdfDoc,
      this.currentPage,
      this.pdfCanvas.nativeElement,
      this.scale
    );
    this.canvasWidth = this.pdfCanvas.nativeElement.width;
    this.canvasHeight = this.pdfCanvas.nativeElement.height;
    const pageSize = await this.pdfService.getPageSize(this.pdfDoc, this.currentPage);
    this.pageWidthPdf = pageSize.width;
    this.pageHeightPdf = pageSize.height;
    await this.loadTextRuns();
  }

  async loadTextRuns() {
    if (!this.pdfDoc) return;
    const items = await this.pdfService.getTextItems(this.pdfDoc, this.currentPage, this.scale);
    this.textRuns = items.map((item: any, index: number) => {
      const top = item.y - item.height;
      const pdfX = item.x / this.scale;
      const pdfY = top / this.scale;
      const pdfWidth = item.width / this.scale;
      const pdfHeight = item.height / this.scale;
      return {
        id: index,
        text: item.text,
        editedText: item.text,
        x: item.x,
        y: top,
        width: item.width,
        height: item.height,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        fontSizePx: item.height,
        fontSizePdf: pdfHeight
      };
    });
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.renderPage();
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.renderPage();
    }
  }

  zoomIn() {
    this.scale += 0.2;
    this.renderPage();
  }

  zoomOut() {
    if (this.scale > 0.6) {
      this.scale -= 0.2;
      this.renderPage();
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImageDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  armImagePlacement() {
    if (!this.selectedImageDataUrl) return;
    this.placeImageNext = true;
  }

  onCanvasClick(event: MouseEvent) {
    if (!this.pdfCanvas) return;
    const rect = this.pdfCanvas.nativeElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const pdfX = clickX / this.scale;
    const pdfY = clickY / this.scale;

    if (this.placeImageNext && this.selectedImageDataUrl) {
      this.imageBlocks.push({
        page: this.currentPage,
        x: pdfX,
        y: pdfY,
        width: this.imageWidth,
        height: this.imageHeight,
        dataUrl: this.selectedImageDataUrl
      });
      this.placeImageNext = false;
      return;
    }
  }

  startSelection(event: MouseEvent) {
    this.showTextLayer = true;
    const target = event.target as HTMLElement | null;
    if (target && target.closest && target.closest('.text-run')) {
      return;
    }
    if (!this.pdfCanvas) return;
    const rect = this.pdfCanvas.nativeElement.getBoundingClientRect();
    this.isSelecting = true;
    this.selectionStart = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.selectionEnd = { ...this.selectionStart };
    this.selectedRuns = [];
    this.activeSelectionEdit = null;
  }

  updateSelection(event: MouseEvent) {
    if (!this.isSelecting || !this.pdfCanvas || !this.selectionStart) return;
    const rect = this.pdfCanvas.nativeElement.getBoundingClientRect();
    this.selectionEnd = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.updateSelectedRuns();
  }

  finishSelection() {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    const rect = this.getSelectionRect();
    if (this.selectedRuns.length) {
      this.openSelectionEditor();
      return;
    }
    if (rect && rect.width < 6 && rect.height < 6) {
      this.activeSelectionEdit = {
        page: this.currentPage,
        x: rect.x / this.scale,
        y: rect.y / this.scale,
        width: 180 / this.scale,
        height: 32 / this.scale,
        text: '',
        fontSizePx: this.textFontSize * this.scale,
        fontSizePdf: this.textFontSize
      };
    }
  }

  getSelectionRect() {
    if (!this.selectionStart || !this.selectionEnd) return null;
    const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionStart.x - this.selectionEnd.x);
    const height = Math.abs(this.selectionStart.y - this.selectionEnd.y);
    return { x, y, width, height };
  }

  updateSelectedRuns() {
    const rect = this.getSelectionRect();
    if (!rect) return;
    this.selectedRuns = this.textRuns.filter((run) => {
      const intersects =
        run.x < rect.x + rect.width &&
        run.x + run.width > rect.x &&
        run.y < rect.y + rect.height &&
        run.y + run.height > rect.y;
      return intersects;
    });
  }

  openSelectionEditor() {
    if (!this.selectedRuns.length) return;
    const rect = this.getSelectionRect();
    if (!rect) return;
    const text = this.selectedRuns.map((run) => run.editedText).join(' ');
    const fontSizePx = Math.max(
      10,
      Math.round(this.selectedRuns.reduce((sum, run) => sum + run.fontSizePx, 0) / this.selectedRuns.length)
    );
    const fontSizePdf = Math.max(
      8,
      Math.round(this.selectedRuns.reduce((sum, run) => sum + run.fontSizePdf, 0) / this.selectedRuns.length)
    );
    this.activeSelectionEdit = {
      page: this.currentPage,
      x: rect.x / this.scale,
      y: rect.y / this.scale,
      width: rect.width / this.scale,
      height: rect.height / this.scale,
      text,
      fontSizePx,
      fontSizePdf
    };
  }

  getOverlayLeft(x: number): number {
    return x * this.scale;
  }

  getOverlayTop(y: number): number {
    return y * this.scale;
  }

  getTextBlocksForPage(): TextBlock[] {
    return this.textBlocks.filter((block) => block.page === this.currentPage);
  }

  getImageBlocksForPage(): ImageBlock[] {
    return this.imageBlocks.filter((block) => block.page === this.currentPage);
  }

  removeTextBlock(index: number) {
    this.textBlocks.splice(index, 1);
  }

  removeImageBlock(index: number) {
    this.imageBlocks.splice(index, 1);
  }

  onRunBlur(event: Event, run: TextRun) {
    const target = event.target as HTMLElement;
    run.editedText = (target.textContent || '').trimEnd();
  }

  syncEditsFromDom() {
    if (!this.textRunElements) return;
    const map = new Map<number, string>();
    this.textRunElements.forEach((elRef) => {
      const el = elRef.nativeElement;
      const idAttr = el.getAttribute('data-run-id');
      if (!idAttr) return;
      const id = Number(idAttr);
      map.set(id, (el.textContent || '').trimEnd());
    });
    this.textRuns = this.textRuns.map((run) => {
      if (map.has(run.id)) {
        return { ...run, editedText: map.get(run.id) as string };
      }
      return run;
    });
  }

  onOverlayFocusIn() {
    this.showTextLayer = true;
  }

  onOverlayFocusOut(event: FocusEvent) {
    const currentTarget = event.currentTarget as HTMLElement | null;
    setTimeout(() => {
      if (!currentTarget) {
        this.showTextLayer = false;
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      this.showTextLayer = !!(active && currentTarget.contains(active));
    }, 0);
  }

  onOverlayMouseLeave() {
    const active = document.activeElement as HTMLElement | null;
    this.showTextLayer = !!(active && active.closest('.overlay'));
  }

  revertRun(run: TextRun) {
    run.editedText = run.text;
  }

  activateEditedRun(run: TextRun) {
    this.showTextLayer = true;
    setTimeout(() => {
      const element = this.textRunElements
        ?.toArray()
        .find((el) => el.nativeElement.getAttribute('data-run-id') === String(run.id));
      element?.nativeElement.focus();
    }, 0);
  }

  getEditedRuns(): TextRun[] {
    return this.textRuns.filter((run) => run.editedText !== run.text);
  }

  getEditedRunsForPage(): TextRun[] {
    return this.getEditedRuns();
  }

  getSelectionEditsForPage(): SelectionEdit[] {
    return this.selectionEdits.filter((edit) => edit.page === this.currentPage);
  }

  commitSelectionEdit() {
    if (!this.activeSelectionEdit) return;
    const text = this.activeSelectionEdit.text.trim();
    if (text) {
      this.selectionEdits.push({ ...this.activeSelectionEdit, text });
      this.selectedRuns.forEach((run) => {
        run.editedText = '';
      });
    }
    this.activeSelectionEdit = null;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.selectedRuns = [];
  }

  cancelSelectionEdit() {
    this.activeSelectionEdit = null;
  }

  handleSelectionKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.commitSelectionEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSelectionEdit();
    }
  }

  onSelectionInput(event: Event) {
    if (!this.activeSelectionEdit) return;
    const target = event.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    this.activeSelectionEdit.height = target.scrollHeight / this.scale;
    this.activeSelectionEdit.width = target.clientWidth / this.scale;
  }

  buildReplaceBlocks() {
    const runBlocks = this.getEditedRuns().map((run) => {
      const oldLen = Math.max(1, run.text.length);
      const newLen = Math.max(1, run.editedText.length);
      const widthScale = Math.max(1, newLen / oldLen);
      const maxLineWidth = this.pageWidthPdf > 0 ? Math.max(10, this.pageWidthPdf - run.pdfX) : run.pdfWidth;
      return {
        page: this.currentPage,
        x: run.pdfX,
        y: run.pdfY,
        width: Math.min(Math.max(10, run.pdfWidth * widthScale), maxLineWidth),
        height: Math.max(10, run.pdfHeight),
        text: run.editedText,
        fontSize: Math.max(8, Math.round(run.fontSizePdf))
      };
    });
    const selectionBlocks = this.selectionEdits.map((edit) => ({
      page: edit.page,
      x: edit.x,
      y: edit.y,
      width: edit.width,
      height: edit.height,
      text: edit.text,
      fontSize: edit.fontSizePdf
    }));
    return [...runBlocks, ...selectionBlocks];
  }

  async saveEdits() {
    const frame = this.htmlFrame?.nativeElement;
    const html = frame?.contentDocument?.body?.innerHTML || '';
    if (!html || !html.trim()) return;
    this.saving = true;
    this.fullPageLoading = true;
    try {
      await firstValueFrom(this.documentService.saveEditableHtml(this.documentId, html));
      window.location.reload();
    } catch (error) {
      console.error('Error saving edits:', error);
      this.fullPageLoading = false;
    } finally {
      this.saving = false;
    }
  }

  async downloadEdited() {
    try {
      const blob = await firstValueFrom(this.documentService.downloadDocument(this.documentId));
      const fileName = this.document?.fileName || 'document.pdf';
      this.pdfService.downloadPdf(blob, fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  }

  async downloadWord() {
    // Word export reverted
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
