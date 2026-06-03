import { IResolvers } from '@graphql-tools/utils';
import { ContactoProveedorService } from '../../../aplicacion/servicios/ContactoProveedorService';
import {
  ContactoProveedorInput,
  ContactoProveedorUpdateInput,
} from '../../../dominio/entidades/ContactoProveedor';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de ContactoProveedor. Nombres idénticos al contrato de inacons.
 */
export class ContactoProveedorResolver {
  constructor(private readonly service: ContactoProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listContactosProveedor: () =>
          ErrorHandler.handleError(
            () => this.service.listContactosProveedor(),
            'listContactosProveedor',
            {}
          ),
        listContactosByProveedor: (_: unknown, { proveedor_id }: { proveedor_id: string }) =>
          ErrorHandler.handleError(
            () => this.service.listContactosByProveedor(proveedor_id),
            'listContactosByProveedor',
            { proveedor_id }
          ),
      },
      Mutation: {
        addContactoProveedor: (_: unknown, args: ContactoProveedorInput) =>
          ErrorHandler.handleError(
            () => this.service.addContactoProveedor(args),
            'addContactoProveedor',
            {}
          ),
        updateContactoProveedor: (
          _: unknown,
          { id, ...rest }: { id: string } & ContactoProveedorUpdateInput
        ) =>
          ErrorHandler.handleError(
            () => this.service.updateContactoProveedor(id, rest),
            'updateContactoProveedor',
            { id }
          ),
        deleteContactoProveedor: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.service.deleteContactoProveedor(id),
            'deleteContactoProveedor',
            { id }
          ),
      },
    };
  }
}
