import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentService } from '../../core/services/document.service';
import { PdfService } from '../../core/services/pdf.service';
import { Document } from '../../core/models/document.model';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './viewer.component.html',
  styleUrl: './viewer.component.css'
})
export class ViewerComponent implements OnInit {
  @ViewChild('pdfCanvas', { static: false }) pdfCanvas!: ElementRef<HTMLCanvasElement>;
  
  document: Document | null = null;
  pdfDoc: any = null;
  currentPage = 1;
  totalPages = 0;
  scale = 1.5;
  loading = false;
  documentId!: number;

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
    this.loading = true;
    this.documentService.getDocument(this.documentId).subscribe({
      next: (doc) => {
        this.document = doc;
        this.loadPdf();
      },
      error: (error) => {
        console.error('Error loading document:', error);
        this.loading = false;
      }
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
      this.loading = false;
      await this.renderPage();
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

  async zoomIn() {
    this.scale += 0.25;
    await this.renderPage();
  }

  async zoomOut() {
    if (this.scale > 0.5) {
      this.scale -= 0.25;
      await this.renderPage();
    }
  }

  editDocument() {
    this.router.navigate(['/documents/editor', this.documentId]);
  }

  signDocument() {
    this.router.navigate(['/documents/signature', this.documentId]);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
