import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import cors from 'cors';
import http from 'http';
import { logger } from '../logging';
import { HealthCheckService } from '../health/HealthCheckService';
import { DatabaseHealthCheck } from '../health/DatabaseHealthCheck';

import { ConfigService } from './ConfigService';
import { buildPermissions } from '../graphql/auth/permissions';
import { decodificarClaims } from '../auth/tokenContext';
import { createGatewayValidationMiddleware } from '../auth/gatewayValidationMiddleware';
import { JWTUtils } from '../auth/JWTUtils';
import { runWithRequestContext } from '../auth/requestContext';

const configService = ConfigService.getInstance();

const config = {
  port: configService.getServerPort(),
  host: "0.0.0.0",
  timeout: 600000,
  maxFileSize: 50 * 1024 * 1024,
  maxFiles: 100,
  allowedOrigins: configService.getCorsOrigins()
};

const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    // Permitir peticiones sin origen (ej: Postman, extensiones de navegador, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Permitir localhost y 127.0.0.1
    if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:") ||
      origin.startsWith("http://127.0.0.1:") || origin.startsWith("https://127.0.0.1:")) {
      callback(null, true);
      return;
    }

    // Permitir Apollo Studio
    if (origin.startsWith("https://studio.apollographql.com")) {
      callback(null, true);
      return;
    }

    // Permitir orígenes configurados
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Rechazar silenciosamente extensiones de Chrome y otros orígenes no permitidos
    // No lanzar error para evitar ruido en los logs
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
};

