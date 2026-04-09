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
import { OrdenCompraResolver } from './OrdenCompraResolver';
import { ExpedientePagoResolver } from './ExpedientePagoResolver';
import { TipoPagoOCResolver } from './TipoPagoOCResolver';
import { DocumentoOCResolver } from './DocumentoOCResolver';
import { DocumentoSubidoResolver } from './DocumentoSubidoResolver';
import { ProveedorResolver } from './ProveedorResolver';
import { CodigoAccesoResolver } from './CodigoAccesoResolver';
import { AprobacionResolver } from './AprobacionResolver';
import { ChecklistProveedorResolver } from './ChecklistProveedorResolver';
import { SolicitudPagoResolver } from './SolicitudPagoResolver';
import { ReporteSolicitudPagoResolver } from './ReporteSolicitudPagoResolver';
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
import { OrdenCompraService } from '../../../aplicacion/servicios/OrdenCompraService';
import { ExpedientePagoService } from '../../../dominio/servicios/ExpedientePagoService';
import { TipoPagoOCService } from '../../../dominio/servicios/TipoPagoOCService';
import { DocumentoOCService } from '../../../dominio/servicios/DocumentoOCService';
import { ProveedorService } from '../../../aplicacion/servicios/ProveedorService';
import { CodigoAccesoService } from '../../../aplicacion/servicios/CodigoAccesoService';
import { AprobacionService } from '../../../dominio/servicios/AprobacionService';
import { AprobacionChecklistRevisionService } from '../../../dominio/servicios/AprobacionChecklistRevisionService';
import { AprobacionFinalizarRevisionChecklistService } from '../../../dominio/servicios/AprobacionFinalizarRevisionChecklistService';
import { SolicitudPagoService } from '../../../dominio/servicios/SolicitudPagoService';
import { ReporteSolicitudPagoService } from '../../../dominio/servicios/ReporteSolicitudPagoService';
import { DocumentoSubidoService } from '../../../dominio/servicios/DocumentoSubidoService';
import { ChecklistProveedorBatchService } from '../../../dominio/servicios/ChecklistProveedorBatchService';
import { UsuarioProveedorMongoRepository } from '../../persistencia/mongo/UsuarioProveedorMongoRepository';
import { TipoDocumentoMongoRepository } from '../../persistencia/mongo/TipoDocumentoMongoRepository';
import { CategoriaChecklistMongoRepository } from '../../persistencia/mongo/CategoriaChecklistMongoRepository';
import { PlantillaDocumentoMongoRepository } from '../../persistencia/mongo/PlantillaDocumentoMongoRepository';
import { PlantillaChecklistMongoRepository } from '../../persistencia/mongo/PlantillaChecklistMongoRepository';
import { RequisitoDocumentoMongoRepository } from '../../persistencia/mongo/RequisitoDocumentoMongoRepository';
import { DocumentoOCMongoRepository } from '../../persistencia/mongo/DocumentoOCMongoRepository';
import { ExpedientePagoMongoRepository } from '../../persistencia/mongo/ExpedientePagoMongoRepository';
import { TipoPagoOCMongoRepository } from '../../persistencia/mongo/TipoPagoOCMongoRepository';
import { CodigoAccesoMongoRepository } from '../../persistencia/mongo/CodigoAccesoMongoRepository';
import { AprobacionMongoRepository } from '../../persistencia/mongo/AprobacionMongoRepository';
import { SolicitudPagoMongoRepository } from '../../persistencia/mongo/SolicitudPagoMongoRepository';
import { ReporteSolicitudPagoMongoRepository } from '../../persistencia/mongo/ReporteSolicitudPagoMongoRepository';
import { DocumentoSubidoMongoRepository } from '../../persistencia/mongo/DocumentoSubidoMongoRepository';
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
    
    // Registrar DocumentoOCMongoRepository
    container.register('DocumentoOCMongoRepository', () => new DocumentoOCMongoRepository(), true);

    // Registrar SolicitudPagoMongoRepository (DocumentoSubido y otros servicios)
    container.register('SolicitudPagoMongoRepository', () => new SolicitudPagoMongoRepository(), true);

    container.register('ReporteSolicitudPagoMongoRepository', () => new ReporteSolicitudPagoMongoRepository(), true);
    
    // Registrar ExpedientePagoMongoRepository
    container.register('ExpedientePagoMongoRepository', () => new ExpedientePagoMongoRepository(), true);
    
    // Registrar TipoPagoOCMongoRepository
    container.register('TipoPagoOCMongoRepository', () => new TipoPagoOCMongoRepository(), true);
    
    // Registrar ExpedientePagoService
    container.register('ExpedientePagoService', (c: any) => {
      const expedienteRepo = c.resolve('ExpedientePagoMongoRepository');
      const tipoPagoOCRepo = c.resolve('TipoPagoOCMongoRepository');
      const documentoOCRepo = c.resolve('DocumentoOCMongoRepository');
      const categoriaRepo = c.resolve('CategoriaChecklistMongoRepository');
      const plantillaRepo = c.resolve('PlantillaChecklistMongoRepository');
      return new ExpedientePagoService(expedienteRepo, tipoPagoOCRepo, documentoOCRepo, categoriaRepo, plantillaRepo);
    }, true);
    
    // Registrar TipoPagoOCService
    container.register('TipoPagoOCService', (c: any) => {
      const tipoPagoOCRepo = c.resolve('TipoPagoOCMongoRepository');
      const expedienteRepo = c.resolve('ExpedientePagoMongoRepository');
      return new TipoPagoOCService(tipoPagoOCRepo, expedienteRepo);
    }, true);
    
    // Registrar DocumentoOCService
    container.register('DocumentoOCService', (c: any) => {
      const documentoOCRepo = c.resolve('DocumentoOCMongoRepository');
      const expedienteRepo = c.resolve('ExpedientePagoMongoRepository');
      const expedientePagoService = c.resolve('ExpedientePagoService');
      return new DocumentoOCService(documentoOCRepo, expedienteRepo, expedientePagoService);
    }, true);
    
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
    
    // Registrar PlantillaChecklistService (usa PlantillaChecklistMongoRepository, CategoriaChecklistService y RequisitoDocumentoMongoRepository)
    container.register('PlantillaChecklistService', (c: any) => {
      const plantillaRepo = c.resolve('PlantillaChecklistMongoRepository');
      const categoriaService = c.resolve('CategoriaChecklistService');
      const requisitoRepo = c.resolve('RequisitoDocumentoMongoRepository');
      return new PlantillaChecklistService(plantillaRepo, categoriaService, requisitoRepo);
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
    
    // Registrar OrdenCompraService
    container.register('OrdenCompraService', () => new OrdenCompraService(), true);
    
    // Registrar ProveedorService
    container.register('ProveedorService', () => new ProveedorService(), true);
    
    // Registrar CodigoAccesoMongoRepository
    container.register('CodigoAccesoMongoRepository', () => new CodigoAccesoMongoRepository(), true);
    
    // Registrar CodigoAccesoService
    container.register('CodigoAccesoService', (c: any) => {
      const codigoAccesoRepository = c.resolve('CodigoAccesoMongoRepository');
      const proveedorRepository = c.resolve('ProveedorService');
      return new CodigoAccesoService(codigoAccesoRepository, proveedorRepository);
    }, true);
    
    // Registrar OrdenCompraResolver
    container.register('OrdenCompraResolver', (c: any) => {
      const ordenCompraService = c.resolve('OrdenCompraService');
      return new OrdenCompraResolver(ordenCompraService);
    }, true);
    
    // Registrar ProveedorResolver
    container.register('ProveedorResolver', (c: any) => {
      const proveedorService = c.resolve('ProveedorService');
      return new ProveedorResolver(proveedorService);
    }, true);
    
    // Registrar ExpedientePagoResolver
    container.register('ExpedientePagoResolver', (c: any) => {
      const expedientePagoService = c.resolve('ExpedientePagoService');
      return new ExpedientePagoResolver(expedientePagoService);
    }, true);
    
    // Registrar TipoPagoOCResolver
    container.register('TipoPagoOCResolver', (c: any) => {
      const tipoPagoOCService = c.resolve('TipoPagoOCService');
      return new TipoPagoOCResolver(tipoPagoOCService);
    }, true);
    
    // Registrar DocumentoOCResolver
    container.register('DocumentoOCResolver', (c: any) => {
      const documentoOCService = c.resolve('DocumentoOCService');
      return new DocumentoOCResolver(documentoOCService);
    }, true);

    container.register('DocumentoSubidoResolver', (c: any) => {
      const documentoOCRepo = c.resolve('DocumentoOCMongoRepository');
      const solicitudPagoRepo = c.resolve('SolicitudPagoMongoRepository');
      return new DocumentoSubidoResolver(documentoOCRepo, solicitudPagoRepo);
    }, true);
    
    // Registrar CodigoAccesoResolver
    container.register('CodigoAccesoResolver', (c: any) => {
      const codigoAccesoService = c.resolve('CodigoAccesoService');
      return new CodigoAccesoResolver(codigoAccesoService);
    }, true);

    container.register('AprobacionMongoRepository', () => new AprobacionMongoRepository(), true);

    container.register('AprobacionService', (c: any) => {
      const repo = c.resolve('AprobacionMongoRepository');
      return new AprobacionService(repo);
    }, true);

    container.register('DocumentoSubidoMongoRepository', () => new DocumentoSubidoMongoRepository(), true);

    container.register('SolicitudPagoService', (c: any) => {
      return new SolicitudPagoService(
        c.resolve('SolicitudPagoMongoRepository'),
        c.resolve('TipoPagoOCMongoRepository'),
        c.resolve('ExpedientePagoMongoRepository'),
        c.resolve('ExpedientePagoService')
      );
    }, true);

    container.register('SolicitudPagoResolver', (c: any) => {
      return new SolicitudPagoResolver(
        c.resolve('TipoPagoOCMongoRepository'),
        c.resolve('ExpedientePagoMongoRepository'),
        c.resolve('ExpedientePagoService')
      );
    }, true);

    container.register('ReporteSolicitudPagoService', (c: any) => {
      return new ReporteSolicitudPagoService(
        c.resolve('ReporteSolicitudPagoMongoRepository'),
        c.resolve('SolicitudPagoMongoRepository')
      );
    }, true);

    container.register('ReporteSolicitudPagoResolver', (c: any) => {
      return new ReporteSolicitudPagoResolver(
        c.resolve('ReporteSolicitudPagoService'),
        c.resolve('SolicitudPagoMongoRepository')
      );
    }, true);

    container.register('DocumentoSubidoService', (c: any) => {
      return new DocumentoSubidoService(
        c.resolve('DocumentoSubidoMongoRepository'),
        c.resolve('DocumentoOCMongoRepository'),
        c.resolve('SolicitudPagoMongoRepository')
      );
    }, true);

    container.register('AprobacionChecklistRevisionService', (c: any) => {
      return new AprobacionChecklistRevisionService(
        c.resolve('AprobacionService'),
        c.resolve('SolicitudPagoService'),
        c.resolve('DocumentoOCService'),
        c.resolve('PlantillaChecklistService'),
        c.resolve('DocumentoSubidoService'),
        c.resolve('TipoPagoOCService')
      );
    }, true);

    container.register('AprobacionFinalizarRevisionChecklistService', (c: any) => {
      return new AprobacionFinalizarRevisionChecklistService(
        c.resolve('AprobacionService'),
        c.resolve('AprobacionChecklistRevisionService'),
        c.resolve('SolicitudPagoService'),
        c.resolve('DocumentoOCService'),
        c.resolve('DocumentoSubidoService'),
        c.resolve('ExpedientePagoMongoRepository'),
        c.resolve('SolicitudPagoMongoRepository'),
        c.resolve('ExpedientePagoService')
      );
    }, true);

    container.register('AprobacionResolver', (c: any) => {
      return new AprobacionResolver(
        c.resolve('AprobacionService'),
        c.resolve('AprobacionChecklistRevisionService'),
        c.resolve('AprobacionFinalizarRevisionChecklistService'),
        c.resolve('ExpedientePagoMongoRepository')
      );
    }, true);

    container.register('ChecklistProveedorBatchService', (c: any) => {
      return new ChecklistProveedorBatchService(
        c.resolve('SolicitudPagoService'),
        c.resolve('SolicitudPagoMongoRepository'),
        c.resolve('DocumentoSubidoService'),
        c.resolve('AprobacionService'),
        c.resolve('ExpedientePagoMongoRepository'),
        c.resolve('DocumentoOCMongoRepository'),
        c.resolve('TipoPagoOCMongoRepository'),
        c.resolve('ReporteSolicitudPagoMongoRepository')
      );
    }, true);

    container.register('ChecklistProveedorResolver', (c: any) => {
      return new ChecklistProveedorResolver(c.resolve('ChecklistProveedorBatchService'));
    }, true);
    
    logger.info('Container inicializado con dependencias de autenticación, usuarios proveedor, tipos de documento, categorias checklist, plantillas de documento, upload, ordenes de compra, expedientes pago, tipos pago OC, documentos OC, documentos subidos, reportes solicitud pago, proveedores, aprobaciones, checklist proveedor batch y sus repositories MongoDB');
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
      
      // Crear OrdenCompraResolver
      const ordenCompraResolver = container.resolve<OrdenCompraResolver>('OrdenCompraResolver');
      resolvers.push(ordenCompraResolver.getResolvers());
      logger.debug('Resolver configurado: ordenCompra');
      
      // Crear ProveedorResolver
      const proveedorResolver = container.resolve<ProveedorResolver>('ProveedorResolver');
      resolvers.push(proveedorResolver.getResolvers());
      logger.debug('Resolver configurado: proveedor');
      
      // Crear ExpedientePagoResolver
      const expedientePagoResolver = container.resolve<ExpedientePagoResolver>('ExpedientePagoResolver');
      resolvers.push(expedientePagoResolver.getResolvers());
      logger.debug('Resolver configurado: expedientePago');
      
      // Crear TipoPagoOCResolver
      const tipoPagoOCResolver = container.resolve<TipoPagoOCResolver>('TipoPagoOCResolver');
      resolvers.push(tipoPagoOCResolver.getResolvers());
      logger.debug('Resolver configurado: tipoPagoOC');
      
      // Crear DocumentoOCResolver
      const documentoOCResolver = container.resolve<DocumentoOCResolver>('DocumentoOCResolver');
      resolvers.push(documentoOCResolver.getResolvers());
      logger.debug('Resolver configurado: documentoOC');

      const documentoSubidoResolver = container.resolve<DocumentoSubidoResolver>('DocumentoSubidoResolver');
      resolvers.push(documentoSubidoResolver.getResolvers());
      logger.debug('Resolver configurado: documentoSubido');
      
      // Crear CodigoAccesoResolver
      const codigoAccesoResolver = container.resolve<CodigoAccesoResolver>('CodigoAccesoResolver');
      resolvers.push(codigoAccesoResolver.getResolvers());
      logger.debug('Resolver configurado: codigoAcceso');

      const aprobacionResolver = container.resolve<AprobacionResolver>('AprobacionResolver');
      resolvers.push(aprobacionResolver.getResolvers());
      logger.debug('Resolver configurado: aprobacion');

      const checklistProveedorResolver = container.resolve<ChecklistProveedorResolver>('ChecklistProveedorResolver');
      resolvers.push(checklistProveedorResolver.getResolvers());
      logger.debug('Resolver configurado: checklistProveedor');

      const solicitudPagoResolver = container.resolve<SolicitudPagoResolver>('SolicitudPagoResolver');
      resolvers.push(solicitudPagoResolver.getResolvers());
      logger.debug('Resolver configurado: solicitudPago');

      const reporteSolicitudPagoResolver = container.resolve<ReporteSolicitudPagoResolver>('ReporteSolicitudPagoResolver');
      resolvers.push(reporteSolicitudPagoResolver.getResolvers());
      logger.debug('Resolver configurado: reporteSolicitudPago');
      
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
