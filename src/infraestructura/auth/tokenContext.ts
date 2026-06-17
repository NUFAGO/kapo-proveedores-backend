// ============================================================================
// CONTEXTO DE USUARIO — decodificación del token (SIN validación)
// ============================================================================
// Este MS NO valida tokens: la firma, la expiración y la sesión Redis las
// valida el kapo-gateway ANTES de proxear (y en producción, X-Gateway-Secret
// garantiza que todo lo que llega pasó por el gateway). Aquí solo se LEE el
// payload (base64 → JSON) para dar contexto a los resolvers: quién ejecuta
// (sub), su cargo/jerarquía (reglas de negocio) y su sistema.
//
// Decodificar NO es validar: un token adulterado que llegue directo (dev,
// sin secreto) podría traer claims falsos — el candado real es el gateway
// + REQUIRE_GATEWAY_SECRET=true en producción.

import type { AuthClaims } from '../../dominio/seguridad/AuthClaims';

export function decodificarClaims(
  token: string | null | undefined,
): AuthClaims | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(
      payload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const claims = JSON.parse(json) as Partial<AuthClaims>;
    // Forma mínima: sin sub/sid no hay contexto utilizable
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') {
      return null;
    }
    return claims as AuthClaims;
  } catch {
    return null;
  }
}
