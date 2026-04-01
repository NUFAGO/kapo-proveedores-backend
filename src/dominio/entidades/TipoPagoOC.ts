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
}

export interface TipoPagoOCFilter {
  expedienteId?: string;
  categoriaChecklistId?: string;
  checklistId?: string;
  modoRestriccion?: string;
}
