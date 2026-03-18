import { 
  RequisitoDocumento, 
  RequisitoDocumentoInput, 
  RequisitoDocumentoFiltros 
} from '../entidades/PlantillaChecklist'

export interface IRequisitoDocumentoRepository {
  // CRUD básico
  crear(input: RequisitoDocumentoInput): Promise<RequisitoDocumento>
  obtenerPorId(id: string): Promise<RequisitoDocumento | null>
  actualizar(id: string, input: Partial<RequisitoDocumentoInput>): Promise<RequisitoDocumento | null>
  eliminar(id: string): Promise<boolean>
  
  // Queries especializadas
  listarPorChecklist(checklistId: string): Promise<RequisitoDocumento[]>
  listarConFiltros(filtros?: RequisitoDocumentoFiltros): Promise<RequisitoDocumento[]>
  
  // Queries con relaciones
  listarPorChecklistConRelaciones(checklistId: string): Promise<RequisitoDocumento[]>
  
  // Utilidades
  contarPorChecklist(checklistId: string): Promise<number>
  contarPorFiltros(filtros?: RequisitoDocumentoFiltros): Promise<number>
  
  // Reordenamiento
  actualizarOrden(checklistId: string, requisitos: { id: string; orden: number }[]): Promise<boolean>
  
  // Operaciones batch
  crearMultiples(requisitos: RequisitoDocumentoInput[]): Promise<RequisitoDocumento[]>
  eliminarPorChecklist(checklistId: string): Promise<boolean>
  
  // Validaciones
  existeOrden(checklistId: string, orden: number, excludeId?: string): Promise<boolean>
  obtenerMaxOrden(checklistId: string): Promise<number>
}
