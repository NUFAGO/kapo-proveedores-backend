// ============================================================================
// RESOLVER TIPO DOCUMENTO - Queries y Mutations para tipos de documentos
// ============================================================================

import { IResolvers } from '@graphql-tools/utils';
import { TipoDocumentoService } from '../../../aplicacion/servicios/TipoDocumentoService';

export class TipoDocumentoResolver {
  constructor(
    private readonly tipoDocumentoService: TipoDocumentoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        obtenerTipoDocumento: async (_: unknown, args: { id: string }) => {
          const { id } = args;
          return await this.tipoDocumentoService.obtenerTipoDocumento(id);
        },
        
        listarTiposDocumento: async (_: unknown, args: {
          limit?: number;
          offset?: number;
          filters?: {
            nombre?: string;
            estado?: 'activo' | 'inactivo';
          };
        }) => {
          const { limit = 20, offset = 0, filters = {} } = args;
          const filtrosCompletos = {
            ...filters,
            limit,
            offset
          };
          return await this.tipoDocumentoService.buscarTiposDocumento(filtrosCompletos);
        },

        findInactivos: async () => {
          return await this.tipoDocumentoService.findInactivos();
        },

        findActivos: async () => {
          return await this.tipoDocumentoService.findActivos();
        }
      },
      
      Mutation: {
        crearTipoDocumento: async (_: unknown, args: { input: any }) => {
          const { input } = args;
          return await this.tipoDocumentoService.crearTipoDocumento(input);
        },
        
        actualizarTipoDocumento: async (_: unknown, args: { id: string; input: any }) => {
          const { id, input } = args;
          return await this.tipoDocumentoService.actualizarTipoDocumento(id, input);
        },
        
        eliminarTipoDocumento: async (_: unknown, args: { id: string }) => {
          const { id } = args;
          return await this.tipoDocumentoService.eliminarTipoDocumento(id);
        }
      }
    };
  }
}
