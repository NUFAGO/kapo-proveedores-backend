import { IAuthRepository } from '../../../dominio/repositorios/IAuthRepository';
import { LoginRequest, LoginResponse } from '../../../dominio/entidades/Auth';
import { UsuarioExternoResponse } from '../../../dominio/entidades/UsuarioExterno';
import { GraphQLClient } from '../../http/GraphQLClient';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpAuthRepository extends BaseHttpRepository<any> implements IAuthRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   */
  protected override async getClient(): Promise<GraphQLClient> {
    return super.getClient('inacons-backend');
  }

  /**
   * Implementación requerida por BaseHttpRepository
   * HttpAuthRepository no usa list() para paginación, solo para compatibilidad
   */
  async list(): Promise<any[]> {
    throw new Error('list() not supported for HttpAuthRepository. Use getAllUsuarios() instead.');
  }

  /**
   * Campos por defecto para búsqueda (no usado en HttpAuthRepository)
   */
  protected getDefaultSearchFields(): string[] {
    return [];
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const mutation = `
      mutation Login($usuario: String!, $contrasenna: String!) {
        login(usuario: $usuario, contrasenna: $contrasenna) {
          id
          token
          usuario
          nombresA
          role {
            id
            nombre
          }
        }
      }
    `;

    const client = await this.getClient();
    const result = await client.request<{ login: LoginResponse }>({
      mutation,
      variables: {
        usuario: credentials.usuario,
        contrasenna: credentials.contrasenna,
      },
    });

    return result.login;
  }

  // Método auxiliar para hacer peticiones GraphQL
  // Usa el método protegido de BaseHttpRepository
  public override async graphqlRequest(query: string, variables: any = {}): Promise<any> {
    return super.graphqlRequest(query, variables, 'auth-service', 'inacons-backend');
  }

  // Funciones de Usuario Externo (consumido de otro microservicio)
  async getAllUsuarios(): Promise<UsuarioExternoResponse[]> {
    const query = `
      query {
        getAllUsuarios {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.getAllUsuarios;
  }

  async getUsuario(id: string): Promise<UsuarioExternoResponse | null> {
    const query = `
      query GetUsuario($id: ID!) {
        getUsuario(id: $id) {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getUsuario;
  }

  async usuariosCargo(): Promise<UsuarioExternoResponse[]> {
    const query = `
      query {
        usuariosCargo {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.usuariosCargo;
  }

  async getUsuariosByRegistrosGeneralesContables(): Promise<UsuarioExternoResponse[]> {
    const query = `
      query {
        getUsuariosByRegistrosGeneralesContables {
          id
          nombres
          apellidos
          usuario
          dni
          cargo_id {
            id
            nombre
            descripcion
            gerarquia
          }
          rol_id
          empresa_id {
            id
            nombre_comercial
            razon_social
            ruc
          }
          obra_id {
            id
            titulo
            nombre
            descripcion
            ubicacion
          }
          telefono
          firma
          foto_perfil
          email
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.getUsuariosByRegistrosGeneralesContables;
  }

  // Métodos de CRUD que no se usan para usuarios externos (solo lectura)
  async createUsuario(): Promise<any> {
    throw new Error('createUsuario() no soportado para usuarios externos. Los usuarios se gestionan en el microservicio original.');
  }

  async updateUsuario(): Promise<any> {
    throw new Error('updateUsuario() no soportado para usuarios externos. Los usuarios se gestionan en el microservicio original.');
  }

  async deleteUsuario(): Promise<any> {
    throw new Error('deleteUsuario() no soportado para usuarios externos. Los usuarios se gestionan en el microservicio original.');
  }
}

