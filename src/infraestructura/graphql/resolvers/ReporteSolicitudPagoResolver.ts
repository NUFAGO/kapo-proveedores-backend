import { ReporteSolicitudPagoService } from '../../../dominio/servicios/ReporteSolicitudPagoService';
import { ISolicitudPagoRepository } from '../../../dominio/repositorios/ISolicitudPagoRepository';
import {
  CuadrillaReporteSolicitudPago,
  ReporteSolicitudPagoActualizarInput,
  ReporteSolicitudPagoCrearDesdeCliente,
  ReporteSolicitudPagoListFilter,
} from '../../../dominio/entidades/ReporteSolicitudPago';
import { ErrorHandler } from './ErrorHandler';
import {
  authGuard,
  proveedorAccessGuard,
  proveedorGuard,
  type GraphQLContext,
} from '../../auth/GraphQLGuards';

interface CrearReporteSolicitudPagoArgs {
  input: {
    identificadorSolicitudPago: string;
    fecha: Date;
    maestroResponsable: string;
    cuadrillas: CuadrillaInput[];
    observacionesGenerales?: string | null;
  };
}

interface ActualizarReporteSolicitudPagoArgs {
  input: {
    id: string;
    fecha?: Date | null;
    maestroResponsable?: string | null;
    cuadrillas?: CuadrillaInput[] | null;
    observacionesGenerales?: string | null;
  };
}

interface CuadrillaInput {
  personal: {
    nombreCompleto: string;
    cargo: string;
    observaciones?: string | null;
  }[];
  actividades: {
    actividad: string;
    und: string;
    tiempoHoras: number;
    meta: number;
    real: number;
    evidencias: { url: string }[];
  }[];
  observaciones?: string | null;
}

function mapCuadrillasFromInput(cuadrillas: CuadrillaInput[]): CuadrillaReporteSolicitudPago[] {
  return cuadrillas.map(c => ({
    personal: c.personal.map(p => ({
      nombreCompleto: p.nombreCompleto,
      cargo: p.cargo,
      ...(p.observaciones != null && p.observaciones !== ''
        ? { observaciones: p.observaciones }
        : {}),
    })),
    actividades: c.actividades.map(a => ({
      actividad: a.actividad,
      und: a.und,
      tiempoHoras: a.tiempoHoras,
      meta: a.meta,
      real: a.real,
      evidencias: a.evidencias.map(e => ({ url: e.url })),
    })),
    ...(c.observaciones != null && c.observaciones !== '' ? { observaciones: c.observaciones } : {}),
  }));
}

export class ReporteSolicitudPagoResolver {
  constructor(
    private readonly servicio: ReporteSolicitudPagoService,
    private readonly solicitudPagoRepository: ISolicitudPagoRepository
  ) {}

  getResolvers() {
    return {
      ReporteSolicitudPago: {
        solicitudPago: async (parent: { solicitudPagoId?: string | null }) => {
          const id = parent.solicitudPagoId?.trim();
          if (!id) return null;
          return await this.solicitudPagoRepository.findById(id);
        },
      },
      Query: {
        obtenerReporteSolicitudPago: authGuard(
          async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
            const reporte = await ErrorHandler.handleError(
              async () => await this.servicio.obtenerPorId(id),
              'obtenerReporteSolicitudPago'
            );
            const user = context.user;
            if (user?.tipo_usuario === 'proveedor') {
              const pid =
                typeof user.proveedor_id === 'string' ? user.proveedor_id.trim() : '';
              if (!pid) {
                throw new Error('SOLICITUD_INVALIDA: Token sin proveedor asociado');
              }
              if (reporte.proveedorId.trim() !== pid) {
                throw new Error('Reporte de solicitud de pago no encontrado');
              }
            }
            return reporte;
          }
        ),
        listarReportesPorSolicitudPago: authGuard(async (
          _: unknown,
          { solicitudPagoId }: { solicitudPagoId: string }
        ) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarPorSolicitudPago(solicitudPagoId),
            'listarReportesPorSolicitudPago'
          );
        }),
        listarReportesSolicitudPagoPorProveedor: proveedorAccessGuard(
          async (
            _: unknown,
            args: { proveedorId: string; filter?: ReporteSolicitudPagoListFilter }
          ) => {
            return await ErrorHandler.handleError(
              async () =>
                await this.servicio.listarPaginadoPorProveedor(
                  args.proveedorId,
                  args.filter ?? {}
                ),
              'listarReportesSolicitudPagoPorProveedor'
            );
          },
          'proveedorId'
        ),
      },
      Mutation: {
        crearReporteSolicitudPago: proveedorGuard(
          async (_: unknown, { input }: CrearReporteSolicitudPagoArgs, context: GraphQLContext) => {
            const proveedorId = context.user?.proveedor_id;
            if (typeof proveedorId !== 'string' || !proveedorId.trim()) {
              throw new Error('SOLICITUD_INVALIDA: Token sin proveedor asociado');
            }
            const payload: ReporteSolicitudPagoCrearDesdeCliente = {
              identificadorSolicitudPago: input.identificadorSolicitudPago,
              fecha: input.fecha,
              maestroResponsable: input.maestroResponsable,
              cuadrillas: mapCuadrillasFromInput(input.cuadrillas),
              ...(input.observacionesGenerales != null && input.observacionesGenerales !== ''
                ? { observacionesGenerales: input.observacionesGenerales }
                : {}),
            };
            return await ErrorHandler.handleError(
              async () => await this.servicio.crear(proveedorId.trim(), payload),
              'crearReporteSolicitudPago'
            );
          }
        ),
        actualizarReporteSolicitudPago: proveedorGuard(
          async (_: unknown, { input }: ActualizarReporteSolicitudPagoArgs) => {
            const patch: ReporteSolicitudPagoActualizarInput = {};
            if (input.fecha != null) patch.fecha = input.fecha;
            if (input.maestroResponsable != null) patch.maestroResponsable = input.maestroResponsable;
            if (input.cuadrillas != null) patch.cuadrillas = mapCuadrillasFromInput(input.cuadrillas);
            if (input.observacionesGenerales !== undefined) {
              patch.observacionesGenerales =
                input.observacionesGenerales === null ? '' : input.observacionesGenerales;
            }
            return await ErrorHandler.handleError(
              async () => await this.servicio.actualizar(input.id, patch),
              'actualizarReporteSolicitudPago'
            );
          }
        ),
        eliminarReporteSolicitudPago: proveedorGuard(async (_: unknown, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminar(id),
            'eliminarReporteSolicitudPago'
          );
        }),
      },
    };
  }
}
