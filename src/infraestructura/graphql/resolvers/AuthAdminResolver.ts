// ============================================================================
// RESOLVER DE AUTENTICACIÓN PARA USUARIOS EXTERNOS (ADMIN)
// ============================================================================

import { IResolvers } from '@graphql-tools/utils';
import { AuthAdminService } from '../../../aplicacion/servicios/AuthAdminService';
import { LoginRequest } from '../../../dominio/entidades/Auth';
import { ErrorHandler } from './ErrorHandler';

/**
 * Wrapper resolver para auth externo que genera nuestro JWT
 */
export class AuthAdminResolver {
  constructor(private readonly authAdminService: AuthAdminService) {}

  getResolvers(): IResolvers {
    return {
      Mutation: {
        /**
         * Login para usuarios externos (admin)
         * Usa auth externo pero genera nuestro JWT con tipo_usuario: 'admin'
         */
        loginAdmin: async (_: any, { usuario, contrasenna }: { usuario: string; contrasenna: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              const credentials: LoginRequest = { usuario, contrasenna };
              return await this.authAdminService.login(credentials);
            },
            'loginAdmin',
            { usuario }
          );
        },

        /**
         * Verifica si un token de admin es válido
         */
        verifyTokenAdmin: async (_: any, { token }: { token: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.authAdminService.verifyToken(token);
            },
            'verifyTokenAdmin'
          );
        },

        /**
         * Refresca un token de admin
         */
        refreshTokenAdmin: async (_: any, { token }: { token: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.authAdminService.refreshToken(token);
            },
            'refreshTokenAdmin'
          );
        }
      }
    };
  }
}
