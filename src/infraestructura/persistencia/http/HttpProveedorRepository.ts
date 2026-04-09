import { IProveedorRepository } from '../../../dominio/repositorios/IProveedorRepository';
import { BaseHttpRepository } from './BaseHttpRepository';

/**
 * Repositorio HTTP para consumir la API de Proveedores del inacons-backend
 * Sigue el mismo patrón que HttpOrdenCompraRepository
 */
export class HttpProveedorRepository extends BaseHttpRepository<any> implements IProveedorRepository {
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
   * HttpProveedorRepository no usa list() genérico, solo métodos específicos
   */
  async list(): Promise<any[]> {
    return this.listProveedor();
  }

  /**
   * Campos por defecto para búsqueda (no usado en HttpProveedorRepository)
   */
  protected getDefaultSearchFields(): string[] {
    return ['razon_social', 'nombre_comercial', 'ruc'];
  }

  /**
   * Listar todos los proveedores con relaciones completas (usando paginación)
   */
  async listProveedor(): Promise<any[]> {
    const query = `
      query ListProveedoresPaginated($filter: ProveedorPaginationInput) {
        listProveedoresPaginated(filter: $filter) {
          data {
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
          total
          page
          limit
          totalPages
        }
      }
    `;

    const result = await this.graphqlRequest(query, { 
      filter: { 
        page: 1, 
        limit: 1000 // Obtener muchos resultados para simular list() completo
      } 
    });
    return result.listProveedoresPaginated.data;
  }

  /**
   * Listar proveedores paginados con filtros
   */
  async listProveedoresPaginated(filter?: Record<string, any>): Promise<any> {
    const query = `
      query ListProveedoresPaginated($filter: ProveedorPaginationInput) {
        listProveedoresPaginated(filter: $filter) {
          data {
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
          total
          page
          limit
          totalPages
        }
      }
    `;

    try {
      const result = await this.graphqlRequest(query, { filter });
      return result.listProveedoresPaginated;
    } catch (error) {
      console.error('❌ HttpProveedorRepository.listProveedoresPaginated - ERROR:', error);
      throw error;
    }
  }

