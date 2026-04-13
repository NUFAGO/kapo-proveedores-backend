import { IResolvers } from '@graphql-tools/utils';
import { PlantillaDocumentoService } from '../../../dominio/servicios/PlantillaDocumentoService';
import { PlantillaDocumentoInput } from '../../../dominio/entidades/PlantillaDocumento';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

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

export class PlantillaDocumentoResolver {
  constructor(
    private readonly servicio: PlantillaDocumentoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
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
        
        listarPlantillasDocumento: adminGuard(async (_: any, args: {
          limit?: number;
          offset?: number;
          filters?: {
            nombrePlantilla?: string;
            codigo?: string;
            activo?: boolean;
            busqueda?: string;
          };
        }) => {
          const { limit = 20, offset = 0, filters = {} } = args;
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarPlantillasDocumento(filters, limit, offset),
            'listarPlantillasDocumento'
          );
        }),

        findActivasPlantillaDocumento: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerPlantillasDocumentoActivas(),
            'findActivasPlantillaDocumento'
          );
        }),

        findInactivasPlantillaDocumento: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerPlantillasDocumentoInactivas(),
            'findInactivasPlantillaDocumento'
          );
        })
      },
      
      Mutation: {
        crearPlantillaDocumento: adminGuard(async (_: any, { input }: CreatePlantillaDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearPlantillaDocumento(input),
            'crearPlantillaDocumento'
          );
        }),
        
        actualizarPlantillaDocumento: adminGuard(async (_: any, { id, input }: UpdatePlantillaDocumentoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarPlantillaDocumento(id, input),
            'actualizarPlantillaDocumento'
          );
        }),
        
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
