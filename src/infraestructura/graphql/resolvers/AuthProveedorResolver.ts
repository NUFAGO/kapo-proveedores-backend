// ============================================================================
// RESOLVER DE AUTENTICACIÓN PARA USUARIOS PROVEEDOR
// ============================================================================

import { IResolvers } from '@graphql-tools/utils';
import { AuthProveedorService } from '../../../aplicacion/servicios/AuthProveedorService';
import { LoginProveedorRequest } from '../../../dominio/entidades/AuthProveedor';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de autenticación para usuarios proveedor
 */
export class AuthProveedorResolver {
  constructor(private readonly authProveedorService: AuthProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Mutation: {
        /**
         * Login específico para usuarios proveedor
         * Valida estado, genera token JWT con información completa
         */
        loginProveedor: async (_: any, { usuario, contrasenna }: { usuario: string; contrasenna: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const credentials: LoginProveedorRequest = { usuario, contrasenna };
              return await this.authProveedorService.login(credentials);
            },
            'loginProveedor',
            { usuario }
          );
        },

        /**
         * Verifica si un token de proveedor es válido
         */
        verifyTokenProveedor: async (_: any, { token }: { token: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.authProveedorService.verifyToken(token);
            },
            'verifyTokenProveedor'
          );
        },

        /**
         * Refresca un token de proveedor
         */
        refreshTokenProveedor: async (_: any, { token }: { token: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.authProveedorService.refreshToken(token);
            },
            'refreshTokenProveedor'
          );
        }
      }
    };
  }
}
