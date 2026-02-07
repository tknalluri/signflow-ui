import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { PdfService } from '../../core/services/pdf.service';
import { Document, DocumentStatus } from '../../core/models/document.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documents-list.component.html',
  styleUrl: './documents-list.component.css'
})
export class DocumentsListComponent implements OnInit {
  currentUser: User | null = null;
  documents: Document[] = [];
  loading = false;
  searchTerm = '';
  filterStatus = '';
  isMenuOpen = false;

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private pdfService: PdfService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading = true;
    const status = this.filterStatus as DocumentStatus | undefined;
    this.documentService.getDocuments(status, this.searchTerm).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.loadDocuments();
  }

  onFilterChange() {
    this.loadDocuments();
  }

  viewDocument(id: number) {
    this.router.navigate(['/documents/viewer', id]);
  }

  signDocument(id: number) {
    this.router.navigate(['/documents/signature', id]);
  }

  downloadDocument(id: number, fileName: string) {
    this.documentService.downloadDocument(id).subscribe({
      next: (blob) => {
        this.pdfService.downloadPdf(blob, fileName);
      },
      error: (error) => {
        console.error('Download error:', error);
        alert('Failed to download document');
      }
    });
  }

  convertToPdf(id: number, fileName: string) {
    this.documentService.downloadAsPdf(id).subscribe({
      next: (blob) => {
        const baseName = this.stripExtension(fileName);
        this.downloadBlob(blob, `${baseName}.pdf`);
      },
      error: (error) => {
        console.error('Convert to PDF error:', error);
        alert('Failed to convert to PDF');
      }
    });
  }

  convertToWord(id: number, fileName: string) {
    this.documentService.downloadAsDocx(id).subscribe({
      next: (blob) => {
        const baseName = this.stripExtension(fileName);
        this.downloadBlob(blob, `${baseName}.docx`);
      },
      error: (error) => {
        console.error('Convert to Word error:', error);
        alert('Failed to convert to Word');
      }
    });
  }

  emailDocument(id: number) {
    const email = prompt('Enter email address:');
    if (email) {
      this.documentService.emailDocument(id, email).subscribe({
        next: () => {
          alert('Document sent successfully');
        },
        error: (error) => {
          console.error('Email error:', error);
          alert('Failed to send document');
        }
      });
    }
  }

  deleteDocument(id: number) {
    if (confirm('Are you sure you want to delete this document?')) {
      this.documentService.deleteDocument(id).subscribe({
        next: () => {
          this.loadDocuments();
        },
        error: (error) => {
          console.error('Delete error:', error);
          alert('Failed to delete document');
        }
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  goHome() {
    this.router.navigate(['/dashboard']);
  }

  toggleUserMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeUserMenu() {
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.isMenuOpen = false;
    }
  }

  getInitials(name?: string | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getFileIcon(fileName?: string | null): { icon: string; color: string } {
    const name = (fileName || '').toLowerCase();
    if (name.endsWith('.pdf')) {
      return { icon: 'bi-file-earmark-pdf', color: 'text-danger' };
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return { icon: 'bi-file-earmark-word', color: 'text-primary' };
    }
    return { icon: 'bi-file-earmark-text', color: 'text-secondary' };
  }

  isPdf(fileName?: string | null): boolean {
    return (fileName || '').toLowerCase().endsWith('.pdf');
  }

  isWord(fileName?: string | null): boolean {
    const name = (fileName || '').toLowerCase();
    return name.endsWith('.doc') || name.endsWith('.docx');
  }

  private stripExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index > 0 ? fileName.substring(0, index) : fileName;
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
