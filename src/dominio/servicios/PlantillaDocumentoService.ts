import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../entidades/PlantillaDocumento';
import { IPlantillaDocumentoRepository } from '../repositorios/IPlantillaDocumentoRepository';
import { IRequisitoDocumentoRepository } from '../repositorios/IRequisitoDocumentoRepository';
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository';

export class PlantillaDocumentoService {
  constructor(
    private readonly plantillaDocumentoRepository: IPlantillaDocumentoRepository,
    private readonly requisitoDocumentoRepository?: IRequisitoDocumentoRepository,
    private readonly plantillaChecklistRepository?: IPlantillaChecklistRepository
  ) {}

  async crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento> {
    await this.validarNombreUnico(input.nombrePlantilla);

    const plantillaDocumento = await this.plantillaDocumentoRepository.crearPlantillaDocumento(input);
    return plantillaDocumento;
  }

  async obtenerPlantillaDocumento(id: string): Promise<PlantillaDocumento> {
    const plantillaDocumento = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaDocumento) {
      throw new Error('Plantilla de documento no encontrada');
    }
    return plantillaDocumento;
  }

  async actualizarPlantillaDocumento(id: string, input: Partial<PlantillaDocumentoInput>): Promise<PlantillaDocumento> {
    const plantillaExistente = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaExistente) {
      throw new Error('Plantilla de documento no encontrada');
    }

    if (input.nombrePlantilla && input.nombrePlantilla !== plantillaExistente.nombrePlantilla) {
      await this.validarNombreUnico(input.nombrePlantilla, id);
    }

    // Validación de cambio de estado: bloquear desactivación si hay requisitos activos en plantillas activas
    if (
      input.activo !== undefined &&
      input.activo !== plantillaExistente.activo &&
      input.activo === false
    ) {
      await this.validarSinRequisitosActivos(id);
    }

    const plantillaDocumento = await this.plantillaDocumentoRepository.actualizarPlantillaDocumento(id, input);
    return plantillaDocumento;
  }

  private async validarSinRequisitosActivos(plantillaDocumentoId: string): Promise<void> {
    if (!this.requisitoDocumentoRepository) return;

    const requisitosActivos = await this.requisitoDocumentoRepository.listarConFiltros({
      plantillaDocumentoId,
      activo: true,
    });

    if (requisitosActivos.length === 0) return;

    // Bloquear solo si la plantilla checklist padre del requisito también está activa.
    // Si el requisito está inactivo o su checklist está inactivo, se permite desactivar.
    if (!this.plantillaChecklistRepository) {
      throw new Error(
        `No se puede desactivar la plantilla-documento: está siendo usada como requisito activo en ${requisitosActivos.length} checklist(s).`
      );
    }

    const checklistIds = [...new Set(requisitosActivos.map(r => r.checklistId))];
    const checklists = await this.plantillaChecklistRepository.obtenerPorIds(checklistIds);
    const checklistsActivos = checklists.filter(c => c.activo);
    if (checklistsActivos.length > 0) {
      const nombres = checklistsActivos.map(c => c.nombre).join(', ');
      throw new Error(
        `No se puede desactivar la plantilla-documento: es requisito activo en ${checklistsActivos.length} checklist(s) activo(s): ${nombres}. Quita el requisito o desactiva los checklists primero.`
      );
    }
  }

  async eliminarPlantillaDocumento(id: string): Promise<boolean> {
    const plantillaExistente = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaExistente) {
      throw new Error('Plantilla de documento no encontrada');
    }

    return await this.plantillaDocumentoRepository.eliminarPlantillaDocumento(id);
  }

  async listarPlantillasDocumento(filtros?: PlantillaDocumentoFiltros, limit?: number, offset?: number): Promise<PlantillaDocumentoConnection> {
    return await this.plantillaDocumentoRepository.listarPlantillasDocumento(filtros, limit, offset);
  }

  async obtenerPlantillasDocumentoActivas(): Promise<PlantillaDocumento[]> {
    return await this.plantillaDocumentoRepository.obtenerPlantillasDocumentoActivas();
  }

  async obtenerPlantillasDocumentoInactivas(): Promise<PlantillaDocumento[]> {
    return await this.plantillaDocumentoRepository.obtenerPlantillasDocumentoInactivas();
  }

  private async validarNombreUnico(nombrePlantilla: string, excludeId?: string): Promise<void> {
    const existe = await this.plantillaDocumentoRepository.existeNombrePlantilla(nombrePlantilla, excludeId);
    if (existe) {
      throw new Error('Ya existe una plantilla con ese nombre');
    }
  }
}
