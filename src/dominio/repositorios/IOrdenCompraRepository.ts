// ============================================================================
// INTERFAZ DEL REPOSITORIO DE ÓRDENES DE COMPRA (PUERTO DE SALIDA)
// ============================================================================

export interface OrdenCompraFilter {
  page?: number;
  limit?: number;
  fechaInicio?: string;
  fechaFin?: string;
  usuarioRQ?: string[];
  usuarioOC?: string[];
  estados?: string[];
  empresas?: string[];
  obras?: string[];
  tipos?: string[];
  estado_almacen?: string[];
  estado_comprobante?: string[];
  searchTerm?: string;
  busquedaOrdenProveedor?: string;
  descripcion?: string;
  codigoCOT?: string;
  proveedores?: string[];
  proveedorBusqueda?: string;
  codigoRQ?: string;
  total?: number;
  estadoPago?: string;
  comprobante?: string;
  tieneExpediente?: boolean;
}

export interface OrdenCompraPaginatedResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IOrdenCompraRepository {
  listOrdenComprasPaginated(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse>;
  findById(id: string): Promise<any>;
}
