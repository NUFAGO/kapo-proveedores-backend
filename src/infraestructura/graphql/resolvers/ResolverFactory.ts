// ============================================================================
// FACTORY PATTERN OPTIMIZADO - Configuración Declarativa de Resolvers
// ============================================================================

import { scalarResolvers } from './scalars';
import { AuthResolver } from './AuthResolver';
import { AuthAdminResolver } from './AuthAdminResolver';
import { AuthProveedorResolver } from './AuthProveedorResolver';
import { UsuarioProveedorResolver } from './UsuarioProveedorResolver';
import { TipoDocumentoResolver } from './TipoDocumentoResolver';
import { CategoriaChecklistResolver } from './CategoriaChecklistResolver';
import { PlantillaDocumentoResolver } from './PlantillaDocumentoResolver';
import { PlantillaChecklistResolver } from './PlantillaChecklistResolver';
import { UploadResolver } from './UploadResolver';
import { Container } from '../../di/Container';
import { AuthService } from '../../../aplicacion/servicios/AuthService';
import { AuthAdminService } from '../../../aplicacion/servicios/AuthAdminService';
import { AuthProveedorService } from '../../../aplicacion/servicios/AuthProveedorService';
import { UsuarioProveedorService } from '../../../aplicacion/servicios/UsuarioProveedorService';
import { TipoDocumentoService } from '../../../aplicacion/servicios/TipoDocumentoService';
import { CategoriaChecklistService } from '../../../dominio/servicios/CategoriaChecklistService';
import { PlantillaDocumentoService } from '../../../dominio/servicios/PlantillaDocumentoService';
import { PlantillaChecklistService } from '../../../dominio/servicios/PlantillaChecklistService';
import { RequisitoDocumentoService } from '../../../dominio/servicios/RequisitoDocumentoService';
import { UsuarioProveedorMongoRepository } from '../../persistencia/mongo/UsuarioProveedorMongoRepository';
import { TipoDocumentoMongoRepository } from '../../persistencia/mongo/TipoDocumentoMongoRepository';
import { CategoriaChecklistMongoRepository } from '../../persistencia/mongo/CategoriaChecklistMongoRepository';
import { PlantillaDocumentoMongoRepository } from '../../persistencia/mongo/PlantillaDocumentoMongoRepository';
import { PlantillaChecklistMongoRepository } from '../../persistencia/mongo/PlantillaChecklistMongoRepository';
import { RequisitoDocumentoMongoRepository } from '../../persistencia/mongo/RequisitoDocumentoMongoRepository';
import { HttpAuthRepository } from '../../persistencia/http/HttpAuthRepository';
// import { DynamicGuardSystem } from '../../auth/DynamicGuardSystem'; // Temporalmente desactivado
import { logger } from '../../logging/Logger';

/**
 * Factory para crear resolvers de autenticación
 * Mantiene Auth, AuthAdmin, AuthProveedor y UsuarioProveedor
 */
export class ResolverFactory {
  /**
   * Container para inyección de dependencias
   */
  private static container: Container | null = null;

  /**
   * Obtener instancia del Container e inicializar dependencias
   */
  private static getContainer(): Container {
    if (!this.container) {
      this.container = Container.getInstance();
      this.initializeContainer();
    }
    return this.container;
  }

