import { CategoriaChecklist, CategoriaChecklistInput, CategoriaChecklistFiltros, CategoriaChecklistConnection } from '../entidades/CategoriaChecklist';
import { ICategoriaChecklistRepository } from '../repositorios/ICategoriaChecklistRepository';
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository';

export class CategoriaChecklistService {
  constructor(
    private readonly categoriaChecklistRepository: ICategoriaChecklistRepository,
    private readonly plantillaChecklistRepository?: IPlantillaChecklistRepository
  ) {}

  async crearCategoriaChecklist(input: CategoriaChecklistInput): Promise<CategoriaChecklist> {
    // Validaciones de negocio
    await this.validarNombreUnico(input.nombre);
    this.validarTipoUso(input.tipoUso);

    const categoriaChecklist = await this.categoriaChecklistRepository.crearCategoriaChecklist(input);
    return categoriaChecklist;
  }

  async obtenerCategoriaChecklist(id: string): Promise<CategoriaChecklist> {
    const categoriaChecklist = await this.categoriaChecklistRepository.obtenerCategoriaChecklist(id);
    if (!categoriaChecklist) {
      throw new Error('Categoría de checklist no encontrada');
    }
    return categoriaChecklist;
  }

  async actualizarCategoriaChecklist(id: string, input: Partial<CategoriaChecklistInput>): Promise<CategoriaChecklist> {
    // Verificar que existe
    const categoriaChecklistExistente = await this.categoriaChecklistRepository.obtenerCategoriaChecklist(id);
    if (!categoriaChecklistExistente) {
      throw new Error('Categoría de checklist no encontrada');
    }

    // Validaciones de negocio
    if (input.nombre && input.nombre !== categoriaChecklistExistente.nombre) {
      await this.validarNombreUnico(input.nombre, id);
    }

    if (input.tipoUso) {
      this.validarTipoUso(input.tipoUso);
    }

    // Validación de cambio de estado: bloquear desactivación si hay plantillas activas usándola
    if (
      input.estado !== undefined &&
      input.estado !== categoriaChecklistExistente.estado &&
      input.estado === 'inactivo'
    ) {
      await this.validarSinPlantillasActivas(id);
    }

    const categoriaChecklist = await this.categoriaChecklistRepository.actualizarCategoriaChecklist(id, input);
    return categoriaChecklist;
  }

  private async validarSinPlantillasActivas(categoriaChecklistId: string): Promise<void> {
    if (!this.plantillaChecklistRepository) return;

    const plantillas = await this.plantillaChecklistRepository.listarPorCategoria(categoriaChecklistId);
    const activas = plantillas.filter(p => p.activo);
    if (activas.length > 0) {
      const nombres = activas.map(p => p.nombre).join(', ');
      throw new Error(
        `No se puede desactivar la categoría: hay ${activas.length} plantilla(s) activa(s) usándola: ${nombres}. Desactívalas primero.`
      );
    }
  }

  async eliminarCategoriaChecklist(id: string): Promise<boolean> {
    // Verificar que existe
    const categoriaChecklistExistente = await this.categoriaChecklistRepository.obtenerCategoriaChecklist(id);
    if (!categoriaChecklistExistente) {
      throw new Error('Categoría de checklist no encontrada');
    }

    // TODO: Validar que no esté siendo usado en expedientes
    // await this.validarUsoEnExpedientes(id);

    return await this.categoriaChecklistRepository.eliminarCategoriaChecklist(id);
  }

  async listarCategoriasChecklist(filtros?: CategoriaChecklistFiltros, limit?: number, offset?: number): Promise<CategoriaChecklistConnection> {
    return await this.categoriaChecklistRepository.listarCategoriasChecklist(filtros, limit, offset);
  }

  async obtenerCategoriasChecklistActivas(): Promise<CategoriaChecklist[]> {
    return await this.categoriaChecklistRepository.obtenerCategoriasChecklistActivas();
  }

  async obtenerCategoriasChecklistInactivas(): Promise<CategoriaChecklist[]> {
    return await this.categoriaChecklistRepository.obtenerCategoriasChecklistInactivas();
  }

  private async validarNombreUnico(nombre: string, excludeId?: string): Promise<void> {
    const existe = await this.categoriaChecklistRepository.existeNombre(nombre, excludeId);
    if (existe) {
      throw new Error('Ya existe una categoría de checklist con ese nombre');
    }
  }

  private validarTipoUso(tipoUso: string): void {
    const tiposValidos = ['pago', 'documentos_oc'];
    if (!tiposValidos.includes(tipoUso)) {
      throw new Error('Tipo de uso no válido');
    }
  }
}
