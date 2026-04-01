import { IResolvers } from '@graphql-tools/utils';
import { ExpedientePagoService } from '../../../dominio/servicios/ExpedientePagoService';
import { ExpedientePagoInput, ExpedientePagoFilter } from '../../../dominio/entidades/ExpedientePago';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreateExpedientePagoArgs {
  input: ExpedientePagoInput;
}

interface UpdateEstadoExpedienteArgs {
  id: string;
  estado: string;
}

// interface UpdateExpedientePagoArgs {
//   id: string;
//   input: Partial<ExpedientePagoInput>;
// }

interface ConfigurarExpedienteArgs {
  expedienteId: string;
  documentosBaseIds: string[];
  tiposPago: Array<{
    categoriaChecklistId: string;
    checklistId: string;
    modoRestriccion: 'libre' | 'orden' | 'porcentaje' | 'orden_y_porcentaje';
    orden?: number;
    requiereAnteriorPagado?: boolean;
    porcentajeMaximo?: number;
    porcentajeMinimo?: number;
  }>;
}

interface GuardarExpedienteItemsArgs {
  input: {
    ocData: {
      id: string;
      codigo: string;
      proveedorId: string;
      proveedorNombre: string;
      montoContrato: number;
      fechaInicioContrato: string;
      fechaFinContrato: string;
      descripcion?: string;
    };
    adminCreadorId: string;
    solicitudesPago: Array<{
      categoriaChecklistId: string;
      plantillaChecklistId: string;
    }>;
    documentosOC: Array<{
      categoriaChecklistId: string;
      plantillaChecklistId: string;
    }>;
  };
}

/**
 * Resolver de expedientes de pago
 * Maneja las operaciones CRUD para ExpedientePago con guards y manejo de errores
 */
export class ExpedientePagoResolver {
  constructor(
    private readonly servicio: ExpedientePagoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener un expediente de pago por ID
        obtenerExpedientePago: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerExpedientePago(id),
            'obtenerExpedientePago'
          );
        }),
        
        // Obtener expediente por OC ID
        obtenerExpedientePorOcId: adminGuard(async (_: any, { ocId }: { ocId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerExpedientePorOcId(ocId),
            'obtenerExpedientePorOcId'
          );
        }),

        // Obtener expediente completo con todas sus relaciones y archivos
        obtenerExpedienteCompleto: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerExpedienteCompleto(id),
            'obtenerExpedienteCompleto'
          );
        }),
        
        // Listar expedientes de pago con filtros y paginación
        listarExpedientesPago: adminGuard(async (_: any, args: ExpedientePagoFilter) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarExpedientesPago(args),
            'listarExpedientesPago'
          );
        }),

        // Obtener expedientes por proveedor
        obtenerExpedientesPorProveedor: adminGuard(async (_: any, _args: { 
          proveedorId: string; 
          filters?: ExpedientePagoFilter;
        }) => {
          return await ErrorHandler.handleError(
            async () => {
              // Este método necesitaría implementarse en el servicio
              // Por ahora, retornamos array vacío como placeholder
              return [];
            },
            'obtenerExpedientesPorProveedor'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear expedientes de pago
        crearExpedientePago: adminGuard(async (_: any, { input }: CreateExpedientePagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearExpedientePago(input),
            'crearExpedientePago'
          );
        }),
        
        // Solo admin puede configurar un expediente
        configurarExpediente: adminGuard(async (_: any, args: ConfigurarExpedienteArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.configurarExpediente(
              args.expedienteId,
              args.documentosBaseIds,
              args.tiposPago
            ),
            'configurarExpediente'
          );
        }),
        
        // Guardar expediente con items seleccionados
        guardarExpedienteConItems: adminGuard(async (_: any, args: GuardarExpedienteItemsArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.guardarExpedienteConItems(
              args.input.ocData,
              args.input.adminCreadorId,
              args.input.solicitudesPago,
              args.input.documentosOC
            ),
            'guardarExpedienteConItems'
          );
        }),
        
        // Solo admin puede actualizar estado de expediente
        actualizarEstadoExpediente: adminGuard(async (_: any, { id, estado }: UpdateEstadoExpedienteArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarEstado(id, estado as any),
            'actualizarEstadoExpediente'
          );
        }),
        
        // Solo admin puede actualizar saldos de expediente
        actualizarSaldosExpediente: adminGuard(async (_: any, { 
          id, 
          montoComprometido, 
          montoPagado 
        }: { 
          id: string; 
          montoComprometido: number; 
          montoPagado: number;
        }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarSaldos(id, montoComprometido, montoPagado),
            'actualizarSaldosExpediente'
          );
        }),
        
        // Solo admin puede eliminar expedientes de pago
        eliminarExpedientePago: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarExpedientePago(id),
            'eliminarExpedientePago'
          );
        })
      }
    };
  }
}
