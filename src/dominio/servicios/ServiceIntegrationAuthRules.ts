import { ValidationException } from '../exceptions/DomainException';

/** Valida token M2M (Pagos → Proveedores, etc.). */
export class ServiceIntegrationAuthRules {
  static assertProveedoresServiceToken(token: string | undefined | null): void {
    const expected = String(process.env['PROVEEDORES_SERVICE_TOKEN'] ?? '').trim();
    if (!expected) return;
    const got = String(token ?? '').trim();
    if (got !== expected) {
      throw new ValidationException(
        'Token de servicio inválido para integración Proveedores',
        'auth',
      );
    }
  }
}
