import { IResolvers } from '@graphql-tools/utils';
import { TipoPagoOCService } from '../../../dominio/servicios/TipoPagoOCService';
import { TipoPagoOCInput, TipoPagoOCFilter } from '../../../dominio/entidades/TipoPagoOC';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreateTipoPagoOCArgs {
  input: TipoPagoOCInput;
}

interface UpdateTipoPagoOCArgs {
  id: string;
  input: Partial<TipoPagoOCInput>;
}

interface ValidarCreacionSolicitudArgs {
  expedienteId: string;
  categoriaChecklistId: string;
  montoSolicitado: number;
}

/**
 * Resolver de tipos de pago OC
 * Maneja las operaciones CRUD para TipoPagoOC con guards y manejo de errores
 */
export class TipoPagoOCResolver {
  constructor(
    private readonly servicio: TipoPagoOCService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener un tipo de pago OC por ID
        obtenerTipoPagoOC: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerTipoPagoOC(id),
            'obtenerTipoPagoOC'
          );
        }),
        
        // Listar tipos de pago OC con filtros
        listarTiposPagoOC: adminGuard(async (_: any, args: TipoPagoOCFilter) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarTiposPagoOC(args),
            'listarTiposPagoOC'
          );
        }),

        // Obtener tipos de pago por expediente
        obtenerTiposPagoPorExpediente: adminGuard(async (_: any, { expedienteId }: { expedienteId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerTiposPagoPorExpediente(expedienteId),
            'obtenerTiposPagoPorExpediente'
          );
        }),

        // Validar si se puede crear una solicitud de pago
        validarCreacionSolicitud: adminGuard(async (_: any, args: ValidarCreacionSolicitudArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.validarCreacionSolicitud(
              args.expedienteId,
              args.categoriaChecklistId,
              args.montoSolicitado
            ),
            'validarCreacionSolicitud'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear tipos de pago OC
        crearTipoPagoOC: adminGuard(async (_: any, { input }: CreateTipoPagoOCArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearTipoPagoOC(input),
            'crearTipoPagoOC'
          );
        }),
        
        // Solo admin puede actualizar tipos de pago OC
        actualizarTipoPagoOC: adminGuard(async (_: any, { id, input }: UpdateTipoPagoOCArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarTipoPagoOC(id, input),
            'actualizarTipoPagoOC'
          );
        }),
        
        // Solo admin puede eliminar tipos de pago OC
        eliminarTipoPagoOC: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarTipoPagoOC(id),
            'eliminarTipoPagoOC'
          );
        })
      }
    };
  }
}
