export interface Document {
  id: number;
  ownerId: number;
  fileName: string;
  filePath: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED'
}

export interface DocumentUploadResponse {
  documentId: number;
  fileName: string;
  filePath: string;
}

export interface Signer {
  id: number;
  documentId: number;
  email: string;
  status: SignerStatus;
  signedAt?: Date;
}

export enum SignerStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED'
}
