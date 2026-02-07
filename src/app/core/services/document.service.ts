import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Document, DocumentUploadResponse, DocumentStatus } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://localhost:8080/api/v1/documents';

  constructor(private http: HttpClient) {}

  uploadDocument(file: File): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getDocuments(status?: DocumentStatus, search?: string): Observable<Document[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Document[]>(this.apiUrl, { params });
  }

  getDocument(id: number): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`);
  }

  downloadDocument(id: number): Observable<Blob> {
    const params = new HttpParams().set('t', Date.now().toString());
    return this.http.get(`${this.apiUrl}/${id}/download`, {
      params,
      responseType: 'blob'
    });
  }

  downloadAsPdf(id: number): Observable<Blob> {
    const params = new HttpParams().set('t', Date.now().toString());
    return this.http.get(`${this.apiUrl}/${id}/download-as-pdf`, {
      params,
      responseType: 'blob'
    });
  }

  downloadAsDocx(id: number): Observable<Blob> {
    const params = new HttpParams().set('t', Date.now().toString());
    return this.http.get(`${this.apiUrl}/${id}/download-as-docx`, {
      params,
      responseType: 'blob'
    });
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  signDocument(id: number, signatureData: any): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${id}/sign`, signatureData);
  }

  emailDocument(id: number, email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/email`, { email });
  }

  addTextToDocument(id: number, textData: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/text`, textData);
  }

  mergePdfs(documentIds: number[]): Observable<DocumentUploadResponse> {
    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/merge`, { documentIds });
  }

  splitPdf(id: number, pageRanges: string): Observable<DocumentUploadResponse[]> {
    return this.http.post<DocumentUploadResponse[]>(`${this.apiUrl}/${id}/split`, { pageRanges });
  }

  editDocument(id: number, editPayload: any): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${id}/edit`, editPayload);
  }

  getEditableHtml(id: number): Observable<string> {
    const params = new HttpParams().set('t', Date.now().toString());
    return this.http.get(`${this.apiUrl}/${id}/edit-html`, {
      params,
      responseType: 'text'
    });
  }

  saveEditableHtml(id: number, html: string): Observable<Document> {
    return this.http.post<Document>(`${this.apiUrl}/${id}/save-html`, { html });
  }
}
