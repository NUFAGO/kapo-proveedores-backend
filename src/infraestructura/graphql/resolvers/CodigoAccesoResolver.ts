import { IResolvers } from '@graphql-tools/utils';
import { CodigoAccesoService } from '../../../aplicacion/servicios/CodigoAccesoService';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver para gestión de códigos de acceso de proveedores
 * Sigue la arquitectura establecida del proyecto
 */
export class CodigoAccesoResolver extends BaseResolver<any> {
  constructor(private readonly codigoAccesoService: CodigoAccesoService) {
    super(codigoAccesoService as any);
  }

  /**
   * Nombre de la entidad para logging
   */
  protected getEntityName(): string {
    return 'CodigoAcceso';
  }

  /**
   * Implementa los resolvers para consultas y mutaciones de códigos de acceso
   */
  override getResolvers(): IResolvers {
    return {
      Query: {
        // Listar códigos con filtros y paginación
        codigosAcceso: async (_: any, { filtros }: { filtros?: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.listarCodigos(filtros || {});
            },
            'codigosAcceso',
            { filtros }
          );
        },

        // Obtener código por ID
        codigoAcceso: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.obtenerPorId(id);
            },
            'codigoAcceso',
            { id }
          );
        },

        // Obtener código por código string
        codigoAccesoPorCodigo: async (_: any, { codigo }: { codigo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await (this.codigoAccesoService['codigoAccesoRepository'] as any).buscarValido(codigo);
            },
            'codigoAccesoPorCodigo',
            { codigo }
          );
        },

        // Verificar código para acceso
        verificarCodigoAcceso: async (_: any, { codigo }: { codigo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.verificarCodigo(codigo);
            },
            'verificarCodigoAcceso',
            { codigo }
          );
        },

        // Obtener estadísticas de códigos por proveedor
        estadisticasCodigosPorProveedor: async (_: any, { proveedorId }: { proveedorId: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.obtenerEstadisticasPorProveedor(proveedorId);
            },
            'estadisticasCodigosPorProveedor',
            { proveedorId }
          );
        }
      },

      Mutation: {
        // Generar un solo código
        generarCodigoAcceso: async (_: any, { input }: { input: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              const codigo = await this.codigoAccesoService.generarCodigo(
                input.proveedorId,
                input.proveedorRuc,
                input.tipo,
                input.proveedorNombre,
                input.creadoPor,
                input.diasValidez
              );

              return {
                exito: true,
                codigo,
                mensaje: 'Código generado exitosamente'
              };
            },
            'generarCodigoAcceso',
            { input }
          );
        },

        // Generar códigos completos para el modal
        generarCodigosCompletos: async (_: any, args: any) => {
          return await ErrorHandler.handleError(
            async () => {
              const { proveedorId, proveedorRuc, proveedorNombre, creadoPor, diasValidez } = args;
              
              const codigos = await this.codigoAccesoService.generarCodigosCompletos(
                proveedorId,
                proveedorRuc,
                proveedorNombre,
                creadoPor,
                diasValidez
              );

              return codigos;
            },
            'generarCodigosCompletos',
            args
          );
        },

        // Invalidar código específico
        invalidarCodigo: async (_: any, { codigo, motivo }: { codigo: string, motivo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.invalidarCodigo(codigo, motivo);
            },
            'invalidarCodigo',
            { codigo, motivo }
          );
        },

        // Invalidar códigos anteriores de un proveedor
        invalidarCodigosAnteriores: async (_: any, { proveedorId, motivo }: { proveedorId: string, motivo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.invalidarCodigosAnteriores(proveedorId, motivo);
            },
            'invalidarCodigosAnteriores',
            { proveedorId, motivo }
          );
        },

        // Marcar código como usado
        marcarCodigoComoUsado: async (_: any, { codigo }: { codigo: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.codigoAccesoService.marcarComoUsado(codigo);
            },
            'marcarCodigoComoUsado',
            { codigo }
          );
        }
      }
    };
  }
}
