import { SolicitudPagoService } from '../../../dominio/servicios/SolicitudPagoService';
import { ExpedientePagoService } from '../../../dominio/servicios/ExpedientePagoService';
import { ISolicitudPagoRepository } from '../../../dominio/repositorios/ISolicitudPagoRepository';
import { SolicitudPagoMongoRepository } from '../../persistencia/mongo/SolicitudPagoMongoRepository';
import { ITipoPagoOCRepository } from '../../../dominio/repositorios/ITipoPagoOCRepository';
import { IExpedientePagoRepository } from '../../../dominio/repositorios/IExpedientePagoRepository';
import { SolicitudPagoFilter } from '../../../dominio/entidades/SolicitudPago';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard, proveedorGuard } from '../../auth/GraphQLGuards';

// Tipos para los argumentos
interface CreateSolicitudPagoArgs {
  input: {
    expedienteId: string;
    tipoPagoOCId: string;
    montoSolicitado: number;
  };
}

interface GetSolicitudPagoArgs {
  id: string;
}

interface ListSolicitudPagoArgs {
  filter?: {
    expedienteId?: string;
    tipoPagoOCId?: string;
    estado?: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
  };
}

interface AprobarSolicitudPagoArgs {
  input: { id: string };
}

interface ObservarSolicitudPagoArgs {
  input: { id: string; comentarios: string };
}

interface RechazarSolicitudPagoArgs {
  input: { id: string; comentarios: string };
}

export class SolicitudPagoResolver {
  private servicio: SolicitudPagoService;

  constructor(
    private readonly tipoPagoOCRepository: ITipoPagoOCRepository,
    private readonly expedientePagoRepository: IExpedientePagoRepository,
    expedientePagoService: ExpedientePagoService
  ) {
    const solicitudPagoRepository: ISolicitudPagoRepository = new SolicitudPagoMongoRepository();
    this.servicio = new SolicitudPagoService(
      solicitudPagoRepository,
      tipoPagoOCRepository,
      expedientePagoRepository,
      expedientePagoService
    );
  }

  getResolvers() {
    return {
      SolicitudPago: {
        tipoPagoOC: async (parent: { tipoPagoOCId?: string | null }) => {
          const id = parent.tipoPagoOCId?.trim();
          if (!id) return null;
          return await this.tipoPagoOCRepository.findById(id);
        },
        expediente: async (parent: { expedienteId?: string | null }) => {
          const id = parent.expedienteId?.trim();
          if (!id) return null;
          return await this.expedientePagoRepository.findById(id);
        },
      },
      Query: {
        // Obtener una solicitud de pago por ID
        obtenerSolicitudPago: proveedorGuard(async (_: any, { id }: GetSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerSolicitudPago(id),
            'obtenerSolicitudPago'
          );
        }),
        
        // Listar solicitudes de pago con filtros
        listarSolicitudesPago: adminGuard(async (_: any, { filter }: ListSolicitudPagoArgs) => {
          const processedFilter: SolicitudPagoFilter = {};
          
          if (filter) {
            if (filter.expedienteId) processedFilter.expedienteId = filter.expedienteId;
            if (filter.tipoPagoOCId) processedFilter.tipoPagoOCId = filter.tipoPagoOCId;
            if (filter.estado) processedFilter.estado = filter.estado;
            if (filter.fechaCreacionDesde) processedFilter.fechaCreacionDesde = new Date(filter.fechaCreacionDesde);
            if (filter.fechaCreacionHasta) processedFilter.fechaCreacionHasta = new Date(filter.fechaCreacionHasta);
          }
          
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarSolicitudesPago(processedFilter),
            'listarSolicitudesPago'
          );
        }),
        
        // Obtener solicitudes de pago por expediente
        obtenerSolicitudesPorExpediente: proveedorGuard(async (_: any, { expedienteId }: { expedienteId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerSolicitudesPorExpediente(expedienteId),
            'obtenerSolicitudesPorExpediente'
          );
        }),
        
        // Obtener solicitudes de pago por tipo de pago
        obtenerSolicitudesPorTipoPago: proveedorGuard(async (_: any, { tipoPagoOCId }: { tipoPagoOCId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerSolicitudesPorTipoPago(tipoPagoOCId),
            'obtenerSolicitudesPorTipoPago'
          );
        }),
      },

      Mutation: {
        // Crear una nueva solicitud de pago
        crearSolicitudPago: proveedorGuard(async (_: any, { input }: CreateSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearSolicitudPago(input),
            'crearSolicitudPago'
          );
        }),
        
        // Enviar solicitud a revisión
        enviarSolicitudRevision: proveedorGuard(async (_: any, { id }: { id: string; usuarioId: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.enviarSolicitudRevision(id),
            'enviarSolicitudRevision'
          );
        }),
        
        // Aprobar solicitud de pago
        aprobarSolicitudPago: adminGuard(async (_: any, { input }: AprobarSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.aprobarSolicitudPago(input.id),
            'aprobarSolicitudPago'
          );
        }),
        
        // Observar solicitud de pago
        observarSolicitudPago: adminGuard(async (_: any, { input }: ObservarSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.observarSolicitudPago(input.id, input.comentarios),
            'observarSolicitudPago'
          );
        }),
        
        // Rechazar solicitud de pago
        rechazarSolicitudPago: adminGuard(async (_: any, { input }: RechazarSolicitudPagoArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.rechazarSolicitudPago(input.id, input.comentarios),
            'rechazarSolicitudPago'
          );
        }),
        
        // Eliminar una solicitud de pago
        eliminarSolicitudPago: proveedorGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarSolicitudPago(id),
            'eliminarSolicitudPago'
          );
        }),
      }
    };
  }
}
