import { IReporteSolicitudPagoRepository } from '../repositorios/IReporteSolicitudPagoRepository';
import { ISolicitudPagoRepository } from '../repositorios/ISolicitudPagoRepository';
import {
  ReporteSolicitudPago,
  ReporteSolicitudPagoActualizarInput,
  ReporteSolicitudPagoCrearInput,
  ReporteSolicitudPagoCrearDesdeCliente,
  ReporteSolicitudPagoListFilter,
  ReporteSolicitudPagoAdminListFilter,
  ReporteSolicitudPagoConnection,
} from '../entidades/ReporteSolicitudPago';

export class ReporteSolicitudPagoService {
  constructor(
    private readonly reporteRepository: IReporteSolicitudPagoRepository,
    private readonly solicitudPagoRepository: ISolicitudPagoRepository
  ) {}

  async crear(
    proveedorId: string,
    input: ReporteSolicitudPagoCrearDesdeCliente,
    session?: unknown
  ): Promise<ReporteSolicitudPago> {
    const idSol = input.identificadorSolicitudPago.trim();
    if (!idSol) {
      throw new Error('El identificador de solicitud de pago es obligatorio');
    }
    const trimmedObs = input.observacionesGenerales?.trim();
    const payload: ReporteSolicitudPagoCrearInput = {
      proveedorId: proveedorId.trim(),
      identificadorSolicitudPago: idSol,
      fecha: input.fecha,
      maestroResponsable: input.maestroResponsable.trim(),
      cuadrillas: input.cuadrillas ?? [],
      ...(trimmedObs ? { observacionesGenerales: trimmedObs } : {}),
    };
    return await this.reporteRepository.create(payload, session);
  }

  async obtenerPorId(id: string, session?: unknown): Promise<ReporteSolicitudPago> {
    const reporte = await this.reporteRepository.findById(id, session);
    if (!reporte) {
      throw new Error('Reporte de solicitud de pago no encontrado');
    }
    return reporte;
  }

  async listarPorSolicitudPago(solicitudPagoId: string, session?: unknown): Promise<ReporteSolicitudPago[]> {
    const solicitud = await this.solicitudPagoRepository.findById(solicitudPagoId, session);
    if (!solicitud) {
      throw new Error('La solicitud de pago indicada no existe');
    }
    return await this.reporteRepository.findBySolicitudPagoId(solicitudPagoId.trim(), session);
  }

  async actualizar(
    id: string,
    input: ReporteSolicitudPagoActualizarInput,
    session?: unknown
  ): Promise<ReporteSolicitudPago> {
    await this.obtenerPorId(id, session);
    const patch: ReporteSolicitudPagoActualizarInput = {};
    if (input.fecha !== undefined) patch.fecha = input.fecha;
    if (input.maestroResponsable !== undefined) patch.maestroResponsable = input.maestroResponsable.trim();
    if (input.cuadrillas !== undefined) patch.cuadrillas = input.cuadrillas;
    if (input.observacionesGenerales !== undefined) {
      patch.observacionesGenerales = input.observacionesGenerales.trim();
    }
    const updated = await this.reporteRepository.update(id, patch, session);
    if (!updated) {
      throw new Error('No se pudo actualizar el reporte');
    }
    return updated;
  }

  async eliminar(id: string, session?: unknown): Promise<boolean> {
    await this.obtenerPorId(id, session);
    return await this.reporteRepository.delete(id, session);
  }

  async listarPaginadoPorProveedor(
    proveedorId: string,
    filter: ReporteSolicitudPagoListFilter,
    session?: unknown
  ): Promise<ReporteSolicitudPagoConnection> {
    return await this.reporteRepository.findPaginatedByProveedorId(
      proveedorId.trim(),
      filter,
      session
    );
  }

  /** Admin: listado paginado de todos los reportes (filtro proveedor opcional) */
  async listarPaginadoAdmin(
    filter: ReporteSolicitudPagoAdminListFilter,
    session?: unknown
  ): Promise<ReporteSolicitudPagoConnection> {
    return await this.reporteRepository.findPaginatedAdmin(filter, session);
  }
}
