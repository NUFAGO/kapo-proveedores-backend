import { 
  PlantillaChecklist, 
  PlantillaChecklistInput, 
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection 
} from '../entidades/PlantillaChecklist'
import { 
  RequisitoDocumentoInput 
} from '../entidades/PlantillaChecklist'
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository'
import { ICategoriaChecklistRepository } from '../repositorios/ICategoriaChecklistRepository'
import { IRequisitoDocumentoRepository } from '../repositorios/IRequisitoDocumentoRepository'

export class PlantillaChecklistService {
  constructor(
    private plantillaRepository: IPlantillaChecklistRepository,
    private categoriaRepository: ICategoriaChecklistRepository,
    private requisitoRepository: IRequisitoDocumentoRepository
  ) {}

  async crear(input: PlantillaChecklistInput): Promise<PlantillaChecklist> {
    // Validar que la categoría exista
    const categoria = await this.categoriaRepository.obtenerCategoriaChecklist(input.categoriaChecklistId)
    if (!categoria) {
      throw new Error('La categoría de checklist especificada no existe')
    }

    // Validar que no exista otra plantilla con el mismo código (si se proporciona)
    // Nota: Por ahora omitimos esta validación ya que el método no existe en el repositorio
    // TODO: Implementar validación de código único cuando esté disponible el método correspondiente

    return await this.plantillaRepository.crear(input)
  }

  async obtenerPorId(id: string): Promise<PlantillaChecklist | null> {
    return await this.plantillaRepository.obtenerPorId(id)
  }

  async obtenerConRequisitos(id: string): Promise<PlantillaChecklist | null> {
    return await this.plantillaRepository.obtenerConRequisitos(id)
  }

  /** Varias plantillas con requisitos en una sola agregación (mismo pipeline que `obtenerPorIds` en repo). */
  async obtenerConRequisitosPorIds(ids: string[]): Promise<PlantillaChecklist[]> {
    const unique = [...new Set(ids.filter((x) => x && String(x).trim() !== ''))];
    if (unique.length === 0) return [];
    return this.plantillaRepository.obtenerPorIds(unique);
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

    const nuevaPlantilla: PlantillaChecklistInput = {
      nombre: nuevoNombre,
      ...(original.descripcion && { descripcion: original.descripcion }),
      categoriaChecklistId: original.categoriaChecklistId,
      activo: false // Las duplicadas comienzan inactivas
    }

    return await this.crear(nuevaPlantilla)
  }

  async guardarCompleto(input: {
    id?: string;
    datosPlantilla: PlantillaChecklistInput;
    requisitos: Array<RequisitoDocumentoInput>;
    requisitosActualizar: Array<{ 
      id: string; 
      checklistId?: string | undefined; 
      tipoRequisito?: "documento" | "formulario" | undefined; 
      plantillaDocumentoId?: string | undefined; 
      formularioId?: string | undefined; 
      obligatorio?: boolean | undefined; 
      orden?: number | undefined; 
      activo?: boolean | undefined; 
    }>;
    requisitosDesactivar: string[];
  }): Promise<PlantillaChecklist> {
    const { id, datosPlantilla, requisitos, requisitosActualizar, requisitosDesactivar } = input;

    let plantilla: PlantillaChecklist;

    if (id) {
      // ACTUALIZACIÓN
      const resultado = await this.actualizar(id, datosPlantilla);
      if (!resultado) {
        throw new Error('No se pudo actualizar la plantilla de checklist');
      }
      plantilla = resultado;

      // Crear nuevos requisitos
      console.log('🆕 Creando nuevos requisitos:', requisitos.length);
      for (const req of requisitos) {
        console.log('🔍 Nuevo requisito a crear:', req);
        await this.requisitoRepository.crear({ ...req, checklistId: id });
      }

      // Actualizar requisitos existentes
      console.log('🔄 Actualizando requisitos existentes:', requisitosActualizar.length);
      for (const req of requisitosActualizar) {
        console.log('🔍 Requisito a actualizar:', req);
        const { id: reqId, ...datosActualizacion } = req;
        // Filtrar propiedades undefined para evitar problemas con exactOptionalPropertyTypes
        const datosFiltrados: Partial<RequisitoDocumentoInput> = {};
        if (datosActualizacion.checklistId !== undefined) datosFiltrados.checklistId = datosActualizacion.checklistId;
        if (datosActualizacion.tipoRequisito !== undefined) datosFiltrados.tipoRequisito = datosActualizacion.tipoRequisito;
        if (datosActualizacion.plantillaDocumentoId !== undefined) datosFiltrados.plantillaDocumentoId = datosActualizacion.plantillaDocumentoId;
        if (datosActualizacion.formularioId !== undefined) datosFiltrados.formularioId = datosActualizacion.formularioId;
        if (datosActualizacion.obligatorio !== undefined) datosFiltrados.obligatorio = datosActualizacion.obligatorio;
        if (datosActualizacion.orden !== undefined) datosFiltrados.orden = datosActualizacion.orden;
        if (datosActualizacion.activo !== undefined) datosFiltrados.activo = datosActualizacion.activo;
        
        await this.requisitoRepository.actualizar(reqId, datosFiltrados);
      }

      // Desactivar requisitos
      for (const reqId of requisitosDesactivar) {
        await this.requisitoRepository.actualizar(reqId, { activo: false });
      }

    } else {
      // CREACIÓN
      plantilla = await this.crear(datosPlantilla);

      // Crear todos los requisitos
      for (const req of requisitos) {
        await this.requisitoRepository.crear({ ...req, checklistId: plantilla.id });
      }
    }

    // Retornar plantilla completa con requisitos
    const resultado = await this.plantillaRepository.obtenerConRequisitos(plantilla.id);
    if (!resultado) {
      throw new Error('No se pudo obtener la plantilla guardada');
    }

    return resultado;
  }
}
