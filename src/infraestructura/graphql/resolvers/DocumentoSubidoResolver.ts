import { DocumentoSubidoService } from '../../../dominio/servicios/DocumentoSubidoService';
import { IDocumentoSubidoRepository } from '../../../dominio/repositorios/IDocumentoSubidoRepository';
import { DocumentoSubidoMongoRepository } from '../../persistencia/mongo/DocumentoSubidoMongoRepository';
import { IDocumentoOCRepository } from '../../../dominio/repositorios/IDocumentoOCRepository';
import { ISolicitudPagoRepository } from '../../../dominio/repositorios/ISolicitudPagoRepository';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard, proveedorGuard } from '../../auth/GraphQLGuards';

// Tipos para los argumentos
interface CreateDocumentoSubidoArgs {
  input: {
    documentoOCId?: string;
    solicitudPagoId?: string;
    requisitoDocumentoId?: string;
    usuarioId: string;
    archivos: Array<{
      url: string;
      nombreOriginal: string;
      mimeType: string;
      tamanioBytes: number;
      fechaSubida: string;
    }>;
  };
}

interface GetDocumentoSubidoArgs {
  id: string;
}

interface ListDocumentoSubidoArgs {
  filter?: {
    documentoOCId?: string;
    solicitudPagoId?: string;
    requisitoDocumentoId?: string;
    usuarioId?: string;
    estado?: string;
  };
}

interface UpdateEstadoDocumentoSubidoArgs {
  id: string;
  adminRevisorId: string;
  comentarios?: string;
}

export class DocumentoSubidoResolver {
  private servicio: DocumentoSubidoService;

  constructor(
    documentoOCRepository: IDocumentoOCRepository,
    solicitudPagoRepository: ISolicitudPagoRepository
  ) {
    const documentoSubidoRepository: IDocumentoSubidoRepository = new DocumentoSubidoMongoRepository();
    this.servicio = new DocumentoSubidoService(
      documentoSubidoRepository,
      documentoOCRepository,
      solicitudPagoRepository
    );
  }

  getResolvers() {
    return {
      Query: {
        // Obtener un documento subido por ID
        obtenerDocumentoSubido: proveedorGuard(async (_: any, { id }: GetDocumentoSubidoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentoSubido(id),
            'obtenerDocumentoSubido'
          );
        }),
        
        // Listar documentos subidos con filtros
        listarDocumentosSubidos: adminGuard(async (_: any, { filter }: ListDocumentoSubidoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarDocumentosSubidos(filter || {}),
            'listarDocumentosSubidos'
          );
        }),
        
        // Obtener documentos subidos por documento OC
        obtenerDocumentosSubidosPorDocumentoOC: proveedorGuard(async (_: any, { documentoOCId }: { documentoOCId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentosSubidosPorDocumentoOC(documentoOCId),
            'obtenerDocumentosSubidosPorDocumentoOC'
          );
        }),
        
        // Obtener documentos subidos por solicitud de pago
        obtenerDocumentosSubidosPorSolicitudPago: proveedorGuard(async (_: any, { solicitudPagoId }: { solicitudPagoId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentosSubidosPorSolicitudPago(solicitudPagoId),
            'obtenerDocumentosSubidosPorSolicitudPago'
          );
        }),
      },

      Mutation: {
        // Crear un nuevo documento subido
        crearDocumentoSubido: proveedorGuard(async (_: any, { input }: CreateDocumentoSubidoArgs) => {
          const processedInput = {
            ...input,
            archivos: input.archivos.map(arch => ({
              ...arch,
              fechaSubida: new Date(arch.fechaSubida)
            }))
          };
          
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearDocumentoSubido(processedInput),
            'crearDocumentoSubido'
          );
        }),
        
        // Aprobar un documento subido
        aprobarDocumentoSubido: adminGuard(async (_: any, { id, adminRevisorId }: UpdateEstadoDocumentoSubidoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.aprobarDocumentoSubido(id, adminRevisorId),
            'aprobarDocumentoSubido'
          );
        }),
        
        // Observar un documento subido
        observarDocumentoSubido: adminGuard(async (_: any, { id, adminRevisorId, comentarios }: UpdateEstadoDocumentoSubidoArgs & { comentarios: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.observarDocumentoSubido(id, adminRevisorId, comentarios),
            'observarDocumentoSubido'
          );
        }),
        
        // Rechazar un documento subido
        rechazarDocumentoSubido: adminGuard(async (_: any, { id, adminRevisorId, comentarios }: UpdateEstadoDocumentoSubidoArgs & { comentarios: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.rechazarDocumentoSubido(id, adminRevisorId, comentarios),
            'rechazarDocumentoSubido'
          );
        }),
        
        // Eliminar un documento subido
        eliminarDocumentoSubido: proveedorGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarDocumentoSubido(id),
            'eliminarDocumentoSubido'
          );
        }),
      }
    };
  }
}
