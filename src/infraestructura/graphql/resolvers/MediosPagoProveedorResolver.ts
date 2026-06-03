import { IResolvers } from '@graphql-tools/utils';
import { MediosPagoProveedorService } from '../../../aplicacion/servicios/MediosPagoProveedorService';
import {
  MediosPagoProveedorInput,
  MediosPagoProveedorUpdateInput,
} from '../../../dominio/entidades/MediosPagoProveedor';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de MediosPagoProveedor. Nombres idénticos al contrato de inacons.
 */
export class MediosPagoProveedorResolver {
  constructor(private readonly service: MediosPagoProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listMediosPagoProveedores: () =>
          ErrorHandler.handleError(
            () => this.service.listMediosPagoProveedores(),
            'listMediosPagoProveedores',
            {}
          ),
        listMediosPagoProveedorByProveedor: (_: unknown, { proveedor_id }: { proveedor_id: string }) =>
          ErrorHandler.handleError(
            () => this.service.listMediosPagoProveedorByProveedor(proveedor_id),
            'listMediosPagoProveedorByProveedor',
            { proveedor_id }
          ),
        listMediosPagoProveedorNoValidado: (_: unknown, args: { page?: number; limit?: number; search?: string }) =>
          ErrorHandler.handleError(
            () => this.service.listMediosPagoProveedorNoValidado(args),
            'listMediosPagoProveedorNoValidado',
            {}
          ),
      },
      Mutation: {
        addMediosPagoProveedor: (_: unknown, args: MediosPagoProveedorInput) =>
          ErrorHandler.handleError(
            () => this.service.addMediosPagoProveedor(args),
            'addMediosPagoProveedor',
            {}
          ),
        crearMedioPagoConSustentos: (_: unknown, { urls, ...input }: MediosPagoProveedorInput & { urls: string[] }) =>
          ErrorHandler.handleError(
            () => this.service.crearConSustentos(input, urls),
            'crearMedioPagoConSustentos',
            {}
          ),
        updateMediosPagoProveedor: (
          _: unknown,
          { id, ...rest }: { id: string } & MediosPagoProveedorUpdateInput
        ) =>
          ErrorHandler.handleError(
            () => this.service.updateMediosPagoProveedor(id, rest),
            'updateMediosPagoProveedor',
            { id }
          ),
        deleteMediosPagoProveedor: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.service.deleteMediosPagoProveedor(id),
            'deleteMediosPagoProveedor',
            { id }
          ),
      },
    };
  }
}
