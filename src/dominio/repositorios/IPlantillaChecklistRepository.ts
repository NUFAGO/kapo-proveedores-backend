import { 
  PlantillaChecklist, 
  PlantillaChecklistInput, 
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection 
} from '../entidades/PlantillaChecklist'

export interface IPlantillaChecklistRepository {
  // CRUD básico
  crear(input: PlantillaChecklistInput): Promise<PlantillaChecklist>
  obtenerPorId(id: string): Promise<PlantillaChecklist | null>
  actualizar(id: string, input: Partial<PlantillaChecklistInput>): Promise<PlantillaChecklist | null>
  eliminar(id: string): Promise<boolean>
  
  // Queries especializadas
  listarConFiltros(
    filtros?: PlantillaChecklistFiltros, 
    limit?: number, 
    offset?: number
  ): Promise<PlantillaChecklistConnection>
  
  listarActivas(): Promise<PlantillaChecklist[]>
  listarInactivas(): Promise<PlantillaChecklist[]>
  listarVigentes(): Promise<PlantillaChecklist[]>
  listarPorCategoria(categoriaChecklistId: string): Promise<PlantillaChecklist[]>
  
  // Queries con relaciones
  listarConRequisitos(
    filtros?: PlantillaChecklistFiltros, 
    limit?: number, 
    offset?: number
  ): Promise<PlantillaChecklistConnection>
  
  obtenerConRequisitos(id: string): Promise<PlantillaChecklist | null>
  
  // Utilidades
  contarPorFiltros(filtros?: PlantillaChecklistFiltros): Promise<number>
  existeNombre(nombre: string, excludeId?: string): Promise<boolean>
}
