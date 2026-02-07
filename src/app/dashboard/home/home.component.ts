import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  loading = false;
  isMenuOpen = false;

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUserValue;
  }

  ngOnInit() {
  }

  loadDocuments() {
    this.router.navigate(['/documents/list']);
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.uploadFile(file);
    } else {
      alert('Please select a valid PDF file');
    }
  }

  onWordSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      this.uploadFile(file);
    } else {
      alert('Please select a valid Word file');
    }
  }

  uploadFile(file: File) {
    this.loading = true;
    this.documentService.uploadDocument(file).subscribe({
      next: (response) => {
        console.log('Upload successful:', response);
        this.loading = false;
      },
      error: (error) => {
        console.error('Upload error:', error);
        alert('Failed to upload document');
        this.loading = false;
      }
    });
  }

  logout() {
    this.authService.logout();
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

}
