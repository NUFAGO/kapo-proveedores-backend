export interface TipoPagoOC {
  id: string;
  expedienteId: string;
  categoriaChecklistId: string;
  checklistId: string;
  fechaAsignacion: Date;
  modoRestriccion: 'libre' | 'orden' | 'porcentaje' | 'orden_y_porcentaje';
  orden?: number;
  requiereAnteriorPagado?: boolean;
  porcentajeMaximo?: number;
  porcentajeMinimo?: number;
  /** Si es true, el proveedor puede vincular reportes operativos a solicitudes de este tipo de pago. */
  permiteVincularReportes?: boolean;
}

export interface TipoPagoOCInput {
  expedienteId: string;
  categoriaChecklistId: string;
  checklistId: string;
  modoRestriccion: 'libre' | 'orden' | 'porcentaje' | 'orden_y_porcentaje';
  orden?: number;
  requiereAnteriorPagado?: boolean;
  porcentajeMaximo?: number;
  porcentajeMinimo?: number;
  permiteVincularReportes?: boolean;
}

export interface TipoPagoOCFilter {
  expedienteId?: string;
  categoriaChecklistId?: string;
  checklistId?: string;
  modoRestriccion?: string;
}
