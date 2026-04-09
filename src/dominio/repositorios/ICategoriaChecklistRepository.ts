import { CategoriaChecklist, CategoriaChecklistInput, CategoriaChecklistFiltros, CategoriaChecklistConnection } from '../entidades/CategoriaChecklist';

export interface ICategoriaChecklistRepository {
  crearCategoriaChecklist(input: CategoriaChecklistInput): Promise<CategoriaChecklist>;
  obtenerCategoriaChecklist(id: string): Promise<CategoriaChecklist | null>;
  actualizarCategoriaChecklist(id: string, input: Partial<CategoriaChecklistInput>): Promise<CategoriaChecklist>;
  eliminarCategoriaChecklist(id: string): Promise<boolean>;
  listarCategoriasChecklist(filtros?: CategoriaChecklistFiltros, limit?: number, offset?: number): Promise<CategoriaChecklistConnection>;
  obtenerCategoriasChecklistActivas(): Promise<CategoriaChecklist[]>;
  obtenerCategoriasChecklistInactivas(): Promise<CategoriaChecklist[]>;
  existeNombre(nombre: string, excludeId?: string): Promise<boolean>;
  existeCategoriaChecklist(id: string): Promise<boolean>;
  // MÉTODO BATCH OPTIMIZADO
  obtenerCategoriasPorIds(ids: string[]): Promise<CategoriaChecklist[]>;
}
