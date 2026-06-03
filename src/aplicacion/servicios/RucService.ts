import { RucCacheModel } from '../../infraestructura/persistencia/mongo/schemas/RucCacheSchema';
import { logger } from '../../infraestructura/logging';

/**
 * Servicio de consulta de RUC, ejecutado en el servidor (key en env) y con caché
 * de 2 meses en la colección "ruc".
 * NOTA: el token (apis-token-...) es de apis.net.pe (no perudevs); por eso se
 * consulta api.apis.net.pe/v2 con Authorization: Bearer.
 */
const APIS_NET_PE_BASE = 'https://api.apis.net.pe/v2';
const CACHE_MS = 2 * 30 * 24 * 60 * 60 * 1000; // ~2 meses

export interface RucData {
  razonSocial: string;
  nombreComercial: string;
  numeroDocumento: string;
  estado: string;
  condicion: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  tipo: string;
  actividadEconomica: string;
  EsAgenteRetencion: boolean;
}

export interface RucResponse {
  success: boolean;
  data: RucData | null;
  fromCache: boolean;
}

export class RucService {
  async consultarRuc(numeroDocumento: string): Promise<RucResponse> {
    const ruc = (numeroDocumento || '').trim();
    if (!/^\d{11}$/.test(ruc)) {
      throw new Error('El RUC debe tener 11 dígitos');
    }

    // 1) Caché vigente
    const cached = await RucCacheModel.findOne({ numeroDocumento: ruc });
    if (cached && cached.expira > new Date()) {
      return { success: true, data: this.fromCache(cached, ruc), fromCache: true };
    }

    // 2) Consultar API externa (key en el servidor, igual que inacons)
    const token = process.env['RENIEC_API_TOKEN'] || process.env['PERUDEVS_TOKEN'];
    if (!token) {
      throw new Error('Falta configurar RENIEC_API_TOKEN en el backend');
    }

    try {
      const url = `${APIS_NET_PE_BASE}/sunat/ruc?numero=${encodeURIComponent(ruc)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const json: any = await res.json();

      // apis.net.pe devuelve el objeto plano; en éxito trae razonSocial.
      if (!json || !json.razonSocial) {
        return { success: false, data: null, fromCache: false };
      }

      const data: RucData = {
        razonSocial: json.razonSocial || '',
        nombreComercial: json.nombreComercial || json.razonSocial || '',
        numeroDocumento: json.numeroDocumento || ruc,
        estado: json.estado || '',
        condicion: json.condicion || '',
        direccion: json.direccion || '',
        distrito: json.distrito || '',
        provincia: json.provincia || '',
        departamento: json.departamento || '',
        tipo: json.tipo || '',
        actividadEconomica: json.actividadEconomica || '',
        EsAgenteRetencion: Boolean(json.EsAgenteRetencion),
      };

      // 3) Guardar/actualizar caché
      await RucCacheModel.findOneAndUpdate(
        { numeroDocumento: ruc },
        { ...data, numeroDocumento: ruc, expira: new Date(Date.now() + CACHE_MS) },
        { upsert: true, new: true }
      );

      return { success: true, data, fromCache: false };
    } catch (error) {
      logger.error('Error al consultar RUC', {
        error: error instanceof Error ? error.message : String(error),
        ruc,
      });
      throw new Error('Error al consultar el RUC');
    }
  }

  private fromCache(doc: RucCacheModelLike, ruc: string): RucData {
    return {
      razonSocial: doc.razonSocial || '',
      nombreComercial: doc.nombreComercial || '',
      numeroDocumento: ruc,
      estado: doc.estado || '',
      condicion: doc.condicion || '',
      direccion: doc.direccion || '',
      distrito: doc.distrito || '',
      provincia: doc.provincia || '',
      departamento: doc.departamento || '',
      tipo: doc.tipo || '',
      actividadEconomica: doc.actividadEconomica || '',
      EsAgenteRetencion: Boolean(doc.EsAgenteRetencion),
    };
  }
}

type RucCacheModelLike = {
  razonSocial?: string;
  nombreComercial?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  tipo?: string;
  actividadEconomica?: string;
  EsAgenteRetencion?: boolean;
};
