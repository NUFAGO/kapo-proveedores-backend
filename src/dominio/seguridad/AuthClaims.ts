// ============================================================================
// CLAIMS DEL ACCESS TOKEN (forma de los datos — sin lógica de validación)
// ============================================================================
// La VALIDACIÓN del token (firma RS256, expiración, sesión Redis) es trabajo
// EXCLUSIVO del kapo-gateway. Este MS solo LEE los claims para contexto de
// resolvers (auditoría, reglas por cargo/jerarquía, chequeo de sistema).

/** Cargo + jerarquía embebidos en el token (para reglas de negocio). */
export interface AuthCargo {
  id: string;
  nombre: string;
  gerarquia: number;
}

/** Claims del access token (emitido y firmado por kapo-autentificacion). */
export interface AuthClaims {
  sub: string; // id de usuario
  sid: string; // id de sesión
  sistema?: string; // código del sistema al que se autenticó
  rol?: string; // código del rol en ese sistema
  permisos?: string[]; // lista plana de códigos de permiso (solo de ese sistema)
  cargo?: AuthCargo; // cargo + jerarquía
  iat?: number;
  exp?: number;
}
