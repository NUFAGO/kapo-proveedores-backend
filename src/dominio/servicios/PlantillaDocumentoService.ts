import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../entidades/PlantillaDocumento';
import { IPlantillaDocumentoRepository } from '../repositorios/IPlantillaDocumentoRepository';

export class PlantillaDocumentoService {
  constructor(private readonly plantillaDocumentoRepository: IPlantillaDocumentoRepository) {}

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

    const plantillaDocumento = await this.plantillaDocumentoRepository.actualizarPlantillaDocumento(id, input);
    return plantillaDocumento;
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
