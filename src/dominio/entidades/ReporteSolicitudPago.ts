export interface EvidenciaReporteSolicitudPago {
  url: string;
}

export interface PersonalReporteSolicitudPago {
  nombreCompleto: string;
  cargo: string;
  observaciones?: string;
}

export interface ActividadReporteSolicitudPago {
  actividad: string;
  und: string;
  tiempoHoras: number;
  meta: number;
  real: number;
  evidencias: EvidenciaReporteSolicitudPago[];
}

export interface CuadrillaReporteSolicitudPago {
  personal: PersonalReporteSolicitudPago[];
  actividades: ActividadReporteSolicitudPago[];
  observaciones?: string;
}

export interface ReporteSolicitudPago {
  id: string;
  /** Código interno autogenerado (ej. RSP0001), alineado a PD/TD del sistema */
  codigo?: string;
  proveedorId: string;
  /** Referencia o código de la solicitud hasta vincular el registro en el sistema */
  identificadorSolicitudPago: string;
  /** Id Mongo de la solicitud; vacío hasta que se enlaza */
  solicitudPagoId?: string;
  fecha: Date;
  maestroResponsable: string;
  cuadrillas: CuadrillaReporteSolicitudPago[];
  observacionesGenerales?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Registro completo al persistir */
export type ReporteSolicitudPagoCrearInput = Omit<ReporteSolicitudPago, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Entrada desde API/GraphQL: sin proveedorId (JWT) ni solicitudPagoId (enlace posterior).
 */
export type ReporteSolicitudPagoCrearDesdeCliente = Pick<
  ReporteSolicitudPagoCrearInput,
  'identificadorSolicitudPago' | 'fecha' | 'maestroResponsable' | 'cuadrillas' | 'observacionesGenerales'
>;

export interface ReporteSolicitudPagoActualizarInput {
  fecha?: Date;
  maestroResponsable?: string;
  cuadrillas?: CuadrillaReporteSolicitudPago[];
  observacionesGenerales?: string;
  solicitudPagoId?: string;
}

export interface ReporteSolicitudPagoListFilter {
  page?: number;
  limit?: number;
  searchTerm?: string;
  /** true = con solicitudPagoId; false = sin vincular; undefined = sin filtrar */
  vinculado?: boolean;
}

/** Listado admin global: mismos filtros + proveedor opcional (sin filtrar = todos los proveedores) */
export type ReporteSolicitudPagoAdminListFilter = ReporteSolicitudPagoListFilter & {
  proveedorId?: string;
};

export interface ReporteSolicitudPagoConnection {
  data: ReporteSolicitudPago[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
