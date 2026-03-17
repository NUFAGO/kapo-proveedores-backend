import { getBucket } from "../../infraestructura/config/googleCloudStorage";
import sharp from "sharp";

// Tipos para configuración
export interface FileUploadConfig {
  maxFileSize?: number; // en bytes
  allowedMimeTypes?: string[];
  folder: string;
  optimizeImages?: boolean;
  generateUniqueNames?: boolean;
}

export interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: Array<{
    file: any;
    error: string;
  }>;
}

/**
 * Servicio reutilizable para subida de archivos a Google Cloud Storage
 */
export class FileUploadService {
  /**
   * Obtiene el bucket usando la configuración centralizada
   */
  private static getBucket() {
    return getBucket();
  }

  /**
   * Sube un archivo desde GraphQL Upload con configuración personalizable
   */
  static async uploadGraphQLFile(
    file: any,
    config: FileUploadConfig
  ): Promise<UploadResult> {
    try {

      // Apollo Upload: múltiples formatos posibles
      let createReadStream, filename, mimetype;

      if (file.createReadStream && typeof file.createReadStream === 'function') {
        // Caso 1: file tiene createReadStream directamente
        ({ createReadStream, filename, mimetype } = file);
      } else if (file.file && file.file.createReadStream && typeof file.file.createReadStream === 'function') {
        // Caso 2: propiedades están en file.file (ya resuelto)
        ({ filename, mimetype, createReadStream } = file.file);
      } else if (file.promise && typeof file.promise === 'object') {
        // Caso 3: objeto Upload de Apollo que necesita resolverse
        const uploadResult = await file.promise;
        if (uploadResult && uploadResult.createReadStream && typeof uploadResult.createReadStream === 'function') {
          ({ filename, mimetype, createReadStream } = uploadResult);
        } else {
          throw new Error('El objeto Upload de Apollo no tiene la estructura esperada después de resolverse');
        }
      } else if (file instanceof Promise) {
        // Caso 4: el archivo ya es una Promise resuelta
        const uploadResult = await file;
        
        if (uploadResult && uploadResult.createReadStream && typeof uploadResult.createReadStream === 'function') {
          ({ filename, mimetype, createReadStream } = uploadResult);
        } else {
          throw new Error(`La Promise resuelta no tiene la estructura esperada. Estructura: ${JSON.stringify(Object.keys(uploadResult || {}))}`);
        }
      } else {
        throw new Error(`Formato de archivo no reconocido. Estructura: ${JSON.stringify(Object.keys(file))}`);
      }

      // Validaciones
      this.validateFile(mimetype, file, config);

      // Usar nombre original, pero si ya existe agregar (1), (2), etc.
      let fileName = filename;
      
      // Verificar si ya existe el archivo y agregar número si es necesario
      if (config.generateUniqueNames !== false) {
        const bucket = getBucket();
        const originalPath = `${config.folder}/${fileName}`;
        
        try {
          // Verificar si el archivo ya existe
          const [exists] = await bucket.file(originalPath).exists();
          
          if (exists) {
            // Extraer nombre y extensión
            const lastDotIndex = fileName.lastIndexOf('.');
            const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
            const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';
            
            // Buscar el siguiente número disponible
            let counter = 1;
            let newFileName;
            let fileExists;
            
            do {
              newFileName = `${nameWithoutExt}(${counter})${extension}`;
              const newPath = `${config.folder}/${newFileName}`;
              [fileExists] = await bucket.file(newPath).exists();
              counter++;
            } while (fileExists);
            
            fileName = newFileName;
          }
        } catch (error) {
          // Si hay error al verificar existencia, usar nombre original
          console.warn('Error al verificar existencia de archivo:', error);
        }
      }

      const fullPath = `${config.folder}/${fileName}`;

      // Procesar archivo según tipo
      if (config.optimizeImages && this.isImageFile(mimetype)) {
        return await this.uploadAndOptimizeImage(createReadStream, fullPath, filename);
      } else {
        const buffer = await this.streamToBuffer(createReadStream());
        const url = await this.uploadBuffer(buffer, fullPath, mimetype);
        return {
          url,
          filename: fullPath,
          originalName: filename,
          size: buffer.length,
          mimetype
        };
      }
    } catch (error) {
      console.error("Error al subir archivo GraphQL:", error);
      throw new Error(`Error al subir archivo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sube múltiples archivos en lote con configuración personalizable
   */
  static async uploadMultipleGraphQLFiles(
    files: any[],
    config: FileUploadConfig,
    batchSize: number = 3
  ): Promise<BatchUploadResult> {
    const successful: UploadResult[] = [];
    const failed: Array<{ file: any; error: string }> = [];

    // Procesar en lotes para mejor rendimiento
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.uploadGraphQLFile(file, config);
          return { success: true, result };
        } catch (error) {
          return {
            success: false,
            file,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          if (result.value.success && result.value.result) {
            successful.push(result.value.result);
          } else {
            failed.push({
              file: result.value.file,
              error: result.value.error || "Error desconocido"
            });
          }
        } else {
          // Promesa rechazada
          failed.push({
            file: null,
            error: result.reason?.message || "Error desconocido"
          });
        }
      });
    }

    return { successful, failed };
  }

  /**
   * Sube un buffer directamente
   */
  static async uploadBuffer(
    buffer: Buffer,
    destFileName: string,
    contentType: string
  ): Promise<string> {
    const file = this.getBucket().file(destFileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (error) => reject(error));

      stream.on("finish", async () => {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${this.getBucket().name}/${destFileName}`;
        resolve(publicUrl);
      });

      stream.end(buffer);
    });
  }

  /**
   * Elimina un archivo del bucket
   */
  static async deleteFile(fileName: string): Promise<void> {
    await this.getBucket().file(fileName).delete();
  }

  /**
   * Verifica si un archivo existe
   */
  static async fileExists(fileName: string): Promise<boolean> {
    const [exists] = await this.getBucket().file(fileName).exists();
    return exists;
  }

  // Métodos privados auxiliares

  private static validateFile(mimetype: string, file: any, config: FileUploadConfig): void {
    // Validar tipos MIME permitidos
    if (config.allowedMimeTypes && !config.allowedMimeTypes.includes(mimetype)) {
      throw new Error(`Tipo de archivo no permitido: ${mimetype}. Tipos permitidos: ${config.allowedMimeTypes.join(', ')}`);
    }

    // Validar tamaño máximo
    const maxSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB por defecto
    if (file.file && file.file.size > maxSize) {
      throw new Error(`Archivo demasiado grande. Máximo permitido: ${Math.round(maxSize / (1024 * 1024))}MB`);
    }
  }


  private static isImageFile(mimetype: string): boolean {
    return mimetype.startsWith("image/");
  }

  private static async uploadAndOptimizeImage(
    createReadStream: () => NodeJS.ReadableStream,
    fullPath: string,
    originalName: string
  ): Promise<UploadResult> {
    const chunks: Buffer[] = [];
    const stream = createReadStream();

    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }

    const buffer = Buffer.concat(chunks as Uint8Array[]);

    // Optimizar imagen con Sharp (mismo algoritmo del MONOLITO)
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, 1200, {
        fit: "inside", // Mantiene proporción, no excede 1200px
        withoutEnlargement: true, // No agranda imágenes pequeñas
      })
      .sharpen(0.5) // Ajuste sutil de nitidez
      .webp({
        quality: 85, // Balance entre calidad y tamaño
        effort: 4, // Nivel de compresión (0-6, 4 es balanceado)
      })
      .toBuffer();

    const url = await this.uploadBuffer(optimizedBuffer, fullPath, "image/webp");

    return {
      url,
      filename: fullPath,
      originalName,
      size: optimizedBuffer.length,
      mimetype: "image/webp"
    };
  }

  private static streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Configuraciones predefinidas para diferentes tipos de archivos
   */
  static get DOCUMENTOS_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/documentos",
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ],
      optimizeImages: false,
      generateUniqueNames: true
    };
  }

  static get IMAGENES_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/imagenes",
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: [
        "image/jpeg", "image/png", "image/webp", "image/gif"
      ],
      optimizeImages: true,
      generateUniqueNames: true
    };
  }

  static get GENERAL_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/general",
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
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
      optimizeImages: true,
      generateUniqueNames: true
    };
  }

  // Configuraciones específicas (mantener por compatibilidad)
  static get DOCUMENTOS_PROVEEDOR_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/documentos-proveedores",
      maxFileSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/webp"
      ],
      optimizeImages: true,
      generateUniqueNames: true
    };
  }

  static get LOGOS_PROVEEDOR_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/logos-proveedores",
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: [
        "image/jpeg", "image/png", "image/webp"
      ],
      optimizeImages: true,
      generateUniqueNames: true
    };
  }

  static get PLANTILLAS_DOCUMENTO_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/plantillas-documentos",
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ],
      optimizeImages: false,
      generateUniqueNames: true
    };
  }

  static get EVIDENCIAS_PAGO_CONFIG(): FileUploadConfig {
    return {
      folder: "kapoproveedores/evidencias-pago",
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowedMimeTypes: [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf"
      ],
      optimizeImages: true,
      generateUniqueNames: true
    };
  }
}

export default FileUploadService;
