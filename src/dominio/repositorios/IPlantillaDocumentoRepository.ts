import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../entidades/PlantillaDocumento';

export interface IPlantillaDocumentoRepository {
  crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento>;
  obtenerPlantillaDocumento(id: string): Promise<PlantillaDocumento | null>;
  actualizarPlantillaDocumento(id: string, input: Partial<PlantillaDocumentoInput>): Promise<PlantillaDocumento>;
  eliminarPlantillaDocumento(id: string): Promise<boolean>;
  listarPlantillasDocumento(filtros?: PlantillaDocumentoFiltros, limit?: number, offset?: number): Promise<PlantillaDocumentoConnection>;
  obtenerPlantillasDocumentoActivas(): Promise<PlantillaDocumento[]>;
  obtenerPlantillasDocumentoInactivas(): Promise<PlantillaDocumento[]>;
  existeNombrePlantilla(nombrePlantilla: string, excludeId?: string): Promise<boolean>;
  generarSiguienteCodigo(): Promise<string>;
}
