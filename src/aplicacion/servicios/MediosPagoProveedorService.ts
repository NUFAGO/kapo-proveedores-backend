import { IMediosPagoProveedorRepository } from '../../dominio/repositorios/IMediosPagoProveedorRepository';
import {
  MediosPagoProveedor,
  MediosPagoProveedorInput,
  MediosPagoProveedorUpdateInput,
  MediosPagoNoValidadoFilter,
  MediosPagoProveedorPaginatedResponse,
} from '../../dominio/entidades/MediosPagoProveedor';

export class MediosPagoProveedorService {
  constructor(private readonly repo: IMediosPagoProveedorRepository) {}

  listMediosPagoProveedores(): Promise<MediosPagoProveedor[]> {
    return this.repo.listMediosPagoProveedores();
  }

  listMediosPagoProveedorByProveedor(proveedorId: string): Promise<MediosPagoProveedor[]> {
    return this.repo.listMediosPagoProveedorByProveedor(proveedorId);
  }

  listMediosPagoProveedorNoValidado(
    filter?: MediosPagoNoValidadoFilter
  ): Promise<MediosPagoProveedorPaginatedResponse> {
    return this.repo.listMediosPagoProveedorNoValidado(filter);
  }

  listMediosPagoProveedorLitleBox() {
    return this.repo.listMediosPagoProveedorLitleBox();
  }

  addMediosPagoProveedor(input: MediosPagoProveedorInput): Promise<MediosPagoProveedor | null> {
    if (!input.proveedor_id) throw new Error('proveedor_id es obligatorio');
    return this.repo.addMediosPagoProveedor(input);
  }

  /** Crea el medio + sus sustentos de forma atómica (requiere ≥1 URL ya subida). */
  crearConSustentos(input: MediosPagoProveedorInput, urls: string[]): Promise<MediosPagoProveedor | null> {
    if (!input.proveedor_id) throw new Error('proveedor_id es obligatorio');
    if (!urls || urls.length === 0) throw new Error('Debe adjuntar al menos un archivo de sustento');
    return this.repo.addMediosPagoProveedorConSustentos(input, urls);
  }

  updateMediosPagoProveedor(
    id: string,
    input: MediosPagoProveedorUpdateInput
  ): Promise<MediosPagoProveedor | null> {
    return this.repo.updateMediosPagoProveedor(id, input);
  }

  deleteMediosPagoProveedor(id: string): Promise<MediosPagoProveedor | null> {
    return this.repo.deleteMediosPagoProveedor(id);
  }
}
