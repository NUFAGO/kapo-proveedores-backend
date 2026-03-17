import { FileUpload } from "graphql-upload";

// Tipo Upload para usar en tus interfaces
export type Upload = Promise<FileUpload>;

// Tipos de respuesta para uploads
export interface FileUploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export interface BatchUploadResponse {
  successful: FileUploadResponse[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

// Configuraciones comunes para validaciones del frontend
export const UPLOAD_CONFIGS = {
  // Configuraciones globales
  DOCUMENTOS: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ],
    accept: ".pdf,.doc,.docx,.xls,.xlsx"
  },
  IMAGENES: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    accept: "image/*"
  },
  GENERAL: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ],
    accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*"
  },
  
  // Configuraciones específicas (solo si se necesitan en el futuro)
  DOCUMENTOS_PROVEEDOR: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/webp"
    ],
    accept: ".pdf,.doc,.docx,.xls,.xlsx,image/*"
  },
  LOGOS_PROVEEDOR: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    accept: "image/*"
  },
  PLANTILLAS_DOCUMENTO: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    accept: ".pdf,.doc,.docx"
  },
  EVIDENCIAS_PAGO: {
    maxFileSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
    accept: "image/*,.pdf"
  }
} as const;
