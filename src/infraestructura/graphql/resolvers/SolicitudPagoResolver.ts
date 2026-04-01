import { SolicitudPagoService } from '../../../dominio/servicios/SolicitudPagoService';
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
    adminRevisorId?: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
  };
}

interface UpdateEstadoSolicitudArgs {
  id: string;
  adminRevisorId: string;
  comentarios?: string;
}

export class SolicitudPagoResolver {
  private servicio: SolicitudPagoService;

  constructor(
    tipoPagoOCRepository: ITipoPagoOCRepository,
    expedientePagoRepository: IExpedientePagoRepository
  ) {
    const solicitudPagoRepository: ISolicitudPagoRepository = new SolicitudPagoMongoRepository();
    this.servicio = new SolicitudPagoService(
      solicitudPagoRepository,
      tipoPagoOCRepository,
      expedientePagoRepository
    );
  }

  getResolvers() {
    return {
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
            if (filter.adminRevisorId) processedFilter.adminRevisorId = filter.adminRevisorId;
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
        aprobarSolicitudPago: adminGuard(async (_: any, { id, adminRevisorId }: UpdateEstadoSolicitudArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.aprobarSolicitudPago(id, adminRevisorId),
            'aprobarSolicitudPago'
          );
        }),
        
        // Observar solicitud de pago
        observarSolicitudPago: adminGuard(async (_: any, { id, adminRevisorId, comentarios }: UpdateEstadoSolicitudArgs & { comentarios: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.observarSolicitudPago(id, adminRevisorId, comentarios),
            'observarSolicitudPago'
          );
        }),
        
        // Rechazar solicitud de pago
        rechazarSolicitudPago: adminGuard(async (_: any, { id, adminRevisorId, comentarios }: UpdateEstadoSolicitudArgs & { comentarios: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.rechazarSolicitudPago(id, adminRevisorId, comentarios),
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
