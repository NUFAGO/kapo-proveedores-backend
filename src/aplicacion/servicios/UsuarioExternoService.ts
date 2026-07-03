import { UsuarioExternoResponse } from '../../dominio/entidades/UsuarioExterno';
import { IUsuarioExternoRepository } from '../../dominio/repositorios/IUsuarioExternoRepository';
import { logger } from '../../infraestructura/logging';

/** Paridad inacons kanban proveedor: rol cuyo nombre contiene "conta". */
export const ROL_REGEX_APROBADOR_PROVEEDOR = 'conta';

/** Paridad inacons: jerarquía 4 = Gerencia en maestro de cargos. */
export const JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR = 4;

export function usuarioPuedeAprobarProveedorKanban(params: {
  roleNombre?: string | null;
  cargoGerarquia?: number | null;
}): boolean {
  const rol = (params.roleNombre ?? '').trim().toLowerCase();
  if (rol.includes(ROL_REGEX_APROBADOR_PROVEEDOR.toLowerCase())) return true;
  return params.cargoGerarquia === JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR;
}

function dedupeUsuarios(listas: UsuarioExternoResponse[][]): UsuarioExternoResponse[] {
  const vistos = new Set<string>();
  const out: UsuarioExternoResponse[] = [];
  for (const lista of listas) {
    for (const u of lista) {
      if (!u?.id || vistos.has(u.id)) continue;
      vistos.add(u.id);
      out.push(u);
    }
  }
  return out.sort((a, b) =>
    `${a.apellidos ?? ''} ${a.nombres ?? ''}`.localeCompare(
      `${b.apellidos ?? ''} ${b.nombres ?? ''}`,
      'es'
    )
  );
}

/**
 * Usuarios inacons que pueden validar cuentas / aprobar estados de proveedor (kanban).
 */
export class UsuarioExternoService {
  constructor(private readonly repo: IUsuarioExternoRepository) {}

  async getUsuario(id: string): Promise<UsuarioExternoResponse | null> {
    return this.repo.getUsuario(id);
  }

  async getUsuariosByRolCargo(
    jerarquia?: number,
    rolRegex?: string
  ): Promise<UsuarioExternoResponse[]> {
    return this.repo.getUsuariosByRolCargo(jerarquia, rolRegex);
  }

  /** Contabilidad (rol *conta*) ∪ Gerencia (jerarquía 4), sin duplicados. */
  async listarAprobadoresProveedorKanban(): Promise<UsuarioExternoResponse[]> {
    const [porRol, porJerarquia] = await Promise.all([
      this.repo.getUsuariosByRolCargo(undefined, ROL_REGEX_APROBADOR_PROVEEDOR),
      this.repo.getUsuariosByRolCargo(JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR, undefined),
    ]);
    return dedupeUsuarios([porRol, porJerarquia]);
  }

  /**
   * ¿El usuario puede aprobar/validar en el kanban de proveedores?
   *
   * Regla (paridad inacons): rol con "conta" O cargo jerarquía 4 (Gerencia).
   *
   * Fuente de datos: rol y jerarquía vienen de los CLAIMS del token (ya
   * decodificados en el contexto GraphQL). Esto evita llamar a auth
   * (`getUsuarioById` exige token de usuario → "Acceso denegado" en M2M) y
   * ahorra un viaje de red. Solo si el token no trae jerarquía se intenta el
   * fallback a auth, protegido con try/catch para no romper el flujo.
   */
  async puedeAprobarProveedorKanban(
    usuarioId: string,
    roleNombre?: string | null,
    cargoGerarquiaClaim?: number | null
  ): Promise<boolean> {
    let cargoGerarquia: number | null =
      typeof cargoGerarquiaClaim === 'number' && Number.isFinite(cargoGerarquiaClaim)
        ? cargoGerarquiaClaim
        : null;
    let cargoNombre: string | null = null;
    let fuenteJerarquia: 'token' | 'auth' | 'none' = cargoGerarquia != null ? 'token' : 'none';

    // Fallback: solo si el token no trajo la jerarquía. Protegido: si auth
    // deniega la llamada M2M, seguimos con lo que tengamos (rol del token).
    if (cargoGerarquia == null) {
      try {
        const perfil = await this.repo.getUsuario(usuarioId);
        const g =
          perfil?.cargo_id?.gerarquia != null ? Number(perfil.cargo_id.gerarquia) : null;
        cargoGerarquia = Number.isFinite(g as number) ? (g as number) : null;
        cargoNombre = perfil?.cargo_id?.nombre ?? null;
        if (cargoGerarquia != null) fuenteJerarquia = 'auth';
      } catch (error) {
        logger.warn('[puedeAprobarProveedorKanban] No se pudo leer cargo desde auth (fallback)', {
          usuarioId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const rolNormalizado = (roleNombre ?? '').trim().toLowerCase();
    const matchRol = rolNormalizado.includes(
      ROL_REGEX_APROBADOR_PROVEEDOR.toLowerCase()
    );
    const matchGerarquia = cargoGerarquia === JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR;
    const puedeAprobar = matchRol || matchGerarquia;

    logger.info('[puedeAprobarProveedorKanban] Evaluando permiso de aprobación', {
      usuarioId,
      entrada: {
        roleNombreRecibido: roleNombre ?? null,
        cargoNombre,
        cargoGerarquia,
        fuenteJerarquia,
      },
      comparaciones: {
        regla1_rolIncluye: {
          valor: rolNormalizado || '(vacío)',
          busca: ROL_REGEX_APROBADOR_PROVEEDOR,
          resultado: matchRol,
        },
        regla2_gerarquiaEsGerencia: {
          valor: cargoGerarquia,
          busca: JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR,
          resultado: matchGerarquia,
        },
      },
      resultadoFinal: puedeAprobar,
    });

    return puedeAprobar;
  }
}
