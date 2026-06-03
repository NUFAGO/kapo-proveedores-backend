import { IResolvers } from '@graphql-tools/utils';
import { MediosPagoEmpresaService } from '../../../aplicacion/servicios/MediosPagoEmpresaService';
import {
  MediosPagoEmpresaInput,
  MediosPagoEmpresaUpdateInput,
} from '../../../dominio/entidades/MediosPagoEmpresa';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de MediosPagoEmpresa. Nombres idénticos al contrato de inacons.
 */
export class MediosPagoEmpresaResolver {
  constructor(private readonly service: MediosPagoEmpresaService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listMediosPagoEmpresas: () =>
          ErrorHandler.handleError(
            () => this.service.listMediosPagoEmpresas(),
            'listMediosPagoEmpresas',
            {}
          ),
        listMediosPagoEmpresaByEmpresa: (_: unknown, { empresa_id }: { empresa_id: string }) =>
          ErrorHandler.handleError(
            () => this.service.listMediosPagoEmpresaByEmpresa(empresa_id),
            'listMediosPagoEmpresaByEmpresa',
            { empresa_id }
          ),
      },
      Mutation: {
        addMediosPagoEmpresa: (_: unknown, args: MediosPagoEmpresaInput) =>
          ErrorHandler.handleError(
            () => this.service.addMediosPagoEmpresa(args),
            'addMediosPagoEmpresa',
            {}
          ),
        updateMediosPagoEmpresa: (
          _: unknown,
          { id, ...rest }: { id: string } & MediosPagoEmpresaUpdateInput
        ) =>
          ErrorHandler.handleError(
            () => this.service.updateMediosPagoEmpresa(id, rest),
            'updateMediosPagoEmpresa',
            { id }
          ),
        deleteMediosPagoEmpresa: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.service.deleteMediosPagoEmpresa(id),
            'deleteMediosPagoEmpresa',
            { id }
          ),
      },
    };
  }
}
