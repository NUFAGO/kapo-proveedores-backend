// ============================================================================
// SISTEMA DINÁMICO DE GUARDIAS - CONFIGURACIÓN POR ARCHIVO
// ============================================================================

// Tipos de guardias disponibles
type GuardType = 'public' | 'optional' | 'auth' | 'admin' | 'proveedor';

interface GuardConfig {
  guard: GuardType;
  requireProveedorAccess?: boolean;
  proveedorIdField?: string;
}

// Configuración centralizada de guards por endpoint
export const ENDPOINT_GUARDS: Record<string, GuardConfig> = {
  // Queries PÚBLICAS
  'Query.proveedores': { guard: 'public' },
  'Query.productosPublicos': { guard: 'public' },
  'Query.categorias': { guard: 'public' },
  
  // Queries OPCIONALES (si trae token, lo usa)
  'Query.miPerfil': { guard: 'optional' },
  'Query.misFavoritos': { guard: 'optional' },
  
  // Queries REQUIEREN AUTENTICACIÓN
  'Query.misCompras': { guard: 'auth' },
  'Query.misOrdenes': { guard: 'auth' },
  'Query.miCarrito': { guard: 'auth' },
  
  // Queries SOLO ADMIN
  'Query.todosLosUsuarios': { guard: 'admin' },
  'Query.estadisticasGenerales': { guard: 'admin' },
  'Query.logsSistema': { guard: 'admin' },
  
  // Queries CON ACCESO POR PROVEEDOR
  'Query.ordenesPorProveedor': { guard: 'auth', requireProveedorAccess: true, proveedorIdField: 'proveedor_id' },
  'Query.productosPorProveedor': { guard: 'auth', requireProveedorAccess: true, proveedorIdField: 'proveedor_id' },
  
  // Mutations PÚBLICAS
  'Mutation.registrarUsuario': { guard: 'public' },
  'Mutation.login': { guard: 'public' },
  'Mutation.recuperarPassword': { guard: 'public' },
  
  // Mutations REQUIEREN AUTENTICACIÓN
  'Mutation.crearOrden': { guard: 'auth' },
  'Mutation.actualizarPerfil': { guard: 'auth' },
  'Mutation.agregarAlCarrito': { guard: 'auth' },
  
  // Mutations SOLO ADMIN
  'Mutation.crearUsuario': { guard: 'admin' },
  'Mutation.eliminarUsuario': { guard: 'admin' },
  'Mutation.aprobarOrden': { guard: 'admin' },
  
  // Mutations CON ACCESO POR PROVEEDOR
  'Mutation.actualizarEstadoOrden': { guard: 'auth', requireProveedorAccess: true, proveedorIdField: 'proveedor_id' },
  'Mutation.actualizarProducto': { guard: 'auth', requireProveedorAccess: true, proveedorIdField: 'proveedor_id' },
};

// Sistema dinámico de aplicación de guardias
export class DynamicGuardSystem {
  private static getGuardFunction(type: GuardType, config: GuardConfig) {
    const { adminGuard, authGuard, optionalAuthGuard, proveedorGuard, proveedorAccessGuard } = require('./GraphQLGuards');
    
    switch (type) {
      case 'public':
        return (resolver: any) => resolver; // Sin guardia
      case 'optional':
        return optionalAuthGuard;
      case 'auth':
        if (config.requireProveedorAccess) {
          return proveedorAccessGuard(undefined, config.proveedorIdField);
        }
        return authGuard;
      case 'admin':
        return adminGuard;
      case 'proveedor':
        return proveedorGuard;
      default:
        return (resolver: any) => resolver;
    }
  }
  
  static applyGuardToResolver(resolver: any, endpointPath: string): any {
    const config = ENDPOINT_GUARDS[endpointPath];
    
    if (!config) {
      // Por defecto, requiere autenticación
      const { authGuard } = require('./GraphQLGuards');
      return authGuard(resolver);
    }
    
    const guardFunction = this.getGuardFunction(config.guard, config);
    return guardFunction(resolver);
  }
  
  // Procesa todos los resolvers de un array y aplica las guardias dinámicamente
  static processResolvers(resolvers: any[]): any[] {
    return resolvers.map(resolver => {
      if (typeof resolver === 'object' && resolver !== null) {
        return this.processResolverObject(resolver);
      }
      return resolver;
    });
  }

  // Procesa un objeto de resolvers (Query, Mutation, etc.)
  private static processResolverObject(resolverObj: any): any {
    const processRecursive = (obj: any, path: string = '') => {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'function') {
          // Es un resolver, aplicar guardia correspondiente
          result[key] = this.applyGuardToResolver(value, currentPath);
        } else if (typeof value === 'object' && value !== null) {
          // Es un objeto anidado (Query, Mutation), procesar recursivamente
          result[key] = processRecursive(value, currentPath);
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    
    return processRecursive(resolverObj);
  }
}
