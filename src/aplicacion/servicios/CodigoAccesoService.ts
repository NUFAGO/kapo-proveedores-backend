import { ICodigoAccesoRepository } from '../../dominio/repositorios/ICodigoAccesoRepository';
import { ProveedorService } from './ProveedorService';
import { CodigoAcceso, CodigosGenerados, CodigoAccesoFiltros, VerificacionResponse } from '../../dominio/entidades/CodigoAcceso';

// ============================================================================
// SERVICIO CÓDIGO ACCESO - Lógica de negocio
// ============================================================================

export class CodigoAccesoService {
  constructor(
    private codigoAccesoRepository: ICodigoAccesoRepository,
    private proveedorService: ProveedorService
  ) {}

  // Generar códigos completos para el modal
  async generarCodigosCompletos(
    proveedorId: string,
    proveedorRuc: string,
    proveedorNombre?: string,
    creadoPor?: string,
    diasValidez: number = 30
  ): Promise<CodigosGenerados> {
    try {
      // Invalidar códigos anteriores del mismo proveedor
      await this.codigoAccesoRepository.invalidarAnteriores(
        proveedorId, 
        'Nuevo código generado'
      );

      // Generar código de acceso (el único que se guarda en BD)
      const codigoBD = await this.codigoAccesoRepository.crear({
        proveedorId,
        proveedorRuc,
        proveedorNombre,
        tipo: 'registro',
        creadoPor,
        diasValidez
      });

      // Generar códigos adicionales (solo para mostrar, no se guardan)
      const ruc = proveedorRuc.replace(/\D/g, '').slice(0, 8);
      const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const codigos: CodigosGenerados = {
        codigoProveedor: `PROV-${ruc}-${aleatorio}`,
        codigoAcceso: codigoBD.codigo,
        codigoVerificacion: `VER-${aleatorio}-${ruc.slice(-4)}`,
        codigoBD
      };

      return codigos;
    } catch (error) {
      console.error('Error al generar códigos:', error);
      throw new Error('No se pudieron generar los códigos');
    }
  }

  // Generar un solo código
  async generarCodigo(
    proveedorId: string,
    proveedorRuc: string,
    tipo: 'registro' | 'cambio' | 'recuperacion',
    proveedorNombre?: string,
    creadoPor?: string,
    diasValidez: number = 30
  ): Promise<CodigoAcceso> {
    try {
      return await this.codigoAccesoRepository.crear({
        proveedorId,
        proveedorRuc,
        proveedorNombre,
        tipo,
        creadoPor,
        diasValidez
      });
    } catch (error) {
      console.error('Error al generar código:', error);
      throw new Error('No se pudo generar el código');
    }
  }

  // Verificar código para acceso
  async verificarCodigo(codigo: string): Promise<VerificacionResponse> {
    try {
      const resultado = await this.codigoAccesoRepository.verificar(codigo);
      
      if (!resultado.valido || !resultado.proveedorId) {
        return resultado;
      }

      // Obtener datos completos del proveedor usando ProveedorService
      try {
        const proveedor = await this.proveedorService.obtenerProveedorPorId(resultado.proveedorId);
        
        const response: VerificacionResponse = {
          valido: true,
          proveedorId: resultado.proveedorId,
          proveedor: proveedor
        };
        
        // Solo agregar tipo si existe
        if (resultado.tipo !== undefined) {
          response.tipo = resultado.tipo;
        }
        
        return response;
      } catch (proveedorError) {
        console.error('Error al obtener datos del proveedor:', proveedorError);
        // Si no se puede obtener el proveedor, devolver respuesta válida pero sin datos del proveedor
        const response: VerificacionResponse = {
          valido: true,
          proveedorId: resultado.proveedorId,
          error: 'No se pudieron obtener los datos del proveedor'
        };
        
        // Solo agregar tipo si existe
        if (resultado.tipo !== undefined) {
          response.tipo = resultado.tipo;
        }
        
        return response;
      }
    } catch (error) {
      console.error('Error al verificar código:', error);
      return {
        valido: false,
        error: 'Error al verificar el código'
      };
    }
  }

  // Marcar código como usado
  async marcarComoUsado(codigo: string): Promise<boolean> {
    try {
      return await this.codigoAccesoRepository.marcarComoUsado(codigo);
    } catch (error) {
      console.error('Error al marcar código como usado:', error);
      return false;
    }
  }

  // Invalidar código
  async invalidarCodigo(codigo: string, motivo: string): Promise<boolean> {
    try {
      return await this.codigoAccesoRepository.invalidar(codigo, motivo);
    } catch (error) {
      console.error('Error al invalidar código:', error);
      return false;
    }
  }

  // Listar códigos con paginación
  async listarCodigos(filtros: CodigoAccesoFiltros) {
    try {
      return await this.codigoAccesoRepository.listar(filtros);
    } catch (error) {
      console.error('Error al listar códigos:', error);
      throw new Error('No se pudieron listar los códigos');
    }
  }

  // Obtener código por ID
  async obtenerPorId(id: string): Promise<CodigoAcceso | null> {
    try {
      return await this.codigoAccesoRepository.obtenerPorId(id);
    } catch (error) {
      console.error('Error al obtener código:', error);
      return null;
    }
  }

  // Invalidar códigos anteriores de un proveedor
  async invalidarCodigosAnteriores(proveedorId: string, motivo: string): Promise<boolean> {
    try {
      return await this.codigoAccesoRepository.invalidarAnteriores(proveedorId, motivo);
    } catch (error) {
      console.error('Error al invalidar códigos anteriores:', error);
      return false;
    }
  }

  // Obtener estadísticas de códigos de un proveedor
  async obtenerEstadisticasPorProveedor(proveedorId: string) {
    try {
      const total = await this.codigoAccesoRepository.contarPorProveedor(proveedorId);
      
      return {
        totalActivos: total,
        proveedorId
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        totalActivos: 0,
        proveedorId
      };
    }
  }
}
