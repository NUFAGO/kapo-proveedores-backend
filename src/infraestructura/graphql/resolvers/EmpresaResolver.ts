import { IResolvers } from '@graphql-tools/utils';
import { EmpresaService } from '../../../aplicacion/servicios/EmpresaService';
import { EmpresaInput, EmpresaUpdateInput } from '../../../dominio/entidades/Empresa';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de Empresa. Nombres idénticos al contrato de inacons.
 */
export class EmpresaResolver {
  constructor(private readonly service: EmpresaService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listEmpresas: () =>
          ErrorHandler.handleError(() => this.service.listEmpresas(), 'listEmpresas', {}),
        getEmpresa: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(() => this.service.getEmpresa(id), 'getEmpresa', { id }),
      },
      Mutation: {
        addEmpresa: (_: unknown, args: EmpresaInput) =>
          ErrorHandler.handleError(() => this.service.addEmpresa(args), 'addEmpresa', {}),
        updateEmpresa: (_: unknown, { id, ...rest }: { id: string } & EmpresaUpdateInput) =>
          ErrorHandler.handleError(() => this.service.updateEmpresa(id, rest), 'updateEmpresa', { id }),
        deleteEmpresa: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(() => this.service.deleteEmpresa(id), 'deleteEmpresa', { id }),
      },
    };
  }
}
