import {
  ContactoProveedor,
  ContactoProveedorInput,
  ContactoProveedorUpdateInput,
} from '../entidades/ContactoProveedor';

/**
 * Puerto del repositorio de ContactoProveedor.
 * Métodos nombrados igual que el contrato de inacons.
 */
export interface IContactoProveedorRepository {
  listContactosProveedor(): Promise<ContactoProveedor[]>;
  listContactosByProveedor(proveedorId: string): Promise<ContactoProveedor[]>;
  addContactoProveedor(input: ContactoProveedorInput): Promise<ContactoProveedor | null>;
  updateContactoProveedor(id: string, input: ContactoProveedorUpdateInput): Promise<ContactoProveedor | null>;
  deleteContactoProveedor(id: string): Promise<ContactoProveedor | null>;
}
