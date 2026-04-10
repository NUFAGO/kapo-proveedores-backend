import {
  ReporteSolicitudPago,
  ReporteSolicitudPagoCrearInput,
  ReporteSolicitudPagoActualizarInput,
  ReporteSolicitudPagoListFilter,
  ReporteSolicitudPagoAdminListFilter,
  ReporteSolicitudPagoConnection,
} from '../entidades/ReporteSolicitudPago';

export interface IReporteSolicitudPagoRepository {
  create(data: ReporteSolicitudPagoCrearInput, session?: unknown): Promise<ReporteSolicitudPago>;
  findById(id: string, session?: unknown): Promise<ReporteSolicitudPago | null>;
  update(
    id: string,
    data: ReporteSolicitudPagoActualizarInput,
    session?: unknown
  ): Promise<ReporteSolicitudPago | null>;
  delete(id: string, session?: unknown): Promise<boolean>;
  findBySolicitudPagoId(solicitudPagoId: string, session?: unknown): Promise<ReporteSolicitudPago[]>;
  findPaginatedByProveedorId(
    proveedorId: string,
    filter: ReporteSolicitudPagoListFilter,
    session?: unknown
  ): Promise<ReporteSolicitudPagoConnection>;
  /** Admin: todos los reportes o filtrados por proveedorId en el filtro */
  findPaginatedAdmin(
    filter: ReporteSolicitudPagoAdminListFilter,
    session?: unknown
  ): Promise<ReporteSolicitudPagoConnection>;
  /**
   * Vincula reportes aún sin `solicitudPagoId` al crear una solicitud.
   * Exige que todos los ids existan, pertenezcan al proveedor y estén sin vincular.
   */
  vincularSolicitudPagoPorIds(
    reporteIds: string[],
    solicitudPagoId: string,
    proveedorId: string,
    session?: unknown
  ): Promise<void>;
}
