import { IResolvers } from '@graphql-tools/utils';
import {
  DashboardService,
  MetricasAdminFilter,
  MetricasProveedorFilter,
} from '../../../aplicacion/servicios/DashboardService';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver para metricas de dashboards (admin interno + portal proveedor).
 * Cada query devuelve TODA la informacion del dashboard en una sola llamada.
 */
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        obtenerMetricasAdmin: async (
          _: unknown,
          { filter }: { filter?: MetricasAdminFilter }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.dashboardService.obtenerMetricasAdmin(filter);
            },
            'obtenerMetricasAdmin',
            { filter }
          );
        },

        obtenerMetricasProveedor: async (
          _: unknown,
          {
            proveedorId,
            filter,
          }: { proveedorId: string; filter?: MetricasProveedorFilter }
        ) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.dashboardService.obtenerMetricasProveedor(
                proveedorId,
                filter
              );
            },
            'obtenerMetricasProveedor',
            { proveedorId, filter }
          );
        },
      },
    };
  }
}