  /**
   * Obtener proveedor por ID con relaciones completas
   */
  async getProveedorById(id: string): Promise<any> {
    const query = `
      query GetProveedorById($id: ID!) {
        getProveedorById(id: $id) {
          id
          razon_social
          direccion
          nombre_comercial
          ruc
          rubro
          estado
          tipo
          actividad
          correo
          telefono
          estado_sunat
          condicion
          agente_retencion
          sub_contrata
          distrito
          provincia
          departamento
          mediosPago {
            id
            entidad {
              id
              nombre
              abreviatura
            }
            nro_cuenta
            detalles
            titular
            validado
            mostrar
          }
          contactos {
            id
            nombres
            apellidos
            cargo
            telefono
          }
          estadisticasCotizaciones {
            proveedor_id
            razon_social
            totalCotizaciones
            cotizacionesPorEstado {
              estado
              cantidad
              porcentaje
            }
            primeraCotizacion
            ultimaCotizacion
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { id });
    return result.getProveedorById;
  }

  /**
   * Buscar proveedor por RUC
   */
  async getProveedorByRuc(ruc: string): Promise<any> {
    const query = `
      query GetProveedorByRuc($ruc: String!) {
        getProveedorByRuc(ruc: $ruc) {
          id
          razon_social
          direccion
          nombre_comercial
          ruc
          rubro
          estado
          tipo
          actividad
          correo
          telefono
          estado_sunat
          condicion
          agente_retencion
          sub_contrata
          distrito
          provincia
          departamento
          mediosPago {
            id
            entidad {
              id
              nombre
              abreviatura
            }
            nro_cuenta
            detalles
            titular
            validado
            mostrar
          }
          contactos {
            id
            nombres
            apellidos
            cargo
            telefono
          }
          estadisticasCotizaciones {
            proveedor_id
            razon_social
            totalCotizaciones
            cotizacionesPorEstado {
              estado
              cantidad
              porcentaje
            }
            primeraCotizacion
            ultimaCotizacion
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, { ruc });
    return result.getProveedorByRuc;
  }

  /**
   * Listar proveedores con subcontratación habilitada
   */
  async listProveedoresSubContrata(): Promise<any[]> {
    const query = `
      query {
        listProveedoresSubContrata {
          id
          razon_social
          direccion
          nombre_comercial
          ruc
          rubro
          estado
          tipo
          actividad
          correo
          telefono
          estado_sunat
          condicion
          agente_retencion
          sub_contrata
          distrito
          provincia
          departamento
        }
      }
    `;

    const result = await this.graphqlRequest(query);
    return result.listProveedoresSubContrata;
  }

  /**
   * Obtener estadísticas de cotizaciones por proveedor
   */
  async getEstadisticasCotizaciones(proveedorId: string): Promise<any> {
    const query = `
      query GetEstadisticasCotizaciones($proveedorId: ID!) {
        getEstadisticasCotizaciones(proveedorId: $proveedorId) {
          proveedor_id
          razon_social
          totalCotizaciones
          cotizacionesPorEstado {
            estado
            cantidad
            porcentaje
          }
          primeraCotizacion
          ultimaCotizacion
        }
      }
    `;

    const result = await this.graphqlRequest(query, { proveedorId });
    return result.getEstadisticasCotizaciones;
  }

  /**
   * Crear nuevo proveedor
   */
  async addProveedor(input: any): Promise<any> {
    const mutation = `
      mutation AddProveedor($input: ProveedorInput!) {
        addProveedor(
          razon_social: $input.razon_social
          ruc: $input.ruc
          direccion: $input.direccion
          nombre_comercial: $input.nombre_comercial
          rubro: $input.rubro
          estado: $input.estado
          tipo: $input.tipo
          actividad: $input.actividad
          correo: $input.correo
          telefono: $input.telefono
          estado_sunat: $input.estado_sunat
          condicion: $input.condicion
          agente_retencion: $input.agente_retencion
          sub_contrata: $input.sub_contrata
          distrito: $input.distrito
          provincia: $input.provincia
          departamento: $input.departamento
        ) {
          id
          razon_social
          direccion
          nombre_comercial
          ruc
          rubro
          estado
          tipo
          actividad
          correo
          telefono
          estado_sunat
          condicion
          agente_retencion
          sub_contrata
          distrito
          provincia
          departamento
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { input });
    return result.addProveedor;
  }

  /**
   * Actualizar proveedor existente
   */
  async updateProveedor(id: string, input: any): Promise<any> {
    const mutation = `
      mutation UpdateProveedor($id: ID!, $input: ProveedorInput!) {
        updateProveedor(
          id: $id
          razon_social: $input.razon_social
          ruc: $input.ruc
          direccion: $input.direccion
          nombre_comercial: $input.nombre_comercial
          rubro: $input.rubro
          estado: $input.estado
          tipo: $input.tipo
          actividad: $input.actividad
          correo: $input.correo
          telefono: $input.telefono
          estado_sunat: $input.estado_sunat
          condicion: $input.condicion
          agente_retencion: $input.agente_retencion
          sub_contrata: $input.sub_contrata
          distrito: $input.distrito
          provincia: $input.provincia
          departamento: $input.departamento
        ) {
          id
          razon_social
          direccion
          nombre_comercial
          ruc
          rubro
          estado
          tipo
          actividad
          correo
          telefono
          estado_sunat
          condicion
          agente_retencion
          sub_contrata
          distrito
          provincia
          departamento
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id, input });
    return result.updateProveedor;
  }

  /**
   * Eliminar proveedor
   */
  async deleteProveedor(id: string): Promise<any> {
    const mutation = `
      mutation DeleteProveedor($id: ID!) {
        deleteProveedor(id: $id) {
          id
          razon_social
          ruc
        }
      }
    `;

    const result = await this.graphqlRequest(mutation, { id });
    return result.deleteProveedor;
  }

  /**
   * Implementación requerida por IBaseRepository
   */
  async findById(id: string): Promise<any> {
    return this.getProveedorById(id);
  }

  /**
   * Implementación requerida por IBaseRepository
   */
  async create(data: any): Promise<any> {
    return this.addProveedor(data);
  }

  /**
   * Implementación requerida por IBaseRepository
   */
  async update(id: string, data: any): Promise<any> {
    return this.updateProveedor(id, data);
  }

  /**
   * Implementación requerida por IBaseRepository
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.deleteProveedor(id);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Implementación requerida por IBaseRepository - paginación
   */
  override async listPaginated(pagination: any): Promise<any> {
    // Para proveedores usamos list() completo y luego paginamos localmente
    // o implementamos un método específico si la API lo soporta
    const allProveedores = await this.listProveedor();
    const { page = 1, limit = 10 } = pagination;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      data: allProveedores.slice(start, end),
      total: allProveedores.length,
      page,
      limit,
      totalPages: Math.ceil(allProveedores.length / limit)
    };
  }

  /**
   * Implementación requerida por IBaseRepository - filtros
   */
  override async listWithFilters(_filters: any, pagination?: any): Promise<any> {
    // Implementar filtros si la API lo soporta
    return this.listPaginated(pagination);
  }

  /**
   * Implementación requerida por IBaseRepository - búsqueda
   */
  override async search(_search: any, pagination?: any): Promise<any> {
    // Implementar búsqueda si la API lo soporta
    return this.listPaginated(pagination);
  }

  /**
   * Implementación requerida por IBaseRepository - conteo
   */
  override async count(_filters?: any): Promise<number> {
    const allProveedores = await this.listProveedor();
    return allProveedores.length;
  }
}
