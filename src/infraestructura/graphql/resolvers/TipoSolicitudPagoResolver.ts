import { IResolvers } from '@graphql-tools/utils';
import { TipoSolicitudPagoService } from '../../../dominio/servicios/TipoSolicitudPagoService';
import {  TipoSolicitudPagoInput } from '../../../dominio/entidades/TipoSolicitudPago';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreateTipoSolicitudPagoArgs {
  input: TipoSolicitudPagoInput;
}

interface UpdateTipoSolicitudPagoArgs {
  id: string;
  input: Partial<TipoSolicitudPagoInput>;
}

interface DeleteTipoSolicitudPagoArgs {
  id: string;
}

/**
 * Resolver de tipos de solicitud de pago
 * Maneja las operaciones CRUD para TipoSolicitudPago con guards y manejo de errores
 */
export class TipoSolicitudPagoResolver {
  constructor(
    private readonly servicio: TipoSolicitudPagoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener un tipo de solicitud de pago por ID
        obtenerTipoSolicitudPago: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerTipoSolicitudPago(id),
            'obtenerTipoSolicitudPago'
          );
        }),
        
        // Listar tipos de solicitud de pago con filtros y paginación
        listarTiposSolicitudPago: adminGuard(async (_: any, args: {
          limit?: number;
          offset?: number;
          filters?: {
            nombre?: string;
            categoria?: 'anticipado' | 'avance' | 'cierre' | 'entrega' | 'gasto' | 'ajuste';
            estado?: 'activo' | 'inactivo';
          };
        }) => {
          const { limit = 20, offset = 0, filters = {} } = args;
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarTiposSolicitudPago(filters, limit, offset),
            'listarTiposSolicitudPago'
          );
        }),

        // Obtener solo tipos de solicitud de pago activos
        findActivosSolicitudPago: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerTiposSolicitudPagoActivos(),
            'findActivosSolicitudPago'
          );
        }),

        // Obtener solo tipos de solicitud de pago inactivos
        findInactivosSolicitudPago: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerTiposSolicitudPagoInactivos(),
            'findInactivosSolicitudPago'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear tipos de solicitud de pago
        crearTipoSolicitudPago: adminGuard(async (_: any, { input }: CreateTipoSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearTipoSolicitudPago(input),
            'crearTipoSolicitudPago'
          );
        }),
        
        // Solo admin puede actualizar tipos de solicitud de pago
        actualizarTipoSolicitudPago: adminGuard(async (_: any, { id, input }: UpdateTipoSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarTipoSolicitudPago(id, input),
            'actualizarTipoSolicitudPago'
          );
        }),
        
        // Solo admin puede eliminar tipos de solicitud de pago
        eliminarTipoSolicitudPago: adminGuard(async (_: any, { id }: DeleteTipoSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarTipoSolicitudPago(id),
            'eliminarTipoSolicitudPago'
          );
        })
      }
    };
  }
}
