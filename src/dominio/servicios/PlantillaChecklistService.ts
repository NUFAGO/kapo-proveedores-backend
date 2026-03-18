import { 
  PlantillaChecklist, 
  PlantillaChecklistInput, 
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection 
} from '../entidades/PlantillaChecklist'
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository'
import { ICategoriaChecklistRepository } from '../repositorios/ICategoriaChecklistRepository'

export class PlantillaChecklistService {
  constructor(
    private plantillaRepository: IPlantillaChecklistRepository,
    private categoriaRepository: ICategoriaChecklistRepository
  ) {}

  async crear(input: PlantillaChecklistInput): Promise<PlantillaChecklist> {
    // Validar que la categoría exista
    const categoria = await this.categoriaRepository.obtenerCategoriaChecklist(input.categoriaChecklistId)
    if (!categoria) {
      throw new Error('La categoría de checklist especificada no existe')
    }

    // Si es primera versión, plantillaBaseId debe ser el mismo ID (se asignará después de crear)
    if (input.version === 1) {
      // Validar que no exista otra plantilla con el mismo código (si se proporciona)
      if (input.codigo) {
        const existentePorCodigo = await this.plantillaRepository.obtenerVersionVigentePorCodigo(input.codigo)
        if (existentePorCodigo) {
          throw new Error('Ya existe una plantilla con ese código')
        }
      }
    } else {
      // Si no es versión 1, debe existir plantillaBaseId
      if (!input.plantillaBaseId) {
        throw new Error('Las versiones posteriores deben tener plantillaBaseId')
      }
    }

    return await this.plantillaRepository.crear(input)
  }

  async obtenerPorId(id: string): Promise<PlantillaChecklist | null> {
    return await this.plantillaRepository.obtenerPorId(id)
  }

  async obtenerConRequisitos(id: string): Promise<PlantillaChecklist | null> {
    return await this.plantillaRepository.obtenerConRequisitos(id)
  }

  async actualizar(id: string, input: Partial<PlantillaChecklistInput>): Promise<PlantillaChecklist | null> {
    const existente = await this.plantillaRepository.obtenerPorId(id)
    if (!existente) {
      throw new Error('La plantilla de checklist no existe')
    }

    // Validar unicidad del nombre si se está actualizando
    if (input.nombre && input.nombre !== existente.nombre) {
      const existeNombre = await this.plantillaRepository.existeNombre(input.nombre, id)
      if (existeNombre) {
        throw new Error('Ya existe una plantilla con ese nombre')
      }
    }

    // Validar categoría si se está actualizando
    if (input.categoriaChecklistId && input.categoriaChecklistId !== existente.categoriaChecklistId) {
      const categoria = await this.categoriaRepository.obtenerCategoriaChecklist(input.categoriaChecklistId)
      if (!categoria) {
        throw new Error('La categoría de checklist especificada no existe')
      }
    }

    return await this.plantillaRepository.actualizar(id, input)
  }

  async eliminar(id: string): Promise<boolean> {
    const existente = await this.plantillaRepository.obtenerPorId(id)
    if (!existente) {
      throw new Error('La plantilla de checklist no existe')
    }

    // Verificar si hay otras plantillas que dependen de esta como base
    const dependientes = await this.plantillaRepository.listarPorPlantillaBase(id)
    if (dependientes.length > 0) {
      throw new Error('No se puede eliminar la plantilla porque tiene versiones dependientes')
    }

    return await this.plantillaRepository.eliminar(id)
  }

  async listarConFiltros(
    filtros?: PlantillaChecklistFiltros,
    limit?: number, 
    offset?: number
  ): Promise<PlantillaChecklistConnection> {
    return await this.plantillaRepository.listarConFiltros(filtros, limit, offset)
  }

  async listarConRequisitos(
    filtros?: PlantillaChecklistFiltros, 
    limit?: number, 
    offset?: number
  ): Promise<PlantillaChecklistConnection> {
    return await this.plantillaRepository.listarConRequisitos(filtros, limit, offset)
  }

  async listarActivas(): Promise<PlantillaChecklist[]> {
    return await this.plantillaRepository.listarActivas()
  }

  async listarInactivas(): Promise<PlantillaChecklist[]> {
    return await this.plantillaRepository.listarInactivas()
  }

  async listarPorCategoria(categoriaChecklistId: string): Promise<PlantillaChecklist[]> {
    const categoria = await this.categoriaRepository.obtenerCategoriaChecklist(categoriaChecklistId)
    if (!categoria) {
      throw new Error('La categoría de checklist especificada no existe')
    }

    return await this.plantillaRepository.listarPorCategoria(categoriaChecklistId)
  }

  async duplicar(id: string, nuevoNombre: string): Promise<PlantillaChecklist> {
    const original = await this.plantillaRepository.obtenerConRequisitos(id)
    if (!original) {
      throw new Error('La plantilla de checklist no existe')
    }

    // Obtener siguiente versión
    const siguienteVersion = await this.plantillaRepository.obtenerUltimaVersion(original.categoriaChecklistId) + 1

    const nuevaPlantilla: PlantillaChecklistInput = {
      nombre: nuevoNombre,
      ...(original.descripcion && { descripcion: original.descripcion }),
      categoriaChecklistId: original.categoriaChecklistId,
      version: siguienteVersion,
      plantillaBaseId: original.plantillaBaseId,
      vigente: false, // Las duplicadas comienzan no vigentes
      activo: false // Las duplicadas comienzan inactivas
    }

    return await this.crear(nuevaPlantilla)
  }

  // Nuevos métodos para versionamiento
  async listarVigentes(): Promise<PlantillaChecklist[]> {
    return await this.plantillaRepository.listarVigentes()
  }

  async obtenerVersionesPorCodigo(codigo: string): Promise<PlantillaChecklist[]> {
    return await this.plantillaRepository.obtenerVersionesPorCodigo(codigo)
  }

  async obtenerVersionVigentePorCodigo(codigo: string): Promise<PlantillaChecklist | null> {
    return await this.plantillaRepository.obtenerVersionVigentePorCodigo(codigo)
  }

  async crearNuevaVersion(checklistId: string): Promise<PlantillaChecklist> {
    const existente = await this.plantillaRepository.obtenerPorId(checklistId)
    if (!existente) {
      throw new Error('La plantilla de checklist no existe')
    }

    return await this.plantillaRepository.crearNuevaVersion(checklistId)
  }
}
