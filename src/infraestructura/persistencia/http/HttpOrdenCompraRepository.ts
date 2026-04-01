import { IOrdenCompraRepository, OrdenCompraFilter, OrdenCompraPaginatedResponse } from '../../../dominio/repositorios/IOrdenCompraRepository';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpOrdenCompraRepository extends BaseHttpRepository<any> implements IOrdenCompraRepository {
  constructor(baseUrl?: string) {
    super(baseUrl);
  }

  /**
   * Obtener o inicializar el cliente GraphQL
   */
  protected override async getClient() {
    return super.getClient('inacons-backend');
  }

  /**
   * Implementación requerida por BaseHttpRepository
   * HttpOrdenCompraRepository no usa list() para paginación, solo para compatibilidad
   */
  async list(): Promise<any[]> {
    throw new Error('list() not supported for HttpOrdenCompraRepository. Use listOrdenComprasPaginated() instead.');
  }

  /**
   * Campos por defecto para búsqueda (no usado en HttpOrdenCompraRepository)
   */
  protected getDefaultSearchFields(): string[] {
    return [];
  }

  /**
   * Consumir el endpoint ListOrdenComprasPaginated del inacons-backend
   */
  async listOrdenComprasPaginated(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse> {
    const query = `
      query ListOrdenComprasPaginated($filter: OrdenCompraPaginationInput) {
        listOrdenComprasPaginated(filter: $filter) {
          data {
            id
            codigo_orden
            cotizacion_id {
              id
              codigo_cotizacion
              aprobacion
              estado
              fecha
              usuario_id {
                id
                nombres
                apellidos
                dni
              }
            }
            estado
            descripcion
            fecha_ini
            fecha_fin
            tipo
            total
            requerimiento {
              obra_id
              req_usuario_id
              codigo_rq
              empresa_id
            }
            obra_id
            req_usuario_id
            codigo_rq
            proveedor_id
            divisa_id
            estado_almacen
            estado_comprobante
            cantidad_cierre
            tiene_expediente
            proveedor {
              id
              nombre_comercial
              ruc
              razon_social
              telefono
              correo
              direccion
              rubro
              estado
              tipo
              actividad
              estado_sunat
              condicion
              agente_retencion
              sub_contrata
              distrito
              provincia
              departamento
            }
            pagos {
              monto_solicitado
              estado
            }
            obra {
              id
              titulo
              nombre
              descripcion
              direccion
              estado
            }
            comprobantes {
              _id
              serie
              numeracion
              monto
              estado
              comentario_aprobacion
              archivo_url
            }
          }
          total
          page
          limit
          totalPages
        }
      }
    `;

    const result = await this.graphqlRequest(query, { filter });
    return result.listOrdenComprasPaginated;
  }

  /**
   * Obtener una orden de compra por su ID
   */
  async findById(id: string): Promise<any> {
    const query = `
      query GetOrdenCompraById($id: ID!) {
        getOrdenCompraById(id: $id) {
          id
          codigo_orden
          cotizacion_id {
            id
            codigo_cotizacion
            aprobacion
            estado
            fecha
            usuario_id {
              id
              nombres
              apellidos
              dni
            }
          }
          estado
          descripcion
          fecha_ini
          fecha_fin
          tipo
          total
          requerimiento {
            obra_id
            req_usuario_id
            codigo_rq
            empresa_id
          }
          obra_id
          req_usuario_id
          codigo_rq
          proveedor_id
          divisa_id
          estado_almacen
          estado_comprobante
          cantidad_cierre
          tiene_expediente
          proveedor {
            id
            nombre_comercial
            ruc
            razon_social
            telefono
            correo
            direccion
            rubro
            estado
            tipo
            actividad
            estado_sunat
            condicion
            agente_retencion
            sub_contrata
            distrito
            provincia
            departamento
          }
          pagos {
            monto_solicitado
            estado
          }
          obra {
            id
            titulo
            nombre
            descripcion
            direccion
            estado
          }
          comprobantes {
            _id
            serie
            numeracion
            monto
            estado
            comentario_aprobacion
            archivo_url
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getOrdenCompraById;
  }
}
