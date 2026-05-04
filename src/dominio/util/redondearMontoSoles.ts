/**
 * Montos en soles (2 decimales), alineado con `redondear` de inacons-frontend (OrdenPagoPage).
 */
export function redondearMontoSoles(numero: number): number {

  if (!Number.isFinite(numero)) {
    throw new Error('El monto no es un número válido');
  }
  const enteroMasCercano = Math.round(numero);

  if (Math.abs(numero - enteroMasCercano) < 0.0002) {
    return enteroMasCercano;
  }
  return Math.round(numero * 100) / 100;
}
