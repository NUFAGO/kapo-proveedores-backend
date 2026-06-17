import { IUsuarioExternoRepository } from '../../../dominio/repositorios/IUsuarioExternoRepository';
import { UsuarioExternoResponse } from '../../../dominio/entidades/UsuarioExterno';
import { GraphQLClient } from '../../http/GraphQLClient';
import { BaseHttpRepository } from './BaseHttpRepository';
import { ConfigService } from '../../config/ConfigService';

// ============================================================================
// ADAPTADOR HTTP → kapo-autentificacion (IAM central).
// Consume las queries NATIVAS de auth (cargo{}, usuario_roles[]) y mapea a
// UsuarioExternoResponse (forma de dominio). empresa_id/obra_id NO son dominio
// de auth → se omiten. El login admin/inacons se ELIMINÓ: la identidad admin
// la maneja auth directo vía el gateway (el front no loguea contra este MS).
// ============================================================================

const USUARIO_NATIVO_FIELDS = `
  id
  nombres
  apellidos
  usuario
  dni
  telefono
  firma
  foto_perfil
  email
  cargo {
    id
    nombre
    descripcion
    gerarquia
  }
  usuario_roles {
    rol_id
    sistema_id
  }
`;

type AuthCargo = { id?: unknown; nombre?: unknown; descripcion?: unknown; gerarquia?: unknown };
type AuthUsuarioRol = { rol_id?: unknown; sistema_id?: unknown };
type AuthUsuario = {
  id?: unknown;
  nombres?: unknown;
  apellidos?: unknown;
  usuario?: unknown;
  dni?: unknown;
  telefono?: unknown;
  firma?: unknown;
  foto_perfil?: unknown;
  email?: unknown;
  cargo?: AuthCargo | null;
  usuario_roles?: AuthUsuarioRol[] | null;
};

/** auth-nativo → UsuarioExternoResponse. Tolerante a rol/cargo ausentes. */
function mapAuthUsuario(u: AuthUsuario): UsuarioExternoResponse {
  const out: UsuarioExternoResponse = {
    id: String(u.id ?? ''),
    nombres: String(u.nombres ?? ''),
    apellidos: String(u.apellidos ?? ''),
    usuario: String(u.usuario ?? ''),
    dni: String(u.dni ?? ''),
  };

  const cargo = u.cargo;
  if (cargo && cargo.id != null) {
    const c: NonNullable<UsuarioExternoResponse['cargo_id']> = {
      id: String(cargo.id),
      nombre: String(cargo.nombre ?? ''),
    };
    if (cargo.descripcion != null) c.descripcion = String(cargo.descripcion);
    if (typeof cargo.gerarquia === 'number') c.gerarquia = cargo.gerarquia;
    out.cargo_id = c;
  }

  const roles = Array.isArray(u.usuario_roles) ? u.usuario_roles : [];
  if (roles.length > 0 && roles[0]?.rol_id != null) {
    out.rol_id = String(roles[0].rol_id);
  }

  if (u.telefono != null && String(u.telefono).trim() !== '') out.telefono = String(u.telefono);
  if (u.firma != null) out.firma = String(u.firma);
  if (u.foto_perfil != null) out.foto_perfil = String(u.foto_perfil);
  if (u.email != null) out.email = String(u.email);
  return out;
}

export class HttpAuthRepository
  extends BaseHttpRepository<any>
  implements IUsuarioExternoRepository
{
  private readonly sistemaCodigo: string;

  constructor(baseUrl?: string) {
    super(baseUrl);
    this.sistemaCodigo = ConfigService.getInstance().getSistemaCodigo();
  }

  /** Cliente GraphQL → SOLO auth (sin fallback inacons: schema distinto). */
  protected override async getClient(): Promise<GraphQLClient> {
    return super.getClient('auth-service', 'auth-service');
  }

  async list(): Promise<any[]> {
    throw new Error('list() not supported for HttpAuthRepository. Use getAllUsuarios() instead.');
  }

  protected getDefaultSearchFields(): string[] {
    return [];
  }

  public override async graphqlRequest(query: string, variables: any = {}): Promise<any> {
    return super.graphqlRequest(query, variables, 'auth-service', 'auth-service');
  }

  async getAllUsuarios(): Promise<UsuarioExternoResponse[]> {
    const query = `query { listUsuario { ${USUARIO_NATIVO_FIELDS} } }`;
    const result = await this.graphqlRequest(query);
    const list = result?.listUsuario;
    return Array.isArray(list) ? list.map(mapAuthUsuario) : [];
  }

  async getUsuario(id: string): Promise<UsuarioExternoResponse | null> {
    const query = `
      query GetUsuarioById($id: ID!) {
        getUsuarioById(id: $id, referencia: { conCargo: true, conUsuarioRoles: true }) {
          ${USUARIO_NATIVO_FIELDS}
        }
      }
    `;
    const result = await this.graphqlRequest(query, { id });
    const u = result?.getUsuarioById;
    return u ? mapAuthUsuario(u) : null;
  }

  async usuariosCargo(): Promise<UsuarioExternoResponse[]> {
    const query = `query { usuariosCargo { ${USUARIO_NATIVO_FIELDS} } }`;
    const result = await this.graphqlRequest(query);
    const list = result?.usuariosCargo;
    return Array.isArray(list) ? list.map(mapAuthUsuario) : [];
  }

  async getUsuariosByRegistrosGeneralesContables(): Promise<UsuarioExternoResponse[]> {
    // auth no expone esta consulta de negocio (tolerante: lista vacía).
    return [];
  }

  async getUsuariosByRolCargo(
    jerarquia?: number,
    rolRegex?: string,
  ): Promise<UsuarioExternoResponse[]> {
    const query = `
      query GetUsuariosByRolCargo($jerarquia: Int, $rolRegex: String, $sistemaCodigo: String) {
        getUsuariosByRolCargo(jerarquia: $jerarquia, rolRegex: $rolRegex, sistemaCodigo: $sistemaCodigo) {
          ${USUARIO_NATIVO_FIELDS}
        }
      }
    `;
    const result = await this.graphqlRequest(query, {
      jerarquia: jerarquia ?? null,
      rolRegex: rolRegex ?? null,
      sistemaCodigo: this.sistemaCodigo,
    });
    const list = result?.getUsuariosByRolCargo;
    return Array.isArray(list) ? list.map(mapAuthUsuario) : [];
  }
}