export const createServer = (resolvers: any, typeDefs: any): { app: Application; httpServer: http.Server; apolloServer: ApolloServer } => {
  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json({ limit: `${config.maxFileSize}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${config.maxFileSize}mb` }));

  // Configurar Health Check Service
  const healthCheckService = new HealthCheckService();

  // Registrar health checks
  healthCheckService.register('database', new DatabaseHealthCheck());

  // Endpoint de health check
  app.get('/health', async (_, res) => {
    try {
      const result = await healthCheckService.checkAll();
      const statusCode = result.overall === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        ...result,
        uptime: process.uptime(),
        config: {
          port: config.port,
          mode: configService.getDatabaseMode(),
          nodeEnv: configService.getNodeEnv()
        }
      });
    } catch (error) {
      logger.error('Error ejecutando health checks', { error: error instanceof Error ? error.message : String(error) });
      res.status(503).json({
        overall: 'unhealthy',
        error: 'Error ejecutando health checks',
        timestamp: new Date()
      });
    }
  });

  const httpServer = http.createServer({ maxHeaderSize: 128 * 1024 }, app);
  httpServer.timeout = config.timeout + 300000;
  httpServer.keepAliveTimeout = 120000;
  httpServer.headersTimeout = 125000;

  // Propaga el JWT del usuario (admin IAM o interno) en AsyncLocalStorage para
  // que HttpAuthRepository pueda reenviarlo a auth-service sin recibirlo por arg.
  // Se monta ANTES del middleware de validación del gateway.
  app.use('/graphql', (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' ? authHeader.split(' ')[1]?.trim() : undefined;
    const upstreamSecret = configService.getInternalUpstreamSecret();
    const recibido = req.headers['x-internal-gateway-secret'];
    const internalTrusted =
      !!upstreamSecret && typeof recibido === 'string' && recibido === upstreamSecret;
    const xUserToken = req.headers['x-user-token'];
    const userToken = internalTrusted
      ? (typeof xUserToken === 'string'
          ? xUserToken.replace(/^Bearer\s+/i, '').trim() || undefined
          : undefined)
      : bearerToken || undefined;
    runWithRequestContext(userToken, () => next());
  });

  // Bloqueo de acceso directo: solo gateway (X-Gateway-Secret) o proveedor
  // local válido cuando REQUIRE_GATEWAY_SECRET=true. Montado antes de Apollo.
  app.use('/graphql', createGatewayValidationMiddleware(configService));

  // shield: autoriza por operación (admin IAM+sistema O proveedor local).
  const baseSchema = makeExecutableSchema({ typeDefs, resolvers });
  const schema = applyMiddleware(baseSchema, buildPermissions(configService));

  const apolloServer = new ApolloServer({
    schema,
    introspection: true,
    context: async ({ req }) => {
      const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();

      // Discrimina por tipo de token:
      //  · IAM (RS256, tiene sid) → ADMIN. El gateway ya validó la firma; aquí
      //    solo se DECODIFICAN los claims.
      //  · local (HS256) → PROVEEDOR externo (no está en el IAM): se valida LOCAL.
      let usuarioAuth: ReturnType<typeof decodificarClaims> = null;
      let user:
        | { id?: string; tipo_usuario?: 'admin' | 'proveedor'; proveedor_id?: string | null; role?: string }
        | null = null;
      let authMotivo: string | undefined;

      // Llamada M2M este-oeste: el gateway interno inyecta X-Internal-Gateway-Secret.
      // Si coincide → consumo interno confiable. En ese caso el `Authorization` es
      // el JWT de SERVICIO (RS256) que reenvía el internal, NO un token de usuario;
      // por eso NO se intenta validar como admin/proveedor (evita el WARN
      // "invalid algorithm" y trabajo inútil).
      const upstreamSecret = configService.getInternalUpstreamSecret();
      const recibido = req.headers['x-internal-gateway-secret'];
      const internalTrusted =
        !!upstreamSecret &&
        typeof recibido === 'string' &&
        recibido === upstreamSecret;

      // Usuario: interna → viene en x-user-token (reenviado por el gateway);
      // edge → en Authorization. Se DECODIFICA, no se re-valida (ya se validó
      // en el edge).
      const xUserTokenHeader = req.headers['x-user-token'];
      const userTokenRaw = internalTrusted
        ? (typeof xUserTokenHeader === 'string' ? xUserTokenHeader.replace(/^Bearer\s+/i, '').trim() : undefined)
        : bearer;

      // Discrimina por tipo de token:
      //  · IAM (RS256, tiene sid) → ADMIN. El gateway ya validó la firma; aquí
      //    solo se DECODIFICAN los claims.
      //  · local (HS256) → PROVEEDOR externo (no está en el IAM): se valida LOCAL.
      if (userTokenRaw) {
        const claims = decodificarClaims(userTokenRaw);
        if (claims?.sid) {
          usuarioAuth = claims;
          user = {
            id: claims.sub,
            tipo_usuario: 'admin',
            proveedor_id: null,
            ...(claims.rol ? { role: claims.rol } : {}),
          };
        } else {
          try {
            const local = JWTUtils.validateToken(userTokenRaw);
            if (local) user = local;
          } catch (e) {
            authMotivo =
              e instanceof Error && e.message.includes('expirado')
                ? 'TOKEN_EXPIRADO'
                : 'TOKEN_INVALIDO';
          }
        }
      }

      return { req, token: bearer, usuarioAuth, user, authMotivo, internalTrusted };
    },
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    persistedQueries: false,
    formatError: (error: any): any => {
      logger.error("GraphQL Error", {
        error: error.message,
        extensions: error.extensions,
        path: error.path
      });
      return error.toJSON();
    },
  });

  return { app, httpServer, apolloServer };
};

export const startServer = async (app: Application, httpServer: http.Server, apolloServer: ApolloServer): Promise<void> => {
  await apolloServer.start();

  // Usar dynamic import para el middleware ES Module
  // @ts-expect-error - dynamic import de ES Module .js
  const { default: graphqlUploadExpress } = await import('graphql-upload/graphqlUploadExpress.js');
  app.use(graphqlUploadExpress({ maxFileSize: config.maxFileSize, maxFiles: config.maxFiles }));
  apolloServer.applyMiddleware({ app: app as any, path: "/graphql", cors: false });

  logger.info(`Servidor iniciando`, {
    host: config.host,
    port: config.port,
    mode: configService.getDatabaseMode()
  });

  httpServer.listen(config.port, config.host, () => {
    logger.info(`GraphQL disponible`, {
      url: `http://${config.host}:${config.port}${apolloServer.graphqlPath}`
    });
    if (process.env['NODE_ENV'] !== 'production') {
      logger.info(`GraphQL Playground disponible`, {
        url: `http://localhost:${config.port}${apolloServer.graphqlPath}`
      });
    }
  });
};

