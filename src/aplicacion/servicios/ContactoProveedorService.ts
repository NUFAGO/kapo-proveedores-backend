import { IContactoProveedorRepository } from '../../dominio/repositorios/IContactoProveedorRepository';
import {
  ContactoProveedor,
  ContactoProveedorInput,
  ContactoProveedorUpdateInput,
} from '../../dominio/entidades/ContactoProveedor';

export class ContactoProveedorService {
  constructor(private readonly repo: IContactoProveedorRepository) {}

  listContactosProveedor(): Promise<ContactoProveedor[]> {
    return this.repo.listContactosProveedor();
  }

  listContactosByProveedor(proveedorId: string): Promise<ContactoProveedor[]> {
    return this.repo.listContactosByProveedor(proveedorId);
  }

  addContactoProveedor(input: ContactoProveedorInput): Promise<ContactoProveedor | null> {
    if (!input.proveedor_id) throw new Error('proveedor_id es obligatorio');
    if (!input.nombres?.trim()) throw new Error('Los nombres son obligatorios');
    if (!input.apellidos?.trim()) throw new Error('Los apellidos son obligatorios');
    return this.repo.addContactoProveedor(input);
  }

  updateContactoProveedor(
    id: string,
    input: ContactoProveedorUpdateInput
  ): Promise<ContactoProveedor | null> {
    return this.repo.updateContactoProveedor(id, input);
  }

  deleteContactoProveedor(id: string): Promise<ContactoProveedor | null> {
    return this.repo.deleteContactoProveedor(id);
  }
}
