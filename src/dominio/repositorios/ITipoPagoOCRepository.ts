import { TipoPagoOC, TipoPagoOCFilter } from '../entidades/TipoPagoOC';

export interface ITipoPagoOCRepository {
  // Métodos básicos CRUD
  findById(id: string, session?: any): Promise<TipoPagoOC | null>;
  findByIds(ids: string[], session?: any): Promise<TipoPagoOC[]>;
  create(data: Partial<TipoPagoOC>, session?: any): Promise<TipoPagoOC>;
  update(id: string, data: Partial<TipoPagoOC>, session?: any): Promise<TipoPagoOC | null>;
  delete(id: string): Promise<boolean>;
  
  // Métodos específicos para tipos de pago OC
  findByExpedienteId(expedienteId: string): Promise<TipoPagoOC[]>;
  findByCategoriaChecklistId(categoriaChecklistId: string): Promise<TipoPagoOC[]>;
  findByChecklistId(checklistId: string): Promise<TipoPagoOC[]>;
  
  // Métodos de orden y restricciones
  findByExpedienteAndOrden(expedienteId: string, orden: number, session?: any): Promise<TipoPagoOC | null>;
  findMaxOrdenByExpediente(expedienteId: string): Promise<number>;
  
  // Validaciones
  existsCategoriaInExpediente(expedienteId: string, categoriaChecklistId: string): Promise<boolean>;
  countByExpedienteAndCategoria(expedienteId: string, categoriaChecklistId: string): Promise<number>;
  
  // Listados con filtros
  listWithFilters(filters: TipoPagoOCFilter): Promise<TipoPagoOC[]>;
  
  // Métodos para consultas de restricciones
  findTiposPagoAnteriores(expedienteId: string, ordenActual: number): Promise<TipoPagoOC[]>;
  findTiposPagoConPorcentaje(expedienteId: string): Promise<TipoPagoOC[]>;
}
