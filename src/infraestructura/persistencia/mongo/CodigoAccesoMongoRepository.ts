// ============================================================================
// REPOSITORIO MONGODB PARA CÓDIGOS DE ACCESO
// ============================================================================

import { BaseMongoRepository } from './BaseMongoRepository';
import { ICodigoAccesoRepository } from '../../../dominio/repositorios/ICodigoAccesoRepository';
import { CodigoAcceso, CodigoAccesoInput, CodigoAccesoFiltros, VerificacionResponse, CodigoAccesoConnection } from '../../../dominio/entidades/CodigoAcceso';
import { CodigoAccesoModel } from './schemas/CodigoAccesoSchema';

/**
 * Repositorio MongoDB para la gestión de códigos de acceso
 * Implementa la interfaz ICodigoAccesoRepository
 */
export class CodigoAccesoMongoRepository extends BaseMongoRepository<CodigoAcceso> implements ICodigoAccesoRepository {
  constructor() {
    super(CodigoAccesoModel as any);
  }

  /**
   * Convierte documento de MongoDB a entidad de dominio
   */
  protected toDomain(doc: any): CodigoAcceso {
    return {
      id: doc._id.toString(),
      codigo: doc.codigo,
      proveedorId: doc.proveedorId,
      proveedorRuc: doc.proveedorRuc,
      proveedorNombre: doc.proveedorNombre,
      tipo: doc.tipo,
      fechaGeneracion: doc.fechaGeneracion,
      fechaExpiracion: doc.fechaExpiracion,
      usado: doc.usado,
      fechaUso: doc.fechaUso,
      creadoPor: doc.creadoPor,
      motivoInvalidacion: doc.motivoInvalidacion,
      activo: doc.activo
    };
  }

  /**
   * Generar código único
   */
  private generarCodigoUnico(proveedorRuc: string, tipo: string): string {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rucUlt4 = proveedorRuc.slice(-4);
    const aleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tipoCodigo = tipo === 'registro' ? 'ACC' : tipo === 'cambio' ? 'CAM' : 'REC';
    
    return `${tipoCodigo}-${fecha}-${rucUlt4}-${aleatorio}`;
  }

  /**
   * Crear código
   */
  async crear(input: CodigoAccesoInput): Promise<CodigoAcceso> {
    const codigo = this.generarCodigoUnico(input.proveedorRuc, input.tipo);
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + (input.diasValidez || 30));

    const nuevoCodigo = {
      codigo,
      proveedorId: input.proveedorId,
      proveedorRuc: input.proveedorRuc,
      proveedorNombre: input.proveedorNombre,
      tipo: input.tipo,
      fechaGeneracion: new Date(),
      fechaExpiracion,
      usado: false,
      creadoPor: input.creadoPor,
      activo: true
    };

    const resultado = await this.model.create(nuevoCodigo);
    return this.toDomain(resultado);
  }

  /**
   * Buscar código válido
   */
  async buscarValido(codigo: string): Promise<CodigoAcceso | null> {
    const resultado = await CodigoAccesoModel.buscarValido(codigo);
    return resultado ? this.toDomain(resultado) : null;
  }

  /**
   * Marcar código como usado
   */
  async marcarComoUsado(codigo: string): Promise<boolean> {
    const resultado = await this.model.updateOne(
      { codigo },
      { 
        $set: { 
          usado: true,
          fechaUso: new Date()
        }
      }
    );
    return resultado.modifiedCount > 0;
  }

  /**
   * Invalidar código
   */
  async invalidar(codigo: string, motivo: string): Promise<boolean> {
    const resultado = await this.model.updateOne(
      { codigo },
      { 
        $set: { 
          activo: false,
          motivoInvalidacion: motivo
        }
      }
    );
    return resultado.modifiedCount > 0;
  }

  /**
   * Invalidar códigos anteriores
   */
  async invalidarAnteriores(proveedorId: string, motivo: string): Promise<boolean> {
    const resultado = await CodigoAccesoModel.invalidarAnteriores(proveedorId, motivo);
    return resultado.modifiedCount > 0;
  }

  /**
   * Listar códigos con filtros
   */
  async listar(filtros: CodigoAccesoFiltros): Promise<CodigoAccesoConnection> {
    const { proveedorId, tipo, activo, page = 1, limit = 10 } = filtros;
    
    const query: any = {};
    if (proveedorId) query.proveedorId = proveedorId;
    if (tipo) query.tipo = tipo;
    if (activo !== undefined) query.activo = activo;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ fechaGeneracion: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(query)
    ]);

    return {
      codigos: data.map(doc => this.toDomain(doc)),
      totalCount: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Verificar código
   */
  async verificar(codigo: string): Promise<VerificacionResponse> {
    const codigoBD = await this.buscarValido(codigo);
    
    if (!codigoBD) {
      return {
        valido: false,
        error: 'Código inválido, expirado o ya utilizado'
      };
    }

    // Aquí se podría agregar lógica adicional de verificación
    // como verificar que el proveedor exista en el sistema externo
    
    return {
      valido: true,
      proveedorId: codigoBD.proveedorId,
      tipo: codigoBD.tipo
    };
  }

  /**
   * Obtener por ID
   */
  async obtenerPorId(id: string): Promise<CodigoAcceso | null> {
    const resultado = await this.model.findById(id);
    return resultado ? this.toDomain(resultado) : null;
  }

  /**
   * Contar códigos por proveedor
   */
  async contarPorProveedor(proveedorId: string): Promise<number> {
    return await this.model.countDocuments({ 
      proveedorId,
      activo: true 
    });
  }
}
