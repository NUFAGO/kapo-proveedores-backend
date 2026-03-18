export interface PlantillaFormulario {
  id: string
  nombre: string
  descripcion?: string
  version: number
  baseId: string
  campos: any[]
  activo: boolean
  fechaCreacion: string
  fechaActualizacion?: string
}

export interface PlantillaFormularioInput {
  nombre: string
  descripcion?: string
  version: number
  baseId: string
  campos: any[]
  activo: boolean
}

export interface IPlantillaFormularioRepository {
  obtenerPlantillaFormulario(id: string): Promise<PlantillaFormulario | null>
  listarActivas(): Promise<PlantillaFormulario[]>
  existeNombre(nombre: string, excludeId?: string): Promise<boolean>
}