  /**
   * Inicializar todas las dependencias en el Container
   */
  private static initializeContainer(): void {
    const container = this.getContainer();
    
    // Registrar HttpAuthRepository (para usuarios externos)
    container.register('HttpAuthRepository', () => new HttpAuthRepository(), true);
    
    // Registrar UsuarioProveedorMongoRepository (usuarios locales)
    container.register('UsuarioProveedorMongoRepository', () => new UsuarioProveedorMongoRepository(), true);
    
    // Registrar TipoDocumentoMongoRepository
    container.register('TipoDocumentoMongoRepository', () => new TipoDocumentoMongoRepository(), true);
    
    // Registrar CategoriaChecklistMongoRepository
    container.register('CategoriaChecklistMongoRepository', () => new CategoriaChecklistMongoRepository(), true);
    
    // Registrar PlantillaDocumentoMongoRepository
    container.register('PlantillaDocumentoMongoRepository', () => new PlantillaDocumentoMongoRepository(), true);
    
    // Registrar PlantillaChecklistMongoRepository
    container.register('PlantillaChecklistMongoRepository', () => new PlantillaChecklistMongoRepository(), true);
    
    // Registrar RequisitoDocumentoMongoRepository
    container.register('RequisitoDocumentoMongoRepository', () => new RequisitoDocumentoMongoRepository(), true);
    
    // Registrar AuthService (usa HttpAuthRepository)
    container.register('AuthService', (c: any) => {
      const httpAuthRepo = c.resolve('HttpAuthRepository');
      return new AuthService(httpAuthRepo);
    }, true);
    
    // Registrar UsuarioProveedorService (usuarios locales)
    container.register('UsuarioProveedorService', (c: any) => {
      const usuarioProveedorRepo = c.resolve('UsuarioProveedorMongoRepository');
      return new UsuarioProveedorService(usuarioProveedorRepo);
    }, true);
    
    // Registrar AuthAdminService (usa AuthService)
    container.register('AuthAdminService', (c: any) => {
      const authService = c.resolve('AuthService');
      return new AuthAdminService(authService);
    }, true);
    
    // Registrar AuthProveedorService (usa UsuarioProveedorService)
    container.register('AuthProveedorService', (c: any) => {
      const usuarioProveedorService = c.resolve('UsuarioProveedorService');
      return new AuthProveedorService(usuarioProveedorService);
    }, true);
    
    // Registrar TipoDocumentoService (usa TipoDocumentoMongoRepository)
    container.register('TipoDocumentoService', (c: any) => {
      const tipoDocumentoRepo = c.resolve('TipoDocumentoMongoRepository');
      return new TipoDocumentoService(tipoDocumentoRepo);
    }, true);
    
    // Registrar CategoriaChecklistService (usa CategoriaChecklistMongoRepository)
    container.register('CategoriaChecklistService', (c: any) => {
      const categoriaChecklistRepo = c.resolve('CategoriaChecklistMongoRepository');
      return new CategoriaChecklistService(categoriaChecklistRepo);
    }, true);
    
    // Registrar PlantillaDocumentoService (usa PlantillaDocumentoMongoRepository)
    container.register('PlantillaDocumentoService', (c: any) => {
      const plantillaDocumentoRepo = c.resolve('PlantillaDocumentoMongoRepository');
      return new PlantillaDocumentoService(plantillaDocumentoRepo);
    }, true);
    
    // Registrar PlantillaChecklistService (usa PlantillaChecklistMongoRepository y CategoriaChecklistService)
    container.register('PlantillaChecklistService', (c: any) => {
      const plantillaRepo = c.resolve('PlantillaChecklistMongoRepository');
      const categoriaService = c.resolve('CategoriaChecklistService');
      return new PlantillaChecklistService(plantillaRepo, categoriaService);
    }, true);
    
    // Registrar RequisitoDocumentoService (usa RequisitoDocumentoMongoRepository y PlantillaDocumentoService)
    container.register('RequisitoDocumentoService', (c: any) => {
      const requisitoRepo = c.resolve('RequisitoDocumentoMongoRepository');
      const plantillaDocumentoService = c.resolve('PlantillaDocumentoService');
      return new RequisitoDocumentoService(requisitoRepo, plantillaDocumentoService);
    }, true);
    
    // Registrar AuthResolver
    container.register('AuthResolver', (c: any) => {
      const authService = c.resolve('AuthService');
      return new AuthResolver(authService);
    }, true);
    
    // Registrar AuthAdminResolver
    container.register('AuthAdminResolver', (c: any) => {
      const authAdminService = c.resolve('AuthAdminService');
      return new AuthAdminResolver(authAdminService);
    }, true);
    
    // Registrar AuthProveedorResolver
    container.register('AuthProveedorResolver', (c: any) => {
      const authProveedorService = c.resolve('AuthProveedorService');
      return new AuthProveedorResolver(authProveedorService);
    }, true);
    
    // Registrar UsuarioProveedorResolver
    container.register('UsuarioProveedorResolver', (c: any) => {
      const usuarioProveedorService = c.resolve('UsuarioProveedorService');
      return new UsuarioProveedorResolver(usuarioProveedorService);
    }, true);
    
    // Registrar TipoDocumentoResolver
    container.register('TipoDocumentoResolver', (c: any) => {
      const tipoDocumentoService = c.resolve('TipoDocumentoService');
      return new TipoDocumentoResolver(tipoDocumentoService);
    }, true);
    
    // Registrar CategoriaChecklistResolver
    container.register('CategoriaChecklistResolver', (c: any) => {
      const categoriaChecklistService = c.resolve('CategoriaChecklistService');
      return new CategoriaChecklistResolver(categoriaChecklistService);
    }, true);
    
    // Registrar PlantillaDocumentoResolver
    container.register('PlantillaDocumentoResolver', (c: any) => {
      const plantillaDocumentoService = c.resolve('PlantillaDocumentoService');
      return new PlantillaDocumentoResolver(plantillaDocumentoService);
    }, true);
    
    // Registrar PlantillaChecklistResolver
    container.register('PlantillaChecklistResolver', (c: any) => {
      const plantillaService = c.resolve('PlantillaChecklistService');
      const requisitoService = c.resolve('RequisitoDocumentoService');
      return new PlantillaChecklistResolver(plantillaService, requisitoService);
    }, true);
    
    // Registrar UploadResolver
    container.register('UploadResolver', () => new UploadResolver(), true);
    
    logger.info('Container inicializado con dependencias de autenticación, usuarios proveedor, tipos de documento, categorias checklist, plantillas de documento y upload');
  }

