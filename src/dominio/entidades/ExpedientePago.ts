export interface ExpedientePago {
  id: string;
  ocId: string;
  ocCodigo: string;
  ocSnapshot: any; // JSON completo de la OC
  fechaSnapshot: Date;
  proveedorId: string;
  proveedorNombre: string;
  montoContrato: number;
  fechaInicioContrato: Date;
  fechaFinContrato: Date;
  descripcion: string;
  estado: 'en_configuracion' | 'configurado' | 'en_ejecucion' | 'completado' | 'suspendido' | 'cancelado';
  montoComprometido: number;
  montoPagado: number;
  montoDisponible: number;
  requiereReportes: boolean;
  frecuenciaReporte?: 'diario' | 'semanal' | 'quincenal' | 'libre';
  minReportesPorSolicitud?: number;
  modoValidacionReportes?: 'obligatorio' | 'advertencia' | 'informativo';
  adminCreadorId: string;
  fechaCreacion: Date;
  fechaConfigurado?: Date;
}

export interface ExpedientePagoInput {
  ocId: string;
  ocCodigo: string;
  ocSnapshot: any;
  proveedorId: string;
  proveedorNombre: string;
  montoContrato: number;
  fechaInicioContrato: Date;
  fechaFinContrato: Date;
  descripcion: string;
  requiereReportes?: boolean;
  frecuenciaReporte?: 'diario' | 'semanal' | 'quincenal' | 'libre';
  minReportesPorSolicitud?: number;
  modoValidacionReportes?: 'obligatorio' | 'advertencia' | 'informativo';
  adminCreadorId: string;
}

export interface ExpedientePagoFilter {
  page?: number;
  limit?: number;
  ocId?: string;
  proveedorId?: string;
  estado?: string;
  adminCreadorId?: string;
  searchTerm?: string;
}
