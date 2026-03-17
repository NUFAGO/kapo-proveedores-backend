import { Storage } from '@google-cloud/storage';
import { logger } from '../logging';
import { ConfigService } from './ConfigService';

const configService = ConfigService.getInstance();
const config = configService.getGCPConfig();

let storageInstance: Storage | null = null;

export const getStorageClient = (): Storage => {
  if (!storageInstance) {
    // Usar credenciales desde JSON si están disponibles
    const storageOptions: { projectId: string; credentials?: any } = {
      projectId: config.projectId,
    };

    if (config.credentials) {
      storageOptions.credentials = config.credentials;
      logger.info('GCP Storage inicializado con credenciales JSON', { projectId: config.projectId, bucket: config.bucket });
    } else {
      logger.info('GCP Storage inicializado con Application Default Credentials (fallback)', { projectId: config.projectId, bucket: config.bucket });
    }

    storageInstance = new Storage(storageOptions);
  }
  return storageInstance;
};

export const getBucket = () => getStorageClient().bucket(config.bucket);

export const getGCPConfig = () => config;

export const verifyGCPConnection = async (): Promise<boolean> => {
  try {
    await getBucket().exists();
    logger.info('GCP Storage verificado');
    return true;
  } catch (error) {
    logger.error('GCP Storage error', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
};