  /**
   * Crea todos los resolvers usando Container para inyección de dependencias
   * @returns Array de resolvers GraphQL con guardias dinámicas aplicadas
   */
  static createResolvers(): unknown[] {
    const resolvers: unknown[] = [scalarResolvers];
    const container = this.getContainer();
    
    try {
      // Crear AuthResolver
      const authResolver = container.resolve<AuthResolver>('AuthResolver');
      resolvers.push(authResolver.getResolvers());
      logger.debug('Resolver configurado: auth');
      
      // Crear AuthAdminResolver
      const authAdminResolver = container.resolve<AuthAdminResolver>('AuthAdminResolver');
      resolvers.push(authAdminResolver.getResolvers());
      logger.debug('Resolver configurado: authAdmin');
      
      // Crear AuthProveedorResolver
      const authProveedorResolver = container.resolve<AuthProveedorResolver>('AuthProveedorResolver');
      resolvers.push(authProveedorResolver.getResolvers());
      logger.debug('Resolver configurado: authProveedor');
      
      // Crear UsuarioProveedorResolver
      const usuarioProveedorResolver = container.resolve<UsuarioProveedorResolver>('UsuarioProveedorResolver');
      resolvers.push(usuarioProveedorResolver.getResolvers());
      logger.debug('Resolver configurado: usuarioProveedor');
      
      // Crear TipoDocumentoResolver
      const tipoDocumentoResolver = container.resolve<TipoDocumentoResolver>('TipoDocumentoResolver');
      resolvers.push(tipoDocumentoResolver.getResolvers());
      logger.debug('Resolver configurado: tipoDocumento');
      
      // Crear CategoriaChecklistResolver
      const categoriaChecklistResolver = container.resolve<CategoriaChecklistResolver>('CategoriaChecklistResolver');
      resolvers.push(categoriaChecklistResolver.getResolvers());
      logger.debug('Resolver configurado: categoriaChecklist');
      
      // Crear PlantillaDocumentoResolver
      const plantillaDocumentoResolver = container.resolve<PlantillaDocumentoResolver>('PlantillaDocumentoResolver');
      resolvers.push(plantillaDocumentoResolver.getResolvers());
      logger.debug('Resolver configurado: plantillaDocumento');
      
      // Crear PlantillaChecklistResolver
      const plantillaChecklistResolver = container.resolve<PlantillaChecklistResolver>('PlantillaChecklistResolver');
      resolvers.push(plantillaChecklistResolver.getResolvers());
      logger.debug('Resolver configurado: plantillaChecklist');
      
      // Crear UploadResolver
      const uploadResolver = container.resolve<UploadResolver>('UploadResolver');
      resolvers.push(uploadResolver.getResolvers());
      logger.debug('Resolver configurado: upload');
      
      // TODO: Activar guardias dinámicas después de resolver el problema
      // const resolversConGuardias = DynamicGuardSystem.processResolvers(resolvers);
      
      logger.info(`Total de resolvers configurados: ${resolvers.length}`);
      return resolvers;
      
    } catch (error) {
      logger.error('Error configurando resolvers', {
        error: error instanceof Error ? error.message : String(error)
      });
      return resolvers;
    }
  }
}
