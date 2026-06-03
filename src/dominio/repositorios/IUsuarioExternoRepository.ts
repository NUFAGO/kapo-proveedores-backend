import { UsuarioExternoResponse } from '../entidades/UsuarioExterno';

/**
 * Usuarios del monolito inacons (proxy HTTP). Solo lectura.
 */
export interface IUsuarioExternoRepository {
  getUsuario(id: string): Promise<UsuarioExternoResponse | null>;
  getUsuariosByRolCargo(jerarquia?: number, rolRegex?: string): Promise<UsuarioExternoResponse[]>;
}
