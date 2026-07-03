import { IOrdenCompraRepository, OrdenCompraFilter, OrdenCompraPaginatedResponse } from '../../../dominio/repositorios/IOrdenCompraRepository';
import { COMPRAS_OC_LIST_FIELDS, COMPRAS_OC_REVISION_FIELDS } from '../../../dominio/servicios/OrdenCompraComprasMapper';
import { BaseHttpRepository } from './BaseHttpRepository';

export class HttpOrdenCompraRepository extends BaseHttpRepository<any> implements IOrdenCompraRepository {
  private readonly comprasServiceToken: string;

  constructor(baseUrl?: string) {
    const resolved =
      baseUrl?.trim()
      || String(process.env['KAPO_COMPRAS_BACKEND_URL'] ?? '').trim()
      || 'http://localhost:8083/graphql';
    super(resolved);
    this.comprasServiceToken = String(process.env['COMPRAS_SERVICE_TOKEN'] ?? '').trim();
  }

  protected override async getClient() {
    return super.getClient('kapo-compras-backend', 'inacons-backend');
  }

  async list(): Promise<any[]> {
    throw new Error('list() not supported for HttpOrdenCompraRepository. Use listOrdenComprasPaginated() instead.');
  }

  protected getDefaultSearchFields(): string[] {
    return [];
  }

  async listOrdenComprasPaginated(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse> {
    const query = `
      query ListOrdenComprasPaginated($filter: OrdenCompraPaginationInput) {
        listOrdenComprasPaginated(filter: $filter) {
          data {
            ${COMPRAS_OC_LIST_FIELDS}
          }
          total
          page
          limit
          totalPages
        }
      }
    `;

    const result = await this.graphqlRequest(query, { filter }, 'kapo-compras-backend', 'kapo-compras-backend');
    return result.listOrdenComprasPaginated;
  }

  /**
   * Variante LEAN: mismos filtros, pero pide a Compras SOLO campos de su dominio
   * (sin `requerimiento{}`/`cotizacion_id{}` que Compras hidrata vía otros MS).
   * El proveedor se resuelve luego en el servicio con nuestra propia data.
   */
  async listOrdenComprasRevision(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse> {
    const query = `
      query ListOrdenComprasPaginated($filter: OrdenCompraPaginationInput) {
        listOrdenComprasPaginated(filter: $filter) {
          data {
            ${COMPRAS_OC_REVISION_FIELDS}
          }
          total
          page
          limit
          totalPages
        }
      }
    `;

    const result = await this.graphqlRequest(query, { filter }, 'kapo-compras-backend', 'kapo-compras-backend');
    return result.listOrdenComprasPaginated;
  }

  async findById(id: string): Promise<any> {
    const query = `
      query GetOrdenCompraById($id: ID!) {
        getOrdenCompraById(id: $id) {
          ${COMPRAS_OC_LIST_FIELDS}
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id }, 'kapo-compras-backend', 'kapo-compras-backend');
    return result.getOrdenCompraById;
  }

  /** Proveedores → Compras: actualiza flag tiene_expediente (M2M). */
  async actualizarTieneExpediente(ordenCompraId: string, tieneExpediente: boolean): Promise<void> {
    const mutation = `
      mutation ActualizarTieneExpediente($ordenCompraId: ID!, $tieneExpediente: Boolean!) {
        actualizarTieneExpediente(ordenCompraId: $ordenCompraId, tieneExpediente: $tieneExpediente) {
          id
          tiene_expediente
        }
      }
    `;
    const result = await this.graphqlRequestWithServiceToken(
      mutation,
      { ordenCompraId, tieneExpediente },
      this.comprasServiceToken,
      'kapo-compras-backend',
      'kapo-compras-backend',
    );
    if (!result?.actualizarTieneExpediente?.id) {
      throw new Error('Compras no confirmó actualización de tiene_expediente');
    }
  }
}
