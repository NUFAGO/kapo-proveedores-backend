import { IResolvers } from '@graphql-tools/utils';
import { PlantillaDocumentoService } from '../../../dominio/servicios/PlantillaDocumentoService';
import { PlantillaDocumentoInput } from '../../../dominio/entidades/PlantillaDocumento';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreatePlantillaDocumentoArgs {
  input: PlantillaDocumentoInput;
}

interface UpdatePlantillaDocumentoArgs {
  id: string;
  input: Partial<PlantillaDocumentoInput>;
}

interface DeletePlantillaDocumentoArgs {
  id: string;
}

interface ObtenerPlantillasPorTipoDocumentoArgs {
  tipoDocumentoId: string;
}

interface ObtenerPlantillaActivaPorTipoDocumentoArgs {
  tipoDocumentoId: string;
}

/**
 * Resolver de plantillas de documento
 * Maneja las operaciones CRUD para PlantillaDocumento con guards y manejo de errores
 */
export class PlantillaDocumentoResolver {
  constructor(
    private readonly servicio: PlantillaDocumentoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener una plantilla de documento por ID
        obtenerPlantillaDocumento: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const result = await this.servicio.obtenerPlantillaDocumento(id);
              if (!result) {
                throw new Error('Plantilla de documento no encontrada');
              }
              return result;
            },
            'obtenerPlantillaDocumento'
          );
        }),
        
        // Listar plantillas de documento con filtros y paginación
        listarPlantillasDocumento: adminGuard(async (_: any, args: {
          limit?: number;
          offset?: number;
          filters?: {
            tipoDocumentoId?: string;
            nombrePlantilla?: string;
            activo?: boolean;
          };
        }) => {
          const { limit = 20, offset = 0, filters = {} } = args;
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarPlantillasDocumento(filters, limit, offset),
            'listarPlantillasDocumento'
          );
        }),

        // Obtener solo plantillas de documento activas
        findActivasPlantillaDocumento: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerPlantillasDocumentoActivas(),
            'findActivasPlantillaDocumento'
          );
        }),

        // Obtener solo plantillas de documento inactivas
        findInactivasPlantillaDocumento: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerPlantillasDocumentoInactivas(),
            'findInactivasPlantillaDocumento'
          );
        }),

        // Obtener plantillas por tipo de documento
        obtenerPlantillasPorTipoDocumento: adminGuard(async (_: any, { tipoDocumentoId }: ObtenerPlantillasPorTipoDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerPlantillasPorTipoDocumento(tipoDocumentoId),
            'obtenerPlantillasPorTipoDocumento'
          );
        }),

        // Obtener plantilla activa por tipo de documento
        obtenerPlantillaActivaPorTipoDocumento: adminGuard(async (_: any, { tipoDocumentoId }: ObtenerPlantillaActivaPorTipoDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => {
              const result = await this.servicio.obtenerPlantillaActivaPorTipoDocumento(tipoDocumentoId);
              if (!result) {
                throw new Error('No existe una plantilla activa para este tipo de documento');
              }
              return result;
            },
            'obtenerPlantillaActivaPorTipoDocumento'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear plantillas de documento
        crearPlantillaDocumento: adminGuard(async (_: any, { input }: CreatePlantillaDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearPlantillaDocumento(input),
            'crearPlantillaDocumento'
          );
        }),
        
        // Solo admin puede actualizar plantillas de documento
        actualizarPlantillaDocumento: adminGuard(async (_: any, { id, input }: UpdatePlantillaDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarPlantillaDocumento(id, input),
            'actualizarPlantillaDocumento'
          );
        }),
        
        // Solo admin puede eliminar plantillas de documento
        eliminarPlantillaDocumento: adminGuard(async (_: any, { id }: DeletePlantillaDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarPlantillaDocumento(id),
            'eliminarPlantillaDocumento'
          );
        })
      }
    };
  }
}
