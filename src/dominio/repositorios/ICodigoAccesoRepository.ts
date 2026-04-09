import { CodigoAcceso, CodigoAccesoInput, CodigoAccesoFiltros, VerificacionResponse, CodigoAccesoConnection } from '../entidades/CodigoAcceso';

// ============================================================================
// INTERFAZ REPOSITORIO CÓDIGO ACCESO
// ============================================================================

export interface ICodigoAccesoRepository {
  // Crear código
  crear(codigo: CodigoAccesoInput): Promise<CodigoAcceso>;
  
  // Buscar código válido por código string
  buscarValido(codigo: string): Promise<CodigoAcceso | null>;
  
  // Marcar código como usado
  marcarComoUsado(codigo: string): Promise<boolean>;
  
  // Invalidar código
  invalidar(codigo: string, motivo: string): Promise<boolean>;
  
  // Invalidar códigos anteriores de un proveedor
  invalidarAnteriores(proveedorId: string, motivo: string): Promise<boolean>;
  
  // Listar códigos con filtros
  listar(filtros: CodigoAccesoFiltros): Promise<CodigoAccesoConnection>;
  
  // Verificar código para acceso
  verificar(codigo: string): Promise<VerificacionResponse>;
  
  // Obtener por ID
  obtenerPorId(id: string): Promise<CodigoAcceso | null>;
  
  // Contar códigos por proveedor
  contarPorProveedor(proveedorId: string): Promise<number>;
}
