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

interface SubirArchivosMutationArgs {
  input: {
    id: string;
    archivos: Array<{
      url: string;
      nombreOriginal: string;
      mimeType: string;
      tamanioBytes: number;
      fechaSubida: string;
    }>;
    usuarioId: string;
  };
}

interface AprobarDocumentoMutationArgs {
  input: { id: string };
}

interface ObservarDocumentoMutationArgs {
  input: { id: string; comentarios: string };
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
        listarDocumentosOC: adminGuard(async (_: any, { filter }: { filter?: DocumentoOCFilter }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarDocumentosOC(filter ?? {}),
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
        subirArchivosDocumento: adminGuard(async (_: any, { input }: SubirArchivosMutationArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.subirArchivos(input.id),
            'subirArchivosDocumento'
          );
        }),
        
        // Aprobar un documento OC
        aprobarDocumentoOC: adminGuard(async (_: any, { input }: AprobarDocumentoMutationArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.aprobarDocumentoOC(input.id),
            'aprobarDocumentoOC'
          );
        }),
        
        // Observar un documento OC
        observarDocumentoOC: adminGuard(async (_: any, { input }: ObservarDocumentoMutationArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.observarDocumentoOC(input.id),
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
