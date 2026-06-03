import {
  MediosPagoProveedor,
  MediosPagoProveedorInput,
  MediosPagoProveedorUpdateInput,
  MediosPagoNoValidadoFilter,
  MediosPagoProveedorPaginatedResponse,
} from '../entidades/MediosPagoProveedor';

/**
 * Puerto del repositorio de MediosPagoProveedor.
 * Métodos nombrados igual que el contrato de inacons.
 */
export interface IMediosPagoProveedorRepository {
  listMediosPagoProveedores(): Promise<MediosPagoProveedor[]>;
  listMediosPagoProveedorByProveedor(proveedorId: string): Promise<MediosPagoProveedor[]>;
  listMediosPagoProveedorNoValidado(filter?: MediosPagoNoValidadoFilter): Promise<MediosPagoProveedorPaginatedResponse>;
  addMediosPagoProveedor(input: MediosPagoProveedorInput): Promise<MediosPagoProveedor | null>;
  addMediosPagoProveedorConSustentos(input: MediosPagoProveedorInput, urls: string[]): Promise<MediosPagoProveedor | null>;
  updateMediosPagoProveedor(id: string, input: MediosPagoProveedorUpdateInput): Promise<MediosPagoProveedor | null>;
  deleteMediosPagoProveedor(id: string): Promise<MediosPagoProveedor | null>;
}
