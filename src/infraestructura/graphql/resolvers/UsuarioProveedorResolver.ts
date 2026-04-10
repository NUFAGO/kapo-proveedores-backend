// ============================================================================
// RESOLVER DE USUARIOS PROVEEDOR - VERSIÓN SIMPLIFICADA
// ============================================================================

import { IResolvers } from '@graphql-tools/utils';
import { UsuarioProveedorService } from '../../../aplicacion/servicios/UsuarioProveedorService';
import { UsuarioProveedorInput } from '../../../dominio/entidades/UsuarioProveedor';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard, authGuard } from '../../auth/GraphQLGuards';

/**
 * Resolver de usuarios proveedor que implementa métodos específicos
 * Maneja errores de forma consistente con ErrorHandler
 */
export class UsuarioProveedorResolver {
  constructor(
    private readonly usuarioProveedorService: UsuarioProveedorService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Solo admin puede listar todos los usuarios proveedor
        usuariosProveedor: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.getAllUsuariosProveedor(),
            'usuariosProveedor'
          );
        }),

        usuariosProveedorPaginado: adminGuard(
          async (_: any, { filter }: { filter?: Record<string, unknown> }) => {
            return await ErrorHandler.handleError(
              async () =>
                await this.usuarioProveedorService.listUsuariosProveedorPaginated(filter ?? {}),
              'usuariosProveedorPaginado'
            );
          }
        ),
        
        // Admin puede buscar por ID, proveedor solo puede buscar el suyo
        usuarioProveedor: authGuard(async (_: any, { id }: { id: string }, context) => {
          // Si es proveedor, verificar que esté buscando su propio usuario
          if (context.user?.tipo_usuario === 'proveedor' && context.user?.id !== id) {
            throw new Error('AUTORIZACION_DENEGADA: Los proveedores solo pueden ver su propia información');
          }
          
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.getUsuarioProveedor(id),
            'usuarioProveedor'
          );
        }),
        
        // Solo admin puede buscar por DNI
        usuarioProveedorByDni: adminGuard(async (_: any, { dni }: { dni: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.getUsuarioProveedorByDni(dni),
            'usuarioProveedorByDni'
          );
        }),
        
        // Solo admin puede buscar por username
        usuarioProveedorByUsername: adminGuard(async (_: any, { username }: { username: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.getUsuarioProveedorByUsername(username),
            'usuarioProveedorByUsername'
          );
        }),
        
        // Admin puede ver todos de un proveedor, proveedor solo puede ver los suyos
        usuariosProveedorByProveedorId: authGuard(async (_: any, { proveedor_id }: { proveedor_id: string }, context) => {
          // Si es proveedor, verificar que esté buscando sus propios usuarios
          if (context.user?.tipo_usuario === 'proveedor' && context.user?.proveedor_id !== proveedor_id) {
            throw new Error('AUTORIZACION_DENEGADA: Los proveedores solo pueden ver sus propios usuarios');
          }
          
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.getUsuariosProveedorByProveedorId(proveedor_id),
            'usuariosProveedorByProveedorId'
          );
        })
      },
      
      Mutation: {
        // Creación de usuarios proveedor es pública (auto-registro)
        createUsuarioProveedor: async (_: any, { data }: { data: UsuarioProveedorInput }) => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.createUsuarioProveedor(data),
            'createUsuarioProveedor'
          );
        },
        
        // Admin puede actualizar cualquier usuario, proveedor solo el suyo
        updateUsuarioProveedor: authGuard(async (_: any, { id, data }: { id: string, data: UsuarioProveedorInput }, context) => {
          // Si es proveedor, verificar que esté actualizando su propio usuario
          if (context.user?.tipo_usuario === 'proveedor' && context.user?.id !== id) {
            throw new Error('AUTORIZACION_DENEGADA: Los proveedores solo pueden actualizar su propia información');
          }
          
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.updateUsuarioProveedor(id, data),
            'updateUsuarioProveedor'
          );
        }),

        cambiarContrasenaUsuarioProveedor: authGuard(
          async (
            _: any,
            { id, nuevaPassword }: { id: string; nuevaPassword: string },
            context: { user?: { tipo_usuario?: string; id?: string } }
          ) => {
            if (context.user?.tipo_usuario === 'proveedor' && context.user?.id !== id) {
              throw new Error(
                'AUTORIZACION_DENEGADA: Los proveedores solo pueden cambiar la contraseña de su propia cuenta'
              );
            }

            return await ErrorHandler.handleError(
              async () =>
                await this.usuarioProveedorService.cambiarContrasenaUsuarioProveedor(id, nuevaPassword),
              'cambiarContrasenaUsuarioProveedor'
            );
          }
        ),
        
        // Solo admin puede eliminar usuarios proveedor
        deleteUsuarioProveedor: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.deleteUsuarioProveedor(id),
            'deleteUsuarioProveedor'
          );
        }),
        
        // Admin puede cambiar estado de cualquier usuario, proveedor solo puede desactivar el suyo
        cambiarEstadoUsuarioProveedor: authGuard(async (_: any, { id, estado }: { id: string, estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO' }, context) => {
          // Si es proveedor, verificar que esté cambiando su propio estado y solo a 'inactivo'
          if (context.user?.tipo_usuario === 'proveedor') {
            if (context.user?.id !== id) {
              throw new Error('AUTORIZACION_DENEGADA: Los proveedores solo pueden cambiar su propio estado');
            }
            if (estado !== 'INACTIVO') {
              throw new Error('AUTORIZACION_DENEGADA: Los proveedores solo pueden desactivar su cuenta');
            }
          }
          
          return await ErrorHandler.handleError(
            async () => await this.usuarioProveedorService.cambiarEstado(id, estado),
            'cambiarEstadoUsuarioProveedor'
          );
        })
      }
    };
  }
}
