import { IResolvers } from '@graphql-tools/utils';
import { DocumentoOCService } from '../../../dominio/servicios/DocumentoOCService';
import { DocumentoOCInput, DocumentoOCFilter } from '../../../dominio/entidades/DocumentoOC';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreateDocumentoOCArgs {
  input: DocumentoOCInput;
}

interface UpdateDocumentoOCArgs {
  id: string;
  input: Partial<DocumentoOCInput>;
}

interface SubirArchivosArgs {
  id: string;
  archivos: Array<{
    url: string;
    nombreOriginal: string;
    mimeType: string;
    tamanioBytes: number;
    fechaSubida: string;
  }>;
  usuarioId: string;
}

interface AprobarDocumentoArgs {
  id: string;
  adminRevisorId: string;
}

interface ObservarDocumentoArgs {
  id: string;
  adminRevisorId: string;
  comentarios: string;
}

/**
 * Resolver de documentos OC
 * Maneja las operaciones CRUD para DocumentoOC con guards y manejo de errores
 */
export class DocumentoOCResolver {
  constructor(
    private readonly servicio: DocumentoOCService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener un documento OC por ID
        obtenerDocumentoOC: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentoOC(id),
            'obtenerDocumentoOC'
          );
        }),
        
        // Listar documentos OC con filtros
        listarDocumentosOC: adminGuard(async (_: any, args: DocumentoOCFilter) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarDocumentosOC(args),
            'listarDocumentosOC'
          );
        }),

        // Obtener documentos por expediente
        obtenerDocumentosPorExpediente: adminGuard(async (_: any, { expedienteId }: { expedienteId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentosPorExpediente(expedienteId),
            'obtenerDocumentosPorExpediente'
          );
        }),

        // Verificar si todos los documentos obligatorios están aprobados
        verificarDocumentosObligatoriosAprobados: adminGuard(async (_: any, { expedienteId }: { expedienteId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.verificarDocumentosObligatoriosAprobados(expedienteId),
            'verificarDocumentosObligatoriosAprobados'
          );
        }),

        // Obtener documentos obligatorios pendientes
        obtenerDocumentosObligatoriosPendientes: adminGuard(async (_: any, { expedienteId }: { expedienteId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerDocumentosObligatoriosPendientes(expedienteId),
            'obtenerDocumentosObligatoriosPendientes'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear documentos OC
        crearDocumentoOC: adminGuard(async (_: any, { input }: CreateDocumentoOCArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearDocumentoOC(input),
            'crearDocumentoOC'
          );
        }),
        
        // Subir archivos a un documento OC
        subirArchivosDocumento: adminGuard(async (_: any, args: SubirArchivosArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.subirArchivos(args.id),
            'subirArchivosDocumento'
          );
        }),
        
        // Aprobar un documento OC
        aprobarDocumentoOC: adminGuard(async (_: any, { id }: AprobarDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.aprobarDocumentoOC(id),
            'aprobarDocumentoOC'
          );
        }),
        
        // Observar un documento OC
        observarDocumentoOC: adminGuard(async (_: any, { id }: ObservarDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.observarDocumentoOC(id),
            'observarDocumentoOC'
          );
        }),
        
        // Solo admin puede actualizar documentos OC
        actualizarDocumentoOC: adminGuard(async (_: any, { id, input }: UpdateDocumentoOCArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarDocumentoOC(id, input),
            'actualizarDocumentoOC'
          );
        }),
        
        // Solo admin puede eliminar documentos OC
        eliminarDocumentoOC: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarDocumentoOC(id),
            'eliminarDocumentoOC'
          );
        })
      }
    };
  }
}
