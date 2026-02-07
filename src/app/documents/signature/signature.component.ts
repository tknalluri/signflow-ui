import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { PdfService } from '../../core/services/pdf.service';
import { Document } from '../../core/models/document.model';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-signature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signature.component.html',
  styleUrl: './signature.component.css'
})
export class SignatureComponent implements OnInit {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signatureCanvas', { static: false }) signatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typedCanvas', { static: false }) typedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('signatureOverlay', { static: false }) signatureOverlay!: ElementRef<HTMLDivElement>;
  
  document: Document | null = null;
  pdfDoc: any = null;
  currentPage = 1;
  totalPages = 0;
  scale = 1.5;
  documentId!: number;

  signatureMode: 'draw' | 'type' | 'upload' = 'draw';
  typedSignature = '';
  uploadedSignature: string | null = null;
  signatureImage: string | null = null;
  
  // Drawing
  isDrawing = false;
  ctx: CanvasRenderingContext2D | null = null;

  // Signature position
  signaturePosition = { x: 100, y: 100 };
  signatureSize = { width: 200, height: 100 };
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  isResizing = false;
  resizeHandle: 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null = null;
  resizeStart = { x: 0, y: 0, width: 0, height: 0, mouseX: 0, mouseY: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private pdfService: PdfService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.documentId = +this.route.snapshot.params['id'];
    this.loadDocument();
  }

  loadDocument() {
    this.documentService.getDocument(this.documentId).subscribe({
      next: (doc) => {
        this.document = doc;
        this.loadPdf();
      },
      error: (error) => console.error('Error loading document:', error)
    });
  }

  async loadPdf() {
    try {
      const blob = await firstValueFrom(this.documentService.downloadDocument(this.documentId));
      if (!blob) {
        throw new Error('Failed to download document');
      }
      this.pdfDoc = await this.pdfService.loadPdfFromBlob(blob);
      this.totalPages = this.pdfDoc.numPages;
      await this.renderPage();
    } catch (error) {
      console.error('Error loading PDF:', error);
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

  // Drawing signature
  startDrawing(event: MouseEvent) {
    if (!this.signatureCanvas) return;
    this.isDrawing = true;
    this.ctx = this.signatureCanvas.nativeElement.getContext('2d');
    if (this.ctx) {
      const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
      this.ctx.beginPath();
      this.ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    }
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing || !this.ctx) return;
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature() {
    if (this.signatureCanvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.signatureCanvas.nativeElement.width, this.signatureCanvas.nativeElement.height);
    }
    this.signatureImage = null;
  }

  // Type signature
  generateTypedSignature() {
    if (!this.typedCanvas || !this.typedSignature) return;
    const canvas = this.typedCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '48px "Brush Script MT", cursive';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.typedSignature, canvas.width / 2, canvas.height / 2);
    }
  }

  // Upload signature
  onSignatureFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedSignature = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  hasSignature(): boolean {
    return this.signatureCanvas?.nativeElement.toDataURL() !== this.getEmptyCanvasData() ||
           !!this.typedSignature ||
           !!this.uploadedSignature;
  }

  getEmptyCanvasData(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 350;
    canvas.height = 150;
    return canvas.toDataURL();
  }

  applySignature() {
    if (this.signatureMode === 'draw' && this.signatureCanvas) {
      this.signatureImage = this.signatureCanvas.nativeElement.toDataURL();
    } else if (this.signatureMode === 'type' && this.typedCanvas) {
      this.signatureImage = this.typedCanvas.nativeElement.toDataURL();
    } else if (this.signatureMode === 'upload') {
      this.signatureImage = this.uploadedSignature;
    }

    if (this.signatureImage) {
      this.signatureSize = { width: 200, height: 100 };
    }
  }

  // Drag signature
  startDrag(event: MouseEvent) {
    if (!this.pdfCanvas) return;
    this.isDragging = true;
    const canvasRect = this.pdfCanvas.nativeElement.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - canvasRect.left - this.signaturePosition.x,
      y: event.clientY - canvasRect.top - this.signaturePosition.y
    };
    
    const moveHandler = (e: MouseEvent) => {
      if (this.isDragging) {
        const rect = this.pdfCanvas.nativeElement.getBoundingClientRect();
        this.signaturePosition = {
          x: e.clientX - rect.left - this.dragOffset.x,
          y: e.clientY - rect.top - this.dragOffset.y
        };
      }
    };

    const upHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  startResize(event: MouseEvent, handle: 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se') {
    event.stopPropagation();
    if (!this.pdfCanvas) return;
    this.isResizing = true;
    this.resizeHandle = handle;

    this.resizeStart = {
      x: this.signaturePosition.x,
      y: this.signaturePosition.y,
      width: this.signatureSize.width,
      height: this.signatureSize.height,
      mouseX: event.clientX,
      mouseY: event.clientY
    };

    const moveHandler = (e: MouseEvent) => {
      if (!this.isResizing || !this.resizeHandle || !this.pdfCanvas) return;
      const dx = e.clientX - this.resizeStart.mouseX;
      const dy = e.clientY - this.resizeStart.mouseY;

      let newX = this.resizeStart.x;
      let newY = this.resizeStart.y;
      let newWidth = this.resizeStart.width;
      let newHeight = this.resizeStart.height;

      if (this.resizeHandle.includes('e')) {
        newWidth = this.resizeStart.width + dx;
      }
      if (this.resizeHandle.includes('s')) {
        newHeight = this.resizeStart.height + dy;
      }
      if (this.resizeHandle.includes('w')) {
        newWidth = this.resizeStart.width - dx;
        newX = this.resizeStart.x + dx;
      }
      if (this.resizeHandle.includes('n')) {
        newHeight = this.resizeStart.height - dy;
        newY = this.resizeStart.y + dy;
      }

      const minSize = 40;
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      const canvasRect = this.pdfCanvas.nativeElement.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, canvasRect.width - newWidth));
      newY = Math.max(0, Math.min(newY, canvasRect.height - newHeight));

      this.signaturePosition = { x: newX, y: newY };
      this.signatureSize = { width: newWidth, height: newHeight };
    };

    const upHandler = () => {
      this.isResizing = false;
      this.resizeHandle = null;
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  async confirmSignature() {
    if (!this.signatureImage || !this.pdfCanvas || !this.signatureOverlay || !this.pdfDoc) return;

    const canvasRect = this.pdfCanvas.nativeElement.getBoundingClientRect();
    const overlayRect = this.signatureOverlay.nativeElement.getBoundingClientRect();
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: 1 });

    const scaleX = viewport.width / canvasRect.width;
    const scaleY = viewport.height / canvasRect.height;

    const xPx = overlayRect.left - canvasRect.left;
    const yPx = overlayRect.top - canvasRect.top;

    const signatureData = {
      signatureImage: this.signatureImage,
      page: this.currentPage,
      x: Math.max(0, Math.round(xPx * scaleX)),
      y: Math.max(0, Math.round(yPx * scaleY)),
      width: Math.max(10, Math.round(overlayRect.width * scaleX)),
      height: Math.max(10, Math.round(overlayRect.height * scaleY))
    };

    this.documentService.signDocument(this.documentId, signatureData).subscribe({
      next: () => {
        alert('Document signed successfully!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error signing document:', error);
        alert('Failed to sign document');
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
