import { 
  RequisitoDocumento, 
  RequisitoDocumentoInput, 
  RequisitoDocumentoFiltros 
} from '../entidades/PlantillaChecklist'
import { IRequisitoDocumentoRepository } from '../repositorios/IRequisitoDocumentoRepository'
import { IPlantillaDocumentoRepository } from '../repositorios/IPlantillaDocumentoRepository'

export class RequisitoDocumentoService {
  constructor(
    private requisitoRepository: IRequisitoDocumentoRepository,
    private plantillaDocumentoRepository: IPlantillaDocumentoRepository
  ) {}

  async crear(input: RequisitoDocumentoInput): Promise<RequisitoDocumento> {
    // Validar que el checklist exista
    const checklist = await this.requisitoRepository.contarPorChecklist(input.checklistId)
    if (checklist === 0) {
      throw new Error('El checklist especificado no existe')
    }

    // Validar tipo de requisito y referencias
    if (input.tipoRequisito === 'documento') {
      if (!input.plantillaDocumentoId) {
        throw new Error('plantillaDocumentoId es requerido cuando tipoRequisito es "documento"')
      }
      
      // Validar que la plantilla de documento exista
      const plantillaDoc = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(input.plantillaDocumentoId)
      if (!plantillaDoc) {
        throw new Error('La plantilla de documento especificada no existe')
      }
      
      if (input.formularioId) {
        throw new Error('formularioId no debe estar presente cuando tipoRequisito es "documento"')
      }
    } else if (input.tipoRequisito === 'formulario') {
      // TODO: Implementar cuando se cree PlantillaFormularioRepository
      throw new Error('Los requisitos de tipo formulario estarán disponibles en futuras versiones')
    }

    // Validar que el orden no esté duplicado
    const existeOrden = await this.requisitoRepository.existeOrden(input.checklistId, input.orden)
    if (existeOrden) {
      throw new Error('Ya existe un requisito con ese orden en este checklist')
    }

    return await this.requisitoRepository.crear(input)
  }

  async obtenerPorId(id: string): Promise<RequisitoDocumento | null> {
    return await this.requisitoRepository.obtenerPorId(id)
  }

  async actualizar(id: string, input: Partial<RequisitoDocumentoInput>): Promise<RequisitoDocumento | null> {
    const existente = await this.requisitoRepository.obtenerPorId(id)
    if (!existente) {
      throw new Error('El requisito de documento no existe')
    }

    // Validar cambios en tipo de requisito
    if (input.tipoRequisito && input.tipoRequisito !== existente.tipoRequisito) {
      throw new Error('No se puede cambiar el tipo de requisito')
    }

    // Validar referencias si se están actualizando
    if (existente.tipoRequisito === 'documento' && input.plantillaDocumentoId) {
      const plantillaDoc = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(input.plantillaDocumentoId)
      if (!plantillaDoc) {
        throw new Error('La plantilla de documento especificada no existe')
      }
    }

    if (existente.tipoRequisito === 'formulario' && input.formularioId) {
      // TODO: Implementar cuando se cree PlantillaFormularioRepository
      throw new Error('Los requisitos de tipo formulario estarán disponibles en futuras versiones')
    }

    // Validar orden si se está actualizando
    if (input.orden && input.orden !== existente.orden) {
      const existeOrden = await this.requisitoRepository.existeOrden(existente.checklistId, input.orden, id)
      if (existeOrden) {
        throw new Error('Ya existe un requisito con ese orden en este checklist')
      }
    }

    return await this.requisitoRepository.actualizar(id, input)
  }

  async eliminar(id: string): Promise<boolean> {
    const existente = await this.requisitoRepository.obtenerPorId(id)
    if (!existente) {
      throw new Error('El requisito de documento no existe')
    }

    return await this.requisitoRepository.eliminar(id)
  }

  async listarPorChecklist(checklistId: string): Promise<RequisitoDocumento[]> {
    return await this.requisitoRepository.listarPorChecklist(checklistId)
  }

  async listarPorChecklistConRelaciones(checklistId: string): Promise<RequisitoDocumento[]> {
    return await this.requisitoRepository.listarPorChecklistConRelaciones(checklistId)
  }

  async listarConFiltros(filtros?: RequisitoDocumentoFiltros): Promise<RequisitoDocumento[]> {
    return await this.requisitoRepository.listarConFiltros(filtros)
  }

  async reordenarRequisitos(checklistId: string, requisitos: { id: string; orden: number }[]): Promise<boolean> {
    // Validar que todos los requisitos pertenezcan al mismo checklist
    for (const req of requisitos) {
      const existente = await this.requisitoRepository.obtenerPorId(req.id)
      if (!existente || existente.checklistId !== checklistId) {
        throw new Error('Uno de los requisitos no pertenece a este checklist')
      }
    }

    // Validar que no haya órdenes duplicados
    const ordenes = requisitos.map(r => r.orden)
    const ordenesUnicos = new Set(ordenes)
    if (ordenes.length !== ordenesUnicos.size) {
      throw new Error('Los órdenes deben ser únicos')
    }

    return await this.requisitoRepository.actualizarOrden(checklistId, requisitos)
  }

  async crearMultiples(requisitos: RequisitoDocumentoInput[]): Promise<RequisitoDocumento[]> {
    // Validar que todos pertenezcan al mismo checklist
    const checklistIds = new Set(requisitos.map(r => r.checklistId))
    if (checklistIds.size > 1) {
      throw new Error('Todos los requisitos deben pertenecer al mismo checklist')
    }

    // Validar cada requisito individualmente
    for (const requisito of requisitos) {
      await this.validarRequisitoInput(requisito)
    }

    return await this.requisitoRepository.crearMultiples(requisitos)
  }

  async eliminarPorChecklist(checklistId: string): Promise<boolean> {
    return await this.requisitoRepository.eliminarPorChecklist(checklistId)
  }

  async toggleActivo(id: string): Promise<RequisitoDocumento | null> {
    const existente = await this.requisitoRepository.obtenerPorId(id)
    if (!existente) {
      throw new Error('El requisito de documento no existe')
    }

    const nuevoEstado = !existente.activo
    return await this.requisitoRepository.actualizar(id, { activo: nuevoEstado })
  }

  private async validarRequisitoInput(input: RequisitoDocumentoInput): Promise<void> {
    if (input.tipoRequisito === 'documento') {
      if (!input.plantillaDocumentoId) {
        throw new Error('plantillaDocumentoId es requerido cuando tipoRequisito es "documento"')
      }
      
      const plantillaDoc = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(input.plantillaDocumentoId)
      if (!plantillaDoc) {
        throw new Error('La plantilla de documento especificada no existe')
      }
    } else if (input.tipoRequisito === 'formulario') {
      // TODO: Implementar cuando se cree PlantillaFormularioRepository
      throw new Error('Los requisitos de tipo formulario estarán disponibles en futuras versiones')
    }
  }
}
